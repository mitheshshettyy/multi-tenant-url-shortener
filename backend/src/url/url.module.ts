import { Module } from '@nestjs/common';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';
import { RedirectModule } from '../redirect/redirect.module';

@Module({
  imports: [RedirectModule],
  controllers: [UrlController],
  providers: [UrlService],
})
export class UrlModule {}
