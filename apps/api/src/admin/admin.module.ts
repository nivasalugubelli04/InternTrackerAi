import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SCRAPE_QUEUE, EMBEDDING_QUEUE } from '../queues/queue.constants';

import { AdminBetaController } from './controllers/admin-beta.controller';
import { AdminCompaniesController } from './controllers/admin-companies.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminFeatureFlagsController } from './controllers/admin-feature-flags.controller';
import { AdminLogsController } from './controllers/admin-logs.controller';
import { AdminRecommendationsController } from './controllers/admin-recommendations.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminBetaService } from './services/admin-beta.service';
import { AdminCompaniesService } from './services/admin-companies.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminFeatureFlagsService } from './services/admin-feature-flags.service';
import { AdminRecommendationsService } from './services/admin-recommendations.service';
import { AdminUsersService } from './services/admin-users.service';
import { AiModule } from '../ai/ai.module';
import { AdminRecruiterController } from './controllers/admin-recruiter.controller';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    BullModule.registerQueue({ name: SCRAPE_QUEUE }),
    BullModule.registerQueue({ name: EMBEDDING_QUEUE }),
  ],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminCompaniesController,
    AdminLogsController,
    AdminFeatureFlagsController,
    AdminBetaController,
    AdminRecommendationsController,
    AdminRecruiterController, // Phase 22
  ],
  providers: [
    AdminAuditService,
    AdminDashboardService,
    AdminUsersService,
    AdminCompaniesService,
    AdminFeatureFlagsService,
    AdminBetaService,
    AdminRecommendationsService,
  ],
  exports: [AdminAuditService],
})
export class AdminModule {}
