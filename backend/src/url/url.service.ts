import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { RedirectCacheService } from '../redirect/redirect-cache.service';
import { hasPermission } from '../authorization/authorization.util';
import { Permission } from '../authorization/permission.enum';
import { generateUniqueShortCode } from './url-code.util';
import {
  ShortCodeAlreadyExistsException,
  ShortCodeGenerationFailedException,
  UrlNotFoundException,
} from './exceptions/url.exception';
import type { CreateUrlDto } from './dto/create-url.dto';
import type { UpdateUrlDto } from './dto/update-url.dto';
import type { ListUrlsQueryDto } from './dto/list-urls-query.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { Prisma, Url } from '@prisma/client';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const UNIQUE_CONSTRAINT_ERROR_CODE = 'P2002';

@Injectable()
export class UrlService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly redirectCache: RedirectCacheService,
  ) {}

  async create(dto: CreateUrlDto, currentUser: JwtPayload): Promise<Url> {
    const expiresAt = parseFutureDate(dto.expiresAt);
    const isUniqueConstraintError = (error: unknown): boolean =>
      isPrismaUniqueConstraintError(error, 'shortCode');

    if (dto.customCode) {
      try {
        return await this.tenantPrisma.client.url.create({
          data: {
            shortCode: dto.customCode,
            originalUrl: dto.originalUrl,
            title: dto.title,
            expiresAt,
            tenantId: currentUser.tenantId,
            createdById: currentUser.sub,
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ShortCodeAlreadyExistsException(dto.customCode);
        }
        throw error;
      }
    }

    try {
      return await generateUniqueShortCode(
        (candidate) =>
          this.tenantPrisma.client.url.create({
            data: {
              shortCode: candidate,
              originalUrl: dto.originalUrl,
              title: dto.title,
              expiresAt,
              tenantId: currentUser.tenantId,
              createdById: currentUser.sub,
            },
          }),
        isUniqueConstraintError,
      );
    } catch {
      throw new ShortCodeGenerationFailedException();
    }
  }

  async findAll(query: ListUrlsQueryDto): Promise<PaginatedResult<Url>> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { originalUrl: { contains: query.search, mode: 'insensitive' } },
        { shortCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await Promise.all([
      this.tenantPrisma.client.url.findMany({ where, skip, take: query.limit }),
      this.tenantPrisma.client.url.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<Url> {
    const url = await this.tenantPrisma.client.url.findUnique({ where: { id, deletedAt: null } });

    if (!url) {
      throw new UrlNotFoundException();
    }

    return url;
  }

  async update(id: string, dto: UpdateUrlDto, currentUser: JwtPayload): Promise<Url> {
    const url = await this.findOne(id);
    this.assertCanManage(url, currentUser);

    const expiresAt = dto.expiresAt === null ? null : parseFutureDate(dto.expiresAt);

    const updated = await this.tenantPrisma.client.url.update({
      where: { id },
      data: { ...dto, expiresAt },
    });

    // Any of these fields changing can make a cached redirect stale:
    // originalUrl (wrong destination), isActive (should stop redirecting),
    // expiresAt (cache TTL was bounded by the old value). Invalidating
    // unconditionally on any successful update is simpler and safer than
    // tracking exactly which fields changed, and this isn't a hot path.
    await this.redirectCache.invalidate(url.shortCode);

    return updated;
  }

  async remove(id: string, currentUser: JwtPayload): Promise<void> {
    const url = await this.findOne(id);
    this.assertCanManage(url, currentUser);

    await this.tenantPrisma.client.url.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.redirectCache.invalidate(url.shortCode);
  }

  /**
   * MEMBER may manage a URL they created themselves (URL_MANAGE_OWN, which
   * every role has); TENANT_ADMIN may manage any URL in the tenant
   * (URL_MANAGE, admin-only). This is resource-specific — "own" isn't
   * knowable from the route or the JWT alone, only by comparing the
   * fetched resource's creator to the caller — which is exactly why this
   * lives here rather than as a route-level @RequirePermissions() check.
   */
  private assertCanManage(url: Url, currentUser: JwtPayload): void {
    const isOwner = url.createdById === currentUser.sub;
    const canManageAny = hasPermission(currentUser.role, Permission.URL_MANAGE);

    if (!isOwner && !canManageAny) {
      throw new ForbiddenException('You do not have permission to manage this URL');
    }
  }
}

function isPrismaUniqueConstraintError(error: unknown, field: string): boolean {
  const knownError = error as Partial<Prisma.PrismaClientKnownRequestError> | undefined;
  const target = knownError?.meta?.target;

  return (
    knownError?.code === UNIQUE_CONSTRAINT_ERROR_CODE &&
    Array.isArray(target) &&
    target.includes(field)
  );
}

function parseFutureDate(value: string | null | undefined): Date | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const date = new Date(value);

  if (date <= new Date()) {
    throw new BadRequestException('expiresAt must be in the future');
  }

  return date;
}
