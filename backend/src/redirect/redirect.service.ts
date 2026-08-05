import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service';
import { RedirectCacheService } from './redirect-cache.service';
import {
  UrlDisabledException,
  UrlExpiredException,
  UrlNotFoundException,
} from './exceptions/redirect.exception';
import type { CachedRedirect } from './redirect-cache.service';

const MAX_REFERRER_LENGTH = 500;
const MAX_USER_AGENT_LENGTH = 500;

@Injectable()
export class RedirectService {
  private readonly logger = new Logger(RedirectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedirectCacheService,
  ) {}

  /**
   * Deliberately uses the raw PrismaService, not TenantPrismaService: this
   * runs on the public, unauthenticated redirect path, where there is no
   * caller identity and therefore no tenant context to scope by (the
   * TenantContextInterceptor skips @Public() routes entirely — see
   * docs/architecture/tenant-isolation.md for the same reasoning applied
   * to login). The tenant a link belongs to is resolved from the link
   * itself, not the caller — exactly the "no tenant guard chain" design
   * already documented in redirect-flow.md.
   */
  async resolve(shortCode: string): Promise<CachedRedirect> {
    const cached = await this.cache.get(shortCode);
    if (cached) {
      return cached;
    }

    const url = await this.prisma.url.findFirst({ where: { shortCode, deletedAt: null } });

    if (!url) {
      throw new UrlNotFoundException();
    }

    if (!url.isActive) {
      // 404, not 403 — a visitor shouldn't be able to distinguish "this
      // code was never valid" from "this code exists but is disabled".
      throw new UrlDisabledException();
    }

    if (url.expiresAt && url.expiresAt <= new Date()) {
      throw new UrlExpiredException();
    }

    const value: CachedRedirect = {
      id: url.id,
      tenantId: url.tenantId,
      originalUrl: url.originalUrl,
    };
    await this.cache.set(shortCode, value, url.expiresAt);

    return value;
  }

  /**
   * Fire-and-forget by contract: callers must not await this on the
   * response path (see RedirectController). Failures are logged, never
   * thrown — a click-logging outage must never turn into a broken redirect.
   */
  async recordClick(url: CachedRedirect, request: Request): Promise<void> {
    try {
      await this.prisma.click.create({
        data: {
          urlId: url.id,
          tenantId: url.tenantId,
          referrer: truncate(request.headers.referer, MAX_REFERRER_LENGTH),
          userAgent: truncate(request.headers['user-agent'], MAX_USER_AGENT_LENGTH),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record click for url ${url.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function truncate(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
