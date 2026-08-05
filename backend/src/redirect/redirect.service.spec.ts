import { RedirectService } from './redirect.service';
import {
  UrlDisabledException,
  UrlExpiredException,
  UrlNotFoundException,
} from './exceptions/redirect.exception';
import type { PrismaService } from '../database/prisma.service';
import type { RedirectCacheService } from './redirect-cache.service';
import type { Request } from 'express';
import type { Url } from '@prisma/client';

describe('RedirectService', () => {
  let service: RedirectService;
  let prisma: { url: { findFirst: jest.Mock }; click: { create: jest.Mock } };
  let cache: { get: jest.Mock; set: jest.Mock };

  const activeUrl: Url = {
    id: 'url-1',
    tenantId: 'tenant-1',
    createdById: 'user-1',
    shortCode: 'abc1234',
    originalUrl: 'https://example.com',
    title: null,
    isActive: true,
    expiresAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = { url: { findFirst: jest.fn() }, click: { create: jest.fn() } };
    cache = { get: jest.fn(), set: jest.fn() };
    service = new RedirectService(
      prisma as unknown as PrismaService,
      cache as unknown as RedirectCacheService,
    );
  });

  describe('resolve', () => {
    it('returns the cached value without touching Postgres on a cache hit', async () => {
      const cached = {
        id: 'url-1',
        tenantId: 'tenant-1',
        originalUrl: 'https://cached.example.com',
      };
      cache.get.mockResolvedValue(cached);

      const result = await service.resolve('abc1234');

      expect(result).toEqual(cached);
      expect(prisma.url.findFirst).not.toHaveBeenCalled();
    });

    it('looks up Postgres on a cache miss and populates the cache', async () => {
      cache.get.mockResolvedValue(null);
      prisma.url.findFirst.mockResolvedValue(activeUrl);

      const result = await service.resolve('abc1234');

      expect(result).toEqual({
        id: 'url-1',
        tenantId: 'tenant-1',
        originalUrl: 'https://example.com',
      });
      expect(prisma.url.findFirst).toHaveBeenCalledWith({
        where: { shortCode: 'abc1234', deletedAt: null },
      });
      expect(cache.set).toHaveBeenCalledWith('abc1234', result, null);
    });

    it('throws UrlNotFoundException when the code does not exist', async () => {
      cache.get.mockResolvedValue(null);
      prisma.url.findFirst.mockResolvedValue(null);

      await expect(service.resolve('missing')).rejects.toThrow(UrlNotFoundException);
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('throws UrlDisabledException (not UrlExpiredException) for a disabled link and does not cache it', async () => {
      cache.get.mockResolvedValue(null);
      prisma.url.findFirst.mockResolvedValue({ ...activeUrl, isActive: false });

      await expect(service.resolve('abc1234')).rejects.toThrow(UrlDisabledException);
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('throws UrlExpiredException for a link past its expiresAt and does not cache it', async () => {
      cache.get.mockResolvedValue(null);
      prisma.url.findFirst.mockResolvedValue({
        ...activeUrl,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.resolve('abc1234')).rejects.toThrow(UrlExpiredException);
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('a disabled check takes priority over an expired one when both are true', async () => {
      cache.get.mockResolvedValue(null);
      prisma.url.findFirst.mockResolvedValue({
        ...activeUrl,
        isActive: false,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.resolve('abc1234')).rejects.toThrow(UrlDisabledException);
    });
  });

  describe('recordClick', () => {
    const resolved = { id: 'url-1', tenantId: 'tenant-1', originalUrl: 'https://example.com' };

    it('records a click with referrer and user-agent from the request', async () => {
      prisma.click.create.mockResolvedValue({});
      const request = {
        headers: { referer: 'https://twitter.com', 'user-agent': 'TestAgent/1.0' },
      } as unknown as Request;

      await service.recordClick(resolved, request);

      expect(prisma.click.create).toHaveBeenCalledWith({
        data: {
          urlId: 'url-1',
          tenantId: 'tenant-1',
          referrer: 'https://twitter.com',
          userAgent: 'TestAgent/1.0',
        },
      });
    });

    it('never throws, even when the database write fails', async () => {
      prisma.click.create.mockRejectedValue(new Error('connection reset'));
      const request = { headers: {} } as unknown as Request;

      await expect(service.recordClick(resolved, request)).resolves.toBeUndefined();
    });
  });
});
