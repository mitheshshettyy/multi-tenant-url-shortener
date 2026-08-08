import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { PasswordService } from '../auth/password.service';

@Module({
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
