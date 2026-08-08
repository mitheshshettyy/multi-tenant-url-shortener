import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

function parseBrowser(ua: string): string {
  if (!ua) return 'Unknown';
  const uaLower = ua.toLowerCase();
  if (uaLower.includes('firefox')) return 'Firefox';
  if (uaLower.includes('chrome') && !uaLower.includes('chromium')) return 'Chrome';
  if (uaLower.includes('safari') && !uaLower.includes('chrome')) return 'Safari';
  if (uaLower.includes('edge') || uaLower.includes('edg')) return 'Edge';
  if (uaLower.includes('opera') || uaLower.includes('opr')) return 'Opera';
  return 'Other / Bot';
}

function parseOS(ua: string): string {
  if (!ua) return 'Unknown';
  const uaLower = ua.toLowerCase();
  if (uaLower.includes('windows')) return 'Windows';
  if (uaLower.includes('macintosh') || uaLower.includes('mac os')) return 'macOS';
  if (uaLower.includes('linux')) return 'Linux';
  if (uaLower.includes('android')) return 'Android';
  if (uaLower.includes('iphone') || uaLower.includes('ipad')) return 'iOS';
  return 'Other';
}

@Injectable()
export class AdminAnalyticsService {
  constructor(
    /** Raw PrismaService — NOT TenantPrismaService.
     *  Platform-wide queries must never be tenant-scoped. */
    private readonly prisma: PrismaService,
  ) {}

  async getOverview() {
    const [totalClicks, totalUrls, activeUrls] = await Promise.all([
      this.prisma.click.count(),
      this.prisma.url.count({ where: { deletedAt: null } }),
      this.prisma.url.count({ where: { isActive: true, deletedAt: null } }),
    ]);

    return { totalClicks, totalUrls, activeUrls };
  }

  async getClicksOverTime(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const clicks = await this.prisma.click.findMany({
      where: { clickedAt: { gte: startDate } },
      select: { clickedAt: true },
      orderBy: { clickedAt: 'asc' },
    });

    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyCounts[d.toISOString().split('T')[0]] = 0;
    }

    clicks.forEach((c) => {
      const key = c.clickedAt.toISOString().split('T')[0];
      if (dailyCounts[key] !== undefined) dailyCounts[key]++;
    });

    return Object.keys(dailyCounts)
      .sort()
      .map((date) => ({ date, clicks: dailyCounts[date] }));
  }

  async getReferrers(limit = 10) {
    const clicks = await this.prisma.click.findMany({
      select: { referrer: true },
    });

    const counts: Record<string, number> = {};
    clicks.forEach((c) => {
      const ref = c.referrer || 'Direct / None';
      counts[ref] = (counts[ref] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getUserAgents(limit = 10) {
    const clicks = await this.prisma.click.findMany({
      select: { userAgent: true },
    });

    const browserCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};

    clicks.forEach((c) => {
      const ua = c.userAgent || '';
      const browser = parseBrowser(ua);
      const os = parseOS(ua);
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      osCounts[os] = (osCounts[os] || 0) + 1;
    });

    return {
      browsers: Object.entries(browserCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit),
      os: Object.entries(osCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit),
    };
  }

  async getTopLinks(limit = 10) {
    const urls = await this.prisma.url.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        shortCode: true,
        originalUrl: true,
        title: true,
        isActive: true,
        tenant: { select: { name: true, slug: true } },
        _count: { select: { clicks: true } },
      },
      orderBy: { clicks: { _count: 'desc' } },
      take: limit,
    });

    return urls.map((u) => ({
      id: u.id,
      shortCode: u.shortCode,
      originalUrl: u.originalUrl,
      title: u.title,
      isActive: u.isActive,
      tenant: u.tenant,
      clickCount: u._count.clicks,
    }));
  }

  async getTenantActivity(limit = 10) {
    const tenants = await this.prisma.tenant.findMany({
      where: { slug: { not: '__platform__' } },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { urls: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await Promise.all(
      tenants.map(async (t) => {
        const clicks = await this.prisma.click.count({ where: { tenantId: t.id } });
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          linkCount: t._count.urls,
          clickCount: clicks,
        };
      }),
    );

    return enriched.sort((a, b) => b.clickCount - a.clickCount).slice(0, limit);
  }

  async getTenantAnalytics(tenantId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [overview, clicksRaw, referrersRaw, uaRaw] = await Promise.all([
      this.prisma.click.count({ where: { tenantId } }),
      this.prisma.click.findMany({
        where: { tenantId, clickedAt: { gte: startDate } },
        select: { clickedAt: true },
      }),
      this.prisma.click.findMany({
        where: { tenantId },
        select: { referrer: true },
      }),
      this.prisma.click.findMany({
        where: { tenantId },
        select: { userAgent: true },
      }),
    ]);

    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyCounts[d.toISOString().split('T')[0]] = 0;
    }
    clicksRaw.forEach((c) => {
      const key = c.clickedAt.toISOString().split('T')[0];
      if (dailyCounts[key] !== undefined) dailyCounts[key]++;
    });
    const clicksOverTime = Object.keys(dailyCounts)
      .sort()
      .map((date) => ({ date, clicks: dailyCounts[date] }));

    const refCounts: Record<string, number> = {};
    referrersRaw.forEach((c) => {
      const ref = c.referrer || 'Direct / None';
      refCounts[ref] = (refCounts[ref] || 0) + 1;
    });
    const referrers = Object.entries(refCounts)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const bCounts: Record<string, number> = {};
    const oCounts: Record<string, number> = {};
    uaRaw.forEach((c) => {
      const ua = c.userAgent || '';
      const b = parseBrowser(ua);
      const o = parseOS(ua);
      bCounts[b] = (bCounts[b] || 0) + 1;
      oCounts[o] = (oCounts[o] || 0) + 1;
    });

    return {
      totalClicks: overview,
      clicksOverTime,
      referrers,
      browsers: Object.entries(bCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      os: Object.entries(oCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }
}
