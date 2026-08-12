import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

// ── Tenant seed ──────────────────────────────────────────────────────────
const SEED_TENANT_NAME = 'Acme Inc';
const SEED_TENANT_SLUG = 'acme';
const SEED_USER_EMAIL = 'dev@example.com';
const SEED_USER_PASSWORD = 'devpassword123';

// ── Platform admin seed ────────────────────────────────────────────────────
// The __platform__ tenant is a reserved tenant that anchors the SUPER_ADMIN.
// It is never shown in the admin tenants list.
const PLATFORM_TENANT_SLUG = '__platform__';
const PLATFORM_TENANT_NAME = 'Platform Administration';
const SUPER_ADMIN_EMAIL = 'superadmin@platform.com';
const SUPER_ADMIN_PASSWORD = 'superadmin123';

async function main(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: SEED_TENANT_SLUG },
    update: {},
    create: {
      name: SEED_TENANT_NAME,
      slug: SEED_TENANT_SLUG,
    },
  });

  const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email: SEED_USER_EMAIL },
    update: {
      role: Role.TENANT_ADMIN,
    },
    create: {
      email: SEED_USER_EMAIL,
      passwordHash,
      tenantId: tenant.id,
      role: Role.TENANT_ADMIN,
    },
  });

  // 2. Platform tenant (reserved, never shown in tenants list)
  const platformTenant = await prisma.tenant.upsert({
    where: { slug: PLATFORM_TENANT_SLUG },
    update: {},
    create: {
      name: PLATFORM_TENANT_NAME,
      slug: PLATFORM_TENANT_SLUG,
    },
  });

  const superAdminHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, SALT_ROUNDS);

  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      role: Role.SUPER_ADMIN,
    },
    create: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash: superAdminHash,
      tenantId: platformTenant.id,
      role: Role.SUPER_ADMIN,
    },
  });

  console.log('\n── Tenant Seed ──────────────────────────────────────────');
  console.log(`Tenant : ${tenant.name} (${tenant.slug})`);
  console.log(`User   : ${user.email}  (password: ${SEED_USER_PASSWORD}, role: ${user.role})`);
  console.log('\n── Platform Admin Seed ──────────────────────────────────');
  console.log(`Tenant : ${platformTenant.name} (${platformTenant.slug})`);
  console.log(`Admin  : ${superAdmin.email}  (password: ${SUPER_ADMIN_PASSWORD}, role: ${superAdmin.role})`);
  console.log('─────────────────────────────────────────────────────────\n');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
