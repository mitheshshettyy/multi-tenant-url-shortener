import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { PasswordService } from '../auth/password.service';
import { RedirectModule } from '../redirect/redirect.module';

@Module({
  imports: [RedirectModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminAnalyticsService,
    // PasswordService is not exported from AuthModule, so we provide it locally.
    // PrismaService is globally available via DatabaseModule (@Global).
    PasswordService,
  ],
})
export class AdminModule {}
