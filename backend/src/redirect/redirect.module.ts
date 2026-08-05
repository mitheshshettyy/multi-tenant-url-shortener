import { Module } from '@nestjs/common';
import { RedirectService } from './redirect.service';
import { RedirectCacheService } from './redirect-cache.service';

@Module({
  providers: [RedirectService, RedirectCacheService],
  exports: [RedirectService, RedirectCacheService],
})
export class RedirectModule {}
