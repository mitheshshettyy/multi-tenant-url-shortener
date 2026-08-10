import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { Permission } from '../authorization/permission.enum';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @RequirePermissions(Permission.ANALYTICS_READ)
  getOverview(@Query('urlId') urlId?: string) {
    return this.analyticsService.getOverview(urlId);
  }

  @Get('clicks')
  @RequirePermissions(Permission.ANALYTICS_READ)
  getClicksOverTime(
    @Query('urlId') urlId?: string,
    @Query('days') days?: number,
  ) {
    const parsedDays = days ? Number(days) : undefined;
    return this.analyticsService.getClicksOverTime(urlId, parsedDays);
  }

  @Get('referrers')
  @RequirePermissions(Permission.ANALYTICS_READ)
  getReferrers(
    @Query('urlId') urlId?: string,
    @Query('limit') limit?: number,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.analyticsService.getReferrers(urlId, parsedLimit);
  }

  @Get('user-agents')
  @RequirePermissions(Permission.ANALYTICS_READ)
  getUserAgents(
    @Query('urlId') urlId?: string,
    @Query('limit') limit?: number,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.analyticsService.getUserAgents(urlId, parsedLimit);
  }
}
