import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';

import { RecruiterGuard } from './guards/recruiter.guard';
import { VerifiedOrgGuard } from './guards/verified-org.guard';

import { RecruiterOrgService } from './services/recruiter-org.service';
import { RecruiterJobService } from './services/recruiter-job.service';
import { CandidateDiscoveryService } from './services/candidate-discovery.service';
import { ShortlistService } from './services/shortlist.service';
import { PipelineService } from './services/pipeline.service';
import { ContactRequestService } from './services/contact-request.service';
import { MessagingService } from './services/messaging.service';
import { RecruiterAiService } from './services/recruiter-ai.service';
import { RecruiterAnalyticsService } from './services/recruiter-analytics.service';

import { RecruiterOrgController } from './controllers/recruiter-org.controller';
import { RecruiterJobController } from './controllers/recruiter-job.controller';
import { CandidateDiscoveryController } from './controllers/candidate-discovery.controller';
import { ShortlistPipelineController } from './controllers/shortlist-pipeline.controller';
import { ContactMessagingController } from './controllers/contact-messaging.controller';
import { RecruiterDashboardController } from './controllers/recruiter-dashboard.controller';

@Module({
  imports: [PrismaModule, AiModule, BillingModule],
  controllers: [
    RecruiterOrgController,
    RecruiterJobController,
    CandidateDiscoveryController,
    ShortlistPipelineController,
    ContactMessagingController,
    RecruiterDashboardController,
  ],
  providers: [
    RecruiterGuard,
    VerifiedOrgGuard,
    RecruiterOrgService,
    RecruiterJobService,
    CandidateDiscoveryService,
    ShortlistService,
    PipelineService,
    ContactRequestService,
    MessagingService,
    RecruiterAiService,
    RecruiterAnalyticsService,
  ],
  exports: [RecruiterOrgService, CandidateDiscoveryService],
})
export class RecruiterModule {}
