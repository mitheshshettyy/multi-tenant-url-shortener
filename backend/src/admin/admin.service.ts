import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from '../auth/password.service';
import { Role } from '@prisma/client';

// The reserved platform tenant slug. This tenant is home to SUPER_ADMIN
// users and is explicitly excluded from the tenants list shown in the admin UI.
export const PLATFORM_TENANT_SLUG = '__platform__';

@Injectable()
export class AdminService {
  constructor(
    /** Raw PrismaService — NOT TenantPrismaService. Admin queries are
     *  intentionally cross-tenant. Never inject TenantPrismaService here. */
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  // ── Platform stats ─────────────────────────────────────────────────────

  async getStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalTenants,
      totalUsers,
      totalLinks,
      totalClicks,
      newTenants,
      newUsers,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { slug: { not: PLATFORM_TENANT_SLUG } } }),
      this.prisma.user.count({ where: { role: { not: Role.SUPER_ADMIN } } }),
      this.prisma.url.count({ where: { deletedAt: null } }),
      this.prisma.click.count(),
      this.prisma.tenant.count({
        where: {
          slug: { not: PLATFORM_TENANT_SLUG },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.user.count({
        where: {
          role: { not: Role.SUPER_ADMIN },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    const avgClicksPerLink =
      totalLinks > 0 ? Math.round((totalClicks / totalLinks) * 10) / 10 : 0;

    // Active tenants = tenants with at least one active URL
    const activeTenantIds = await this.prisma.url.findMany({
      where: { isActive: true, deletedAt: null },
      select: { tenantId: true },
      distinct: ['tenantId'],
    });

    return {
      totalTenants,
      activeTenants: activeTenantIds.length,
      totalUsers,
      totalLinks,
      totalClicks,
      avgClicksPerLink,
      newTenants,
      newUsers,
    };
  }

  // ── Tenant management ──────────────────────────────────────────────────

  async listTenants(opts: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = opts;
    const skip = (page - 1) * limit;

    const where = {
      slug: { not: PLATFORM_TENANT_SLUG },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { slug: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, urls: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    // Enrich with click count
    const enriched = await Promise.all(
      tenants.map(async (t) => {
        const clicks = await this.prisma.click.count({ where: { tenantId: t.id } });
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          createdAt: t.createdAt,
          userCount: t._count.users,
          linkCount: t._count.urls,
          clickCount: clicks,
        };
      }),
    );

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTenantById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: { select: { users: true, urls: true } },
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        urls: {
          where: { deletedAt: null },
          select: {
            id: true,
            shortCode: true,
            originalUrl: true,
            title: true,
            isActive: true,
            expiresAt: true,
            createdAt: true,
            _count: { select: { clicks: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!tenant || tenant.slug === PLATFORM_TENANT_SLUG) {
      throw new NotFoundException('Tenant not found');
    }

    const clickCount = await this.prisma.click.count({ where: { tenantId } });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt,
      userCount: tenant._count.users,
      linkCount: tenant._count.urls,
      clickCount,
      users: tenant.users,
      links: tenant.urls.map((u) => ({
        ...u,
        clickCount: u._count.clicks,
        _count: undefined,
      })),
    };
  }

  async createTenant(dto: {
    tenantName: string;
    tenantSlug: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    // Validate uniqueness
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (existingTenant) {
      throw new ConflictException('Tenant slug already in use');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await this.passwordService.hash(dto.adminPassword);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.tenantName, slug: dto.tenantSlug },
      });

      const admin = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.adminEmail,
          passwordHash,
          role: Role.TENANT_ADMIN,
        },
        select: { id: true, email: true, role: true, createdAt: true },
      });

      return { tenant, admin };
    });
  }

  async deleteTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant || tenant.slug === PLATFORM_TENANT_SLUG) {
      throw new NotFoundException('Tenant not found');
    }

    // Cascade deletes are defined in the schema:
    //   Tenant → User (onDelete: Cascade)
    //   Tenant → Url (onDelete: Cascade)
    //   Url → Click (onDelete: Cascade)
    // So deleting the tenant removes all related data.
    await this.prisma.tenant.delete({ where: { id: tenantId } });

    return { deleted: true };
  }

  // ── Users management ───────────────────────────────────────────────────

  async listUsers(opts: { page: number; limit: number; tenantId?: string; search?: string }) {
    const { page, limit, tenantId, search } = opts;
    const skip = (page - 1) * limit;

    const where: any = {
      role: { not: Role.SUPER_ADMIN },
      ...(tenantId ? { tenantId } : {}),
      ...(search
        ? { email: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          tenant: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Links management ───────────────────────────────────────────────────

  async listLinks(opts: { page: number; limit: number; tenantId?: string; search?: string }) {
    const { page, limit, tenantId, search } = opts;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(tenantId ? { tenantId } : {}),
      ...(search
        ? {
            OR: [
              { shortCode: { contains: search, mode: 'insensitive' as const } },
              { originalUrl: { contains: search, mode: 'insensitive' as const } },
              { title: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [urls, total] = await Promise.all([
      this.prisma.url.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shortCode: true,
          originalUrl: true,
          title: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
          tenant: { select: { id: true, name: true, slug: true } },
          createdBy: { select: { email: true } },
          _count: { select: { clicks: true } },
        },
      }),
      this.prisma.url.count({ where }),
    ]);

    return {
      data: urls.map((u) => ({
        ...u,
        clickCount: u._count.clicks,
        _count: undefined,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
