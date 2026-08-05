# Redirect Flow

The redirect path is the highest-traffic, most latency-sensitive route in
the system, and the only public (unauthenticated) one. It is deliberately
kept separate from the authenticated guard chain described in
[Request Lifecycle](./request-lifecycle.md) — and, as it turned out during
implementation, separate from Nest's controller system entirely. See
"Why this isn't a Nest controller" below.

## Flow

```
Visitor → GET /:shortCode
        → Redis lookup (cache-aside)
            hit  → 302 redirect, click recorded (async)
            miss → PostgreSQL lookup
                   → not found / disabled → 404
                   → expired            → 410
                   → valid              → populate Redis, 302 redirect, click recorded (async)
```

## Why this isn't a Nest controller

`GET /:shortCode` is handled by a plain Express `RequestHandler`
(`redirect.handler.ts`), registered directly on the underlying Express
instance in `main.ts` — not a `@Controller()`. This wasn't the original
design; it's the result of a real bug caught by testing, not inspection.

The first implementation used a normal Nest controller, excluded from
`setGlobalPrefix` via its `exclude` option (the same mechanism `/health`
already used successfully). It compiled, it passed every unit test, and
manually curling `GET /:someCode` worked. Then a full regression pass
turned up `GET /api/v1/urls` returning 404. The cause: `setGlobalPrefix`'s
`exclude` matches routes by *shape*, not by which controller declared
them. `:shortCode` and `urls` (`UrlController`'s list route, no `:id`)
are both single, bare path segments — structurally identical patterns as
far as the exclude matcher is concerned — so excluding one silently
excluded the other too, stripping `/urls`'s prefix along with it. Every
other route in the app was safe purely by accident of shape; any future
single-segment route would have hit the same bug.

Once that ruled out `exclude`, the next attempt — mounting the handler
directly on the HTTP adapter *after* `app.init()` — failed differently:
Nest's own router, once attached, terminally handles any request nothing
else has claimed (its own 404) and does not fall through to handlers
added afterward. `/willexpire` came back as Express's generic
"Cannot GET" 404, never reaching the handler at all.

The version that actually works registers the handler on a raw Express
instance *before* passing it to `NestFactory.create()` (via
`ExpressAdapter`). Express tries routes in registration order, so this
runs first for anything matching `/:segment` — including `/health`,
which creates the mirror-image collision. The handler defends against
that explicitly: a small reserved-path list (currently just `'health'`,
kept in sync with `setGlobalPrefix`'s own exclude list by a comment
cross-referencing the two) causes it to call `next()` and defer to Nest's
router instead of treating the segment as a short code.

`RedirectService` itself needs Nest's DI container, which isn't ready
until `app.init()` completes — after the route is already registered.
The handler takes a `() => RedirectService` getter rather than the
service instance directly, resolved once `app.init()` finishes; hitting
the route before that (which shouldn't happen in practice, since nothing
handles traffic before `app.listen()`) throws a clear error rather than
crashing on `undefined`.

Because this route bypasses Nest's pipeline, it doesn't get
`AllExceptionsFilter` for free. Error responses are shaped by
`resolveException` — the same function the filter itself calls,
extracted specifically so this handler and the filter can't drift into
different error formats for the same exception types.

## Why no authentication on this path

The visitor clicking a short link is not a system user — they have no
account, no token, and no relationship with the tenant beyond having
received the link. Requiring authentication here would defeat the purpose
of a shortener. The tenant a link belongs to is resolved from the link
record itself (`RedirectService` uses the raw `PrismaService`, not
`TenantPrismaService` — see [Tenant Isolation](./tenant-isolation.md) for
the same pattern already established for login), not from caller
identity, so authentication has nothing to check.

## Why Redis-first instead of Postgres-first

Redirects are read-heavy and latency-sensitive: a visitor waiting on a
redirect notices delay far more than a dashboard user waiting on an
analytics query. Cache-aside (check Redis, fall back to Postgres on miss,
populate Redis after) keeps the common case — a link that's been clicked
before — off the primary database entirely. Postgres is only touched on
first click after creation, after a cache eviction, or after an
explicit invalidation.

**The cache entry's own TTL is bounded by the link's `expiresAt`** when it
has one (`min(24h default, secondsUntilExpiry)`). This means Redis
naturally evicts an expiring link's cache entry at the moment it expires
— a request just after that eviction falls through to Postgres, which
enforces the real expiry and returns 410, without the cache needing any
expiry-awareness of its own on read. Verified directly: a link created
with a 3-second expiry showed a matching Redis TTL, redirected
successfully before expiry, and returned 410 immediately after.

**A cache hit is trusted without re-checking `isActive`/`expiresAt`.**
This is deliberate, not an oversight: since every write that could make a
cached entry stale (`originalUrl` changing, `isActive` toggling off, a
soft delete) explicitly invalidates the cache entry — see
[Caching Strategy](./caching-strategy.md#url-redirect-cache) — a cache hit
existing at all is the guarantee that it's still valid. Re-checking on
every hit would mean paying a Postgres round-trip on the hot path for a
property the invalidation logic already guarantees.

**Disabled takes priority over expired when both are true.** A link that
is both past its `expiresAt` and manually disabled reports 404
(disabled), not 410 (expired) — disabled is checked first. This isn't
significant in practice (both states block the redirect) but the order
is deterministic and tested.

## Click recording is not on the critical path

Recording a click happens after the redirect response is issued (`302`
sent before the click insert is even awaited), not before it — a
visitor's redirect must never wait on an analytics write. The click write
is wrapped in its own try/catch inside `RedirectService.recordClick`, so
a database hiccup during logging can never surface as an unhandled
rejection or a broken redirect; it's logged and dropped. `tenantId` on
the click record comes from the resolved URL, not from any caller
identity (there isn't one) — this is what "tenant-aware" means for a
route with no authenticated tenant context at all. Verified directly:
click rows appear in Postgres with the correct `tenantId` after
unauthenticated redirect requests, referrer and user-agent captured from
request headers.

Click *querying* (dashboards, aggregation) is out of scope for this
milestone — see [Analytics Flow](./analytics-flow.md).
