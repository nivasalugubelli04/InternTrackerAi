import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminCompaniesController } from './controllers/admin-companies.controller';
import { AdminLogsController } from './controllers/admin-logs.controller';
import { AdminFeatureFlagsController } from './controllers/admin-feature-flags.controller';
import { AdminUsersService } from './services/admin-users.service';
import { AdminCompaniesService } from './services/admin-companies.service';
import { AdminFeatureFlagsService } from './services/admin-feature-flags.service';
import { BullModule } from '@nestjs/bullmq';
import { SCRAPE_QUEUE } from '../queues/queue.constants';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: SCRAPE_QUEUE })],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminCompaniesController,
    AdminLogsController,
    AdminFeatureFlagsController,
  ],
  providers: [
    AdminAuditService,
    AdminDashboardService,
    AdminUsersService,
    AdminCompaniesService,
    AdminFeatureFlagsService,
  ],
  exports: [AdminAuditService],
})
export class AdminModule {}
