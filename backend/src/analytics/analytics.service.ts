import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async getOverview(urlId?: string) {
    const where: Record<string, any> = {};
    if (urlId) {
      where.urlId = urlId;
    }

    const [totalClicks, totalUrls, activeUrls] = await Promise.all([
      this.tenantPrisma.client.click.count({ where }),
      urlId ? Promise.resolve(1) : this.tenantPrisma.client.url.count({ where: { deletedAt: null } }),
      urlId
        ? this.tenantPrisma.client.url.count({ where: { id: urlId, isActive: true, deletedAt: null } })
        : this.tenantPrisma.client.url.count({ where: { isActive: true, deletedAt: null } }),
    ]);

    return {
      totalClicks,
      totalUrls,
      activeUrls,
    };
  }

  async getClicksOverTime(urlId?: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: Record<string, any> = {
      clickedAt: {
        gte: startDate,
      },
    };
    if (urlId) {
      where.urlId = urlId;
    }

    const clicks = await this.tenantPrisma.client.click.findMany({
      where,
      select: {
        clickedAt: true,
      },
      orderBy: {
        clickedAt: 'asc',
      },
    });

    // Group clicks by YYYY-MM-DD
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyCounts[dateStr] = 0;
    }

    clicks.forEach((click) => {
      const dateStr = click.clickedAt.toISOString().split('T')[0];
      if (dailyCounts[dateStr] !== undefined) {
        dailyCounts[dateStr]++;
      }
    });

    return Object.keys(dailyCounts)
      .sort()
      .map((date) => ({
        date,
        clicks: dailyCounts[date],
      }));
  }

  async getReferrers(urlId?: string, limit = 10) {
    const where: Record<string, any> = {};
    if (urlId) {
      where.urlId = urlId;
    }

    const clicks = await this.tenantPrisma.client.click.findMany({
      where,
      select: {
        referrer: true,
      },
    });

    const referrerCounts: Record<string, number> = {};
    clicks.forEach((click) => {
      const ref = click.referrer || 'Direct / None';
      referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
    });

    return Object.keys(referrerCounts)
      .map((referrer) => ({
        referrer,
        count: referrerCounts[referrer],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getUserAgents(urlId?: string, limit = 10) {
    const where: Record<string, any> = {};
    if (urlId) {
      where.urlId = urlId;
    }

    const clicks = await this.tenantPrisma.client.click.findMany({
      where,
      select: {
        userAgent: true,
      },
    });

    const browserCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};

    clicks.forEach((click) => {
      const ua = click.userAgent || '';
      const browser = parseBrowser(ua);
      const os = parseOS(ua);

      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      osCounts[os] = (osCounts[os] || 0) + 1;
    });

    const browsers = Object.keys(browserCounts)
      .map((name) => ({ name, count: browserCounts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    const os = Object.keys(osCounts)
      .map((name) => ({ name, count: osCounts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return { browsers, os };
  }
}

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
