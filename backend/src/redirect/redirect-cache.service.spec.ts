import { RedirectCacheService } from './redirect-cache.service';
import type { RedisService } from '../cache/redis.service';

describe('RedirectCacheService', () => {
  let redisClient: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let redisService: jest.Mocked<RedisService>;
  let service: RedirectCacheService;

  const cachedValue = { id: 'url-1', tenantId: 'tenant-1', originalUrl: 'https://example.com' };

  beforeEach(() => {
    redisClient = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    redisService = { getClient: () => redisClient } as unknown as jest.Mocked<RedisService>;
    service = new RedirectCacheService(redisService);
  });

  describe('get', () => {
    it('returns the parsed value on a hit', async () => {
      redisClient.get.mockResolvedValue(JSON.stringify(cachedValue));
      await expect(service.get('abc1234')).resolves.toEqual(cachedValue);
      expect(redisClient.get).toHaveBeenCalledWith('redirect:abc1234');
    });

    it('returns null on a miss', async () => {
      redisClient.get.mockResolvedValue(null);
      await expect(service.get('missing')).resolves.toBeNull();
    });

    it('degrades to a miss (not a throw) when Redis errors', async () => {
      redisClient.get.mockRejectedValue(new Error('connection reset'));
      await expect(service.get('abc1234')).resolves.toBeNull();
    });
  });

  describe('set', () => {
    it('caches with the default TTL when the link has no expiry', async () => {
      await service.set('abc1234', cachedValue, null);
      expect(redisClient.set).toHaveBeenCalledWith(
        'redirect:abc1234',
        JSON.stringify(cachedValue),
        'EX',
        24 * 60 * 60,
      );
    });

    it('bounds the TTL to the remaining time when expiresAt is sooner than the default', async () => {
      const soon = new Date(Date.now() + 60_000); // 60 seconds from now
      await service.set('abc1234', cachedValue, soon);

      const [, , , ttl] = redisClient.set.mock.calls[0] as [string, string, string, number];
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('does not cache an already-expired link', async () => {
      const past = new Date(Date.now() - 1000);
      await service.set('abc1234', cachedValue, past);
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('does not throw when Redis errors — a failed cache write is not a request failure', async () => {
      redisClient.set.mockRejectedValue(new Error('connection reset'));
      await expect(service.set('abc1234', cachedValue, null)).resolves.toBeUndefined();
    });
  });

  describe('invalidate', () => {
    it('deletes the key', async () => {
      await service.invalidate('abc1234');
      expect(redisClient.del).toHaveBeenCalledWith('redirect:abc1234');
    });

    it('does not throw when Redis errors', async () => {
      redisClient.del.mockRejectedValue(new Error('connection reset'));
      await expect(service.invalidate('abc1234')).resolves.toBeUndefined();
    });
  });
});
