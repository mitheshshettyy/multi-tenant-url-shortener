import { Role } from '@prisma/client';
import { Permission } from './permission.enum';

const MEMBER_PERMISSIONS: readonly Permission[] = [
  Permission.USER_READ,
  Permission.URL_READ,
  Permission.URL_CREATE,
  Permission.URL_MANAGE_OWN,
  Permission.ANALYTICS_READ,
];

const TENANT_ADMIN_ONLY_PERMISSIONS: readonly Permission[] = [
  Permission.TENANT_MANAGE,
  Permission.USER_MANAGE,
  Permission.URL_MANAGE,
];

const SUPER_ADMIN_PERMISSIONS: readonly Permission[] = [
  // Everything a tenant admin can do (for cross-tenant context when needed)
  ...MEMBER_PERMISSIONS,
  ...TENANT_ADMIN_ONLY_PERMISSIONS,
  // Platform-wide capabilities
  Permission.PLATFORM_READ,
  Permission.PLATFORM_MANAGE,
];

/**
 * TENANT_ADMIN is MEMBER's permissions plus admin-only ones — this
 * composition *is* the role hierarchy. There's no separate "does role A
 * outrank role B" check anywhere; a role either grants a permission or it
 * doesn't, and admin grants everything member does by listing member's
 * permissions explicitly here rather than through inheritance machinery.
 *
 * SUPER_ADMIN is a platform-level role that supersedes all tenant roles.
 * It uses raw PrismaService (not TenantPrismaService) for cross-tenant
 * queries. See admin.service.ts and admin-analytics.service.ts.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  [Role.MEMBER]: MEMBER_PERMISSIONS,
  [Role.TENANT_ADMIN]: [...MEMBER_PERMISSIONS, ...TENANT_ADMIN_ONLY_PERMISSIONS],
  [Role.SUPER_ADMIN]: SUPER_ADMIN_PERMISSIONS,
};

