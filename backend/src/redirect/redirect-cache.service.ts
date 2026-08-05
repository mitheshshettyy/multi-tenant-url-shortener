import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../cache/redis.service';

export interface CachedRedirect {
  id: string;
  tenantId: string;
  originalUrl: string;
}

const CACHE_KEY_PREFIX = 'redirect:';
// Cache is an optimization, never the source of truth (see
// docs/architecture/caching-strategy.md) — 24h keeps popular, long-lived
// links off Postgres almost entirely without caching anything indefinitely.
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class RedirectCacheService {
  private readonly logger = new Logger(RedirectCacheService.name);

  constructor(private readonly redis: RedisService) {}

  async get(shortCode: string): Promise<CachedRedirect | null> {
    try {
      const raw = await this.redis.getClient().get(this.key(shortCode));
      return raw ? (JSON.parse(raw) as CachedRedirect) : null;
    } catch (error) {
      this.logger.warn(
        `Cache read failed for "${shortCode}", falling back to database: ${describe(error)}`,
      );
      return null;
    }
  }

  /**
   * TTL is bounded by the link's own expiresAt when it has one, so Redis
   * naturally evicts the cache entry at (or before) the moment the link
   * expires — a request after that eviction falls through to Postgres,
   * which enforces the real expiry and returns 410. This means expiry
   * doesn't need to be re-checked on every cache hit; only invalidation
   * for isActive/originalUrl changes needs to be explicit (see invalidate()).
   */
  async set(shortCode: string, value: CachedRedirect, expiresAt: Date | null): Promise<void> {
    const ttlSeconds = expiresAt
      ? Math.min(DEFAULT_TTL_SECONDS, secondsUntil(expiresAt))
      : DEFAULT_TTL_SECONDS;

    if (ttlSeconds <= 0) {
      return;
    }

    try {
      await this.redis
        .getClient()
        .set(this.key(shortCode), JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Cache write failed for "${shortCode}": ${describe(error)}`);
    }
  }

  /** Called by UrlService after any update/delete that could make a cached entry stale — originalUrl changing, isActive toggling off, or a soft delete. */
  async invalidate(shortCode: string): Promise<void> {
    try {
      await this.redis.getClient().del(this.key(shortCode));
    } catch (error) {
      this.logger.warn(`Cache invalidation failed for "${shortCode}": ${describe(error)}`);
    }
  }

  private key(shortCode: string): string {
    return `${CACHE_KEY_PREFIX}${shortCode}`;
  }
}

function secondsUntil(date: Date): number {
  return Math.floor((date.getTime() - Date.now()) / 1000);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
