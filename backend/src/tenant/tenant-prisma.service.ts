import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { tenantScopingExtension } from './tenant-prisma.extension';

@Injectable()
export class TenantPrismaService {
  readonly client: PrismaService;

  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    this.client = prisma.$extends(tenantScopingExtension(tenantContext)) as PrismaService;
  }
}
