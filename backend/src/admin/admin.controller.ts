import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../authorization/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { AdminAnalyticsService } from './admin-analytics.service';

/**
 * All routes under /admin are exclusively for SUPER_ADMIN users.
 * The @Roles(Role.SUPER_ADMIN) decorator on the controller class applies to
 * every method — the AuthorizationGuard enforces this at the API layer,
 * independent of any frontend route guard.
 *
 * These handlers use AdminService and AdminAnalyticsService, which inject
 * raw PrismaService (never TenantPrismaService). Queries are cross-tenant
 * by design.
 */
@Controller('admin')
@Roles(Role.SUPER_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminAnalyticsService: AdminAnalyticsService,
  ) {}

  // ── Platform stats ─────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ── Tenant management ──────────────────────────────────────────────────

  @Get('tenants')
  listTenants(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    return this.adminService.listTenants({
      page: Number(page),
      limit: Number(limit),
      search,
    });
  }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.adminService.getTenantById(id);
  }

  @Post('tenants')
  createTenant(
    @Body()
    body: {
      tenantName: string;
      tenantSlug: string;
      adminEmail: string;
      adminPassword: string;
    },
  ) {
    return this.adminService.createTenant(body);
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id') id: string) {
    return this.adminService.deleteTenant(id);
  }

  // ── Users management ───────────────────────────────────────────────────

  @Get('users')
  listUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers({
      page: Number(page),
      limit: Number(limit),
      tenantId,
      search,
    });
  }

  // ── Links management ───────────────────────────────────────────────────

  @Get('links')
  listLinks(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listLinks({
      page: Number(page),
      limit: Number(limit),
      tenantId,
      search,
    });
  }

  /**
   * Toggle a link's active status across any tenant.
   * Super Admin only — enforced by the @Roles(Role.SUPER_ADMIN) on the class.
   * Automatically invalidates the Redis redirect cache for the affected short code.
   */
  @Patch('links/:id')
  toggleLinkStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.adminService.toggleLinkStatus(id, body.isActive);
  }

  // ── Platform analytics ─────────────────────────────────────────────────

  @Get('analytics/overview')
  getAnalyticsOverview() {
    return this.adminAnalyticsService.getOverview();
  }

  @Get('analytics/clicks')
  getAnalyticsClicks(@Query('days') days?: string) {
    return this.adminAnalyticsService.getClicksOverTime(days ? Number(days) : undefined);
  }

  @Get('analytics/referrers')
  getAnalyticsReferrers(@Query('limit') limit?: string) {
    return this.adminAnalyticsService.getReferrers(limit ? Number(limit) : undefined);
  }

  @Get('analytics/user-agents')
  getAnalyticsUserAgents(@Query('limit') limit?: string) {
    return this.adminAnalyticsService.getUserAgents(limit ? Number(limit) : undefined);
  }

  @Get('analytics/top-links')
  getTopLinks(@Query('limit') limit?: string) {
    return this.adminAnalyticsService.getTopLinks(limit ? Number(limit) : undefined);
  }

  @Get('analytics/tenant-activity')
  getTenantActivity(@Query('limit') limit?: string) {
    return this.adminAnalyticsService.getTenantActivity(limit ? Number(limit) : undefined);
  }

  // ── Tenant-specific analytics (for detail page) ────────────────────────

  @Get('tenants/:id/analytics')
  getTenantAnalytics(@Param('id') id: string, @Query('days') days?: string) {
    return this.adminAnalyticsService.getTenantAnalytics(id, days ? Number(days) : undefined);
  }
}
