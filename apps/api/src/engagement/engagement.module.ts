import { Module, Global } from '@nestjs/common';

import { GrowthModule } from '../growth/growth.module';
import { PrismaModule } from '../prisma/prisma.module';

import { EngagementController } from './controllers/engagement.controller';
import { ActivationJourneyService } from './services/activation-journey.service';
import { CareerProgressService } from './services/career-progress.service';
import { ChannelSelectionService } from './services/channel-selection.service';
import { DailyFocusService } from './services/daily-focus.service';
import { EngagementPriorityService } from './services/engagement-priority.service';
import { EngagementSignalService } from './services/engagement-signal.service';
import { EngagementTrackerService } from './services/engagement-tracker.service';
import { GrowthAnalyticsService } from './services/growth-analytics.service';
import { NotificationFatigueService } from './services/notification-fatigue.service';
import { ReengagementCron } from './services/reengagement.cron';
import { ReengagementService } from './services/reengagement.service';
import { WeeklyCareerSummaryService } from './services/weekly-career-summary.service';

@Global()
@Module({
  imports: [PrismaModule, GrowthModule],
  controllers: [EngagementController],
  providers: [
    CareerProgressService,
    EngagementTrackerService,
    ReengagementCron,
    ActivationJourneyService,
    EngagementSignalService,
    EngagementPriorityService,
    NotificationFatigueService,
    ChannelSelectionService,
    DailyFocusService,
    WeeklyCareerSummaryService,
    ReengagementService,
    GrowthAnalyticsService,
  ],
  exports: [
    CareerProgressService,
    EngagementTrackerService,
    ActivationJourneyService,
    EngagementSignalService,
    EngagementPriorityService,
    NotificationFatigueService,
    ChannelSelectionService,
    DailyFocusService,
    WeeklyCareerSummaryService,
    ReengagementService,
    GrowthAnalyticsService,
  ],
})
export class EngagementModule {}
