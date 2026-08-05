import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UrlService } from './url.service';
import { ShortCodeAlreadyExistsException, UrlNotFoundException } from './exceptions/url.exception';
import type { TenantPrismaService } from '../tenant/tenant-prisma.service';
import type { RedirectCacheService } from '../redirect/redirect-cache.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { Url } from '@prisma/client';

describe('UrlService', () => {
  let service: UrlService;
  let urlDelegate: {
    create: jest.Mock<Promise<Url>, [Record<string, unknown>]>;
    findMany: jest.Mock<Promise<Url[]>, [Record<string, unknown>]>;
    count: jest.Mock<Promise<number>, [Record<string, unknown>]>;
    findUnique: jest.Mock<Promise<Url | null>, [Record<string, unknown>]>;
    update: jest.Mock<Promise<Url>, [Record<string, unknown>]>;
  };
  let tenantPrisma: jest.Mocked<TenantPrismaService>;
  let redirectCache: jest.Mocked<RedirectCacheService>;

  const owner: JwtPayload = {
    sub: 'owner-1',
    email: 'owner@example.com',
    tenantId: 'tenant-1',
    role: Role.MEMBER,
    jti: 'jti-1',
  };

  const otherMember: JwtPayload = {
    sub: 'member-2',
    email: 'member2@example.com',
    tenantId: 'tenant-1',
    role: Role.MEMBER,
    jti: 'jti-2',
  };

  const admin: JwtPayload = {
    sub: 'admin-1',
    email: 'admin@example.com',
    tenantId: 'tenant-1',
    role: Role.TENANT_ADMIN,
    jti: 'jti-3',
  };

  const url: Url = {
    id: 'url-1',
    tenantId: 'tenant-1',
    createdById: owner.sub,
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
    urlDelegate = {
      create: jest.fn<Promise<Url>, [Record<string, unknown>]>(),
      findMany: jest.fn<Promise<Url[]>, [Record<string, unknown>]>(),
      count: jest.fn<Promise<number>, [Record<string, unknown>]>(),
      findUnique: jest.fn<Promise<Url | null>, [Record<string, unknown>]>(),
      update: jest.fn<Promise<Url>, [Record<string, unknown>]>(),
    };
    tenantPrisma = { client: { url: urlDelegate } } as unknown as jest.Mocked<TenantPrismaService>;
    redirectCache = { invalidate: jest.fn() } as unknown as jest.Mocked<RedirectCacheService>;
    service = new UrlService(tenantPrisma, redirectCache);
  });

  describe('create', () => {
    it('creates with a custom code when provided', async () => {
      urlDelegate.create.mockResolvedValue(url);

      const result = await service.create(
        { originalUrl: 'https://example.com', customCode: 'abc1234' },
        owner,
      );

      expect(result).toBe(url);
      expect(urlDelegate.create).toHaveBeenCalledWith({
        data: {
          shortCode: 'abc1234',
          originalUrl: 'https://example.com',
          title: undefined,
          expiresAt: undefined,
          tenantId: owner.tenantId,
          createdById: owner.sub,
        },
      });
    });

    it('throws ShortCodeAlreadyExistsException when a custom code collides', async () => {
      urlDelegate.create.mockRejectedValue({ code: 'P2002', meta: { target: ['shortCode'] } });

      await expect(
        service.create({ originalUrl: 'https://example.com', customCode: 'taken' }, owner),
      ).rejects.toThrow(ShortCodeAlreadyExistsException);
    });

    it('auto-generates a code and retries once on a random collision', async () => {
      urlDelegate.create
        .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['shortCode'] } })
        .mockResolvedValueOnce(url);

      const result = await service.create({ originalUrl: 'https://example.com' }, owner);

      expect(result).toBe(url);
      expect(urlDelegate.create).toHaveBeenCalledTimes(2);
    });

    it('rejects a non-future expiresAt', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      await expect(
        service.create({ originalUrl: 'https://example.com', expiresAt: past }, owner),
      ).rejects.toThrow(BadRequestException);
      expect(urlDelegate.create).not.toHaveBeenCalled();
    });

    it('accepts a future expiresAt', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      urlDelegate.create.mockResolvedValue(url);

      await service.create({ originalUrl: 'https://example.com', expiresAt: future }, owner);

      const [callArgs] = urlDelegate.create.mock.calls[0];
      expect((callArgs.data as { expiresAt: Date }).expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    it('excludes soft-deleted rows and applies pagination', async () => {
      urlDelegate.findMany.mockResolvedValue([url]);
      urlDelegate.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(urlDelegate.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 10,
        take: 10,
      });
      expect(result).toEqual({
        data: [url],
        meta: { page: 2, limit: 10, total: 1, totalPages: 1 },
      });
    });

    it('builds an OR search clause across title, originalUrl, and shortCode when search is provided', async () => {
      urlDelegate.findMany.mockResolvedValue([]);
      urlDelegate.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, search: 'campaign' });

      expect(urlDelegate.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: 'campaign', mode: 'insensitive' } },
            { originalUrl: { contains: 'campaign', mode: 'insensitive' } },
            { shortCode: { contains: 'campaign', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('findOne', () => {
    it('returns the url when found', async () => {
      urlDelegate.findUnique.mockResolvedValue(url);
      await expect(service.findOne('url-1')).resolves.toBe(url);
    });

    it('throws UrlNotFoundException when not found (including soft-deleted)', async () => {
      urlDelegate.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(UrlNotFoundException);
    });
  });

  describe('update', () => {
    it('allows the owner to update their own url and invalidates the redirect cache', async () => {
      urlDelegate.findUnique.mockResolvedValue(url);
      urlDelegate.update.mockResolvedValue({ ...url, title: 'New title' });

      const result = await service.update('url-1', { title: 'New title' }, owner);

      expect(result.title).toBe('New title');
      expect(redirectCache.invalidate).toHaveBeenCalledWith('abc1234');
    });

    it('allows a TENANT_ADMIN to update a url they did not create', async () => {
      urlDelegate.findUnique.mockResolvedValue(url);
      urlDelegate.update.mockResolvedValue(url);

      await expect(service.update('url-1', { title: 'x' }, admin)).resolves.toBe(url);
    });

    it('rejects a different MEMBER who did not create the url, and does not touch the cache', async () => {
      urlDelegate.findUnique.mockResolvedValue(url);

      await expect(service.update('url-1', { title: 'x' }, otherMember)).rejects.toThrow(
        ForbiddenException,
      );
      expect(urlDelegate.update).not.toHaveBeenCalled();
      expect(redirectCache.invalidate).not.toHaveBeenCalled();
    });

    it('allows explicitly clearing expiresAt with null, distinct from omitting it', async () => {
      urlDelegate.findUnique.mockResolvedValue({ ...url, expiresAt: new Date() });
      urlDelegate.update.mockResolvedValue({ ...url, expiresAt: null });

      await service.update('url-1', { expiresAt: null }, owner);

      const [callArgs] = urlDelegate.update.mock.calls[0];
      expect((callArgs.data as { expiresAt: unknown }).expiresAt).toBeNull();
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting deletedAt, not a hard delete, and invalidates the redirect cache', async () => {
      urlDelegate.findUnique.mockResolvedValue(url);
      urlDelegate.update.mockResolvedValue({ ...url, deletedAt: new Date() });

      await service.remove('url-1', owner);

      expect(urlDelegate.update).toHaveBeenCalledTimes(1);
      const [callArgs] = urlDelegate.update.mock.calls[0];
      expect(callArgs.where).toEqual({ id: 'url-1' });
      expect((callArgs.data as { deletedAt: unknown }).deletedAt).toBeInstanceOf(Date);
      expect(redirectCache.invalidate).toHaveBeenCalledWith('abc1234');
    });

    it('rejects a different MEMBER who did not create the url, and does not touch the cache', async () => {
      urlDelegate.findUnique.mockResolvedValue(url);

      await expect(service.remove('url-1', otherMember)).rejects.toThrow(ForbiddenException);
      expect(urlDelegate.update).not.toHaveBeenCalled();
      expect(redirectCache.invalidate).not.toHaveBeenCalled();
    });
  });
});
