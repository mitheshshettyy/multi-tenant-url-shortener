import { AnalyticsService } from './analytics.service';
import type { TenantPrismaService } from '../tenant/tenant-prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let clickDelegate: {
    count: jest.MockedFunction<() => Promise<number>>;
    findMany: jest.MockedFunction<() => Promise<{ clickedAt?: Date; referrer?: string | null; userAgent?: string | null }[]>>;
  };
  let urlDelegate: {
    count: jest.MockedFunction<() => Promise<number>>;
  };
  let tenantPrisma: jest.Mocked<TenantPrismaService>;

  beforeEach(() => {
    clickDelegate = {
      count: jest.fn() as jest.MockedFunction<() => Promise<number>>,
      findMany: jest.fn() as jest.MockedFunction<() => Promise<{ clickedAt?: Date; referrer?: string | null; userAgent?: string | null }[]>>,
    };
    urlDelegate = {
      count: jest.fn() as jest.MockedFunction<() => Promise<number>>,
    };
    tenantPrisma = {
      client: {
        click: clickDelegate,
        url: urlDelegate,
      },
    } as unknown as jest.Mocked<TenantPrismaService>;
    service = new AnalyticsService(tenantPrisma);
  });

  describe('getOverview', () => {
    it('returns overview for the whole tenant', async () => {
      clickDelegate.count.mockResolvedValue(15);
      urlDelegate.count
        .mockResolvedValueOnce(5) // first call: total urls
        .mockResolvedValueOnce(3); // second call: active urls

      const result = await service.getOverview();

      expect(result).toEqual({
        totalClicks: 15,
        totalUrls: 5,
        activeUrls: 3,
      });
      expect(clickDelegate.count).toHaveBeenCalledWith({ where: {} });
    });

    it('returns overview for a specific url', async () => {
      clickDelegate.count.mockResolvedValue(10);
      urlDelegate.count.mockResolvedValue(1); // active check

      const result = await service.getOverview('url-1');

      expect(result).toEqual({
        totalClicks: 10,
        totalUrls: 1,
        activeUrls: 1,
      });
      expect(clickDelegate.count).toHaveBeenCalledWith({ where: { urlId: 'url-1' } });
    });
  });

  describe('getClicksOverTime', () => {
    it('groups clicks by day correctly', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      clickDelegate.findMany.mockResolvedValue([
        { clickedAt: today },
        { clickedAt: today },
        { clickedAt: yesterday },
      ]);

      const result = await service.getClicksOverTime(undefined, 7);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const todayEntry = result.find((r) => r.date === todayStr);
      const yesterdayEntry = result.find((r) => r.date === yesterdayStr);

      expect(todayEntry?.clicks).toBe(2);
      expect(yesterdayEntry?.clicks).toBe(1);
    });
  });

  describe('getReferrers', () => {
    it('returns top referrers sorted', async () => {
      clickDelegate.findMany.mockResolvedValue([
        { referrer: 'google.com' },
        { referrer: 'google.com' },
        { referrer: 'github.com' },
        { referrer: null },
      ]);

      const result = await service.getReferrers();

      expect(result).toEqual([
        { referrer: 'google.com', count: 2 },
        { referrer: 'github.com', count: 1 },
        { referrer: 'Direct / None', count: 1 },
      ]);
    });
  });

  describe('getUserAgents', () => {
    it('parses OS and browsers correctly', async () => {
      clickDelegate.findMany.mockResolvedValue([
        { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' },
        { userAgent: null },
      ]);

      const result = await service.getUserAgents();

      expect(result.browsers).toContainEqual({ name: 'Chrome', count: 1 });
      expect(result.browsers).toContainEqual({ name: 'Safari', count: 1 });
      expect(result.os).toContainEqual({ name: 'Windows', count: 1 });
      expect(result.os).toContainEqual({ name: 'macOS', count: 1 });
    });
  });
});
