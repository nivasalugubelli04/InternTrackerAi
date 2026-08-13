import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EngagementController } from './controllers/engagement.controller';
import { CareerProgressService } from './services/career-progress.service';
import { EngagementTrackerService } from './services/engagement-tracker.service';
import { ReengagementCron } from './services/reengagement.cron';
import { GrowthModule } from '../growth/growth.module';

@Global()
@Module({
  imports: [PrismaModule, GrowthModule],
  controllers: [EngagementController],
  providers: [CareerProgressService, EngagementTrackerService, ReengagementCron],
  exports: [CareerProgressService, EngagementTrackerService],
})
export class EngagementModule {}
