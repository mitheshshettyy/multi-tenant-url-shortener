# Analytics Flow

## Capture

Every redirect produces a click event: `urlId`, `tenantId`, a timestamp,
and whatever request metadata is worth retaining — currently referrer and
user-agent, truncated to a sane length each. Capture happens after the
redirect response has already been sent to the visitor — see
[Redirect Flow](./redirect-flow.md) for why the click write is never on
the critical path of the redirect itself. This part is implemented; the
query/aggregation side described below is not yet.

## Storage

Click events are written to PostgreSQL. Unlike other tenant-owned data,
the write itself doesn't go through the automatic tenant-scoping
extension (`TenantPrismaService`) — there's no tenant context on the
redirect path to scope by (see
[Tenant Isolation](./tenant-isolation.md#the-legitimate-exceptions-login-and-the-redirect-flow)).
`tenantId` is instead stamped directly from the resolved URL row, which
is itself the source of truth for which tenant a click belongs to. No
separate analytics datastore is introduced at this stage — click volume
for a portfolio-scale multi-tenant shortener doesn't justify the
operational cost of a second system (a time-series database, an event
stream) until volume or query patterns demand it. That trade-off is
revisited in [Future Improvements](../future-improvements.md).

## Query path

Tenant admins view analytics through the authenticated dashboard path,
which reads aggregated click data directly from Postgres, scoped to their
own tenant. This is a straightforward read path — no cache layer sits in
front of analytics queries, because analytics is not latency-sensitive in
the way redirects are, and premature caching here would only introduce a
staleness problem for no real benefit at current scale.

## Isolation

Click data inherits the same isolation guarantee as every other table:
tenant A's admin can query only tenant A's click data, enforced by the
same `tenantId`-scoped query pattern used everywhere else, not by a
separate analytics-specific access rule.
