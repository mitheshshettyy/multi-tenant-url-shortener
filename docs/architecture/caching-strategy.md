# Caching Strategy

Redis serves three distinct purposes in this system. They're described
separately because they have different consistency requirements and
different failure tolerances.

## URL redirect cache

**Pattern:** cache-aside, keyed by short code (`redirect:<shortCode>` in
Redis; see `RedirectCacheService`). The cached value is the small JSON
`{ id, tenantId, originalUrl }` — enough for both the redirect itself and
the async click log, without a second Postgres round-trip for click
metadata on a cache hit.

**Read path:** check Redis; on miss, read Postgres, validate `isActive`
and `expiresAt`, and populate Redis; on hit, skip Postgres entirely —
including skipping the `isActive`/`expiresAt` checks, since invalidation
(below) already guarantees a present cache entry is still valid.

**TTL:** capped at 24 hours by default, but bounded to the link's own
`expiresAt` when it has one (`min(24h, secondsUntilExpiry)`). This makes
Redis itself enforce expiry for the cache layer — no cached entry can
outlive the link's real expiration, without the read path needing to
re-check it.

**Invalidation:** `UrlService.update()` and `UrlService.remove()` both
call `RedirectCacheService.invalidate()` unconditionally on any
successful write, rather than tracking exactly which fields changed —
simpler and safer than trying to determine invalidation-worthiness per
field, and this isn't a hot path. This is the one place in the caching
design where correctness matters more than latency — a stale redirect is
a visible product bug, not a minor inconsistency.

**Failure tolerance:** every Redis call in `RedirectCacheService` is
wrapped in its own try/catch — a failed read degrades to a cache miss (falls
through to Postgres), a failed write or invalidation is logged and
otherwise ignored. If Redis is unavailable, the redirect path falls back
to Postgres directly. Slower, but correct. The cache is an optimization,
never a dependency the redirect path requires to function.

## Rate limiting

**Pattern:** fixed or sliding window counters, keyed by client identifier
(IP for the public redirect path, tenant/user for authenticated routes).

**Why Redis and not in-memory counters:** the backend is expected to run
as more than one instance behind a load balancer. In-memory counters would
let a client bypass limits simply by landing on a different instance.
Redis gives every instance a shared view of request counts.

**Failure tolerance:** rate limiting is a protection mechanism, not a
correctness requirement. If Redis is briefly unavailable, the system
should fail open (allow requests) rather than fail closed (reject
everything) — an outage in the cache layer should degrade protection, not
take down the product.

## Session / token cache

Used for token blacklisting and session-adjacent lookups where checking
Postgres on every authenticated request would be wasteful. Same failure
posture as the redirect cache: Redis is an accelerant on top of a system
that remains correct without it.

## What Redis is never used for

Redis never holds data that only exists in Redis. Every key is either
derived from Postgres (redirect cache, session cache) or is inherently
ephemeral by design (rate-limit counters). This is what makes Redis safe
to flush, restart, or lose without a data-recovery story.
