import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { CandidateAssessmentService } from '../candidate/candidate-assessment.service';
import { CandidateHiringController } from '../candidate/candidate-hiring.controller';
import { CandidateHiringService } from '../candidate/candidate-hiring.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

import { CandidateDiscoveryController } from './controllers/candidate-discovery.controller';
import { ContactMessagingController } from './controllers/contact-messaging.controller';
import { RecruiterAssessmentController } from './controllers/recruiter-assessment.controller';
import { RecruiterDashboardController } from './controllers/recruiter-dashboard.controller';
import { RecruiterInterviewController } from './controllers/recruiter-interview.controller';
import { RecruiterJobController } from './controllers/recruiter-job.controller';
import { RecruiterOfferController } from './controllers/recruiter-offer.controller';
import { RecruiterOrgController } from './controllers/recruiter-org.controller';
import { ShortlistPipelineController } from './controllers/shortlist-pipeline.controller';
import { RecruiterGuard } from './guards/recruiter.guard';
import { VerifiedOrgGuard } from './guards/verified-org.guard';
import { AssessmentSandboxService } from './services/assessment-sandbox.service';
import { AssessmentService } from './services/assessment.service';
import { AvailabilityCalendarService } from './services/availability-calendar.service';
import { CandidateDiscoveryService } from './services/candidate-discovery.service';
import { ContactRequestService } from './services/contact-request.service';
import { HiringAiAssistantService } from './services/hiring-ai-assistant.service';
import { HiringAnalyticsService } from './services/hiring-analytics.service';
import { HiringInterviewService } from './services/hiring-interview.service';
import { InterviewFeedbackService } from './services/interview-feedback.service';
import { MessagingService } from './services/messaging.service';
import { OfferService } from './services/offer.service';
import { PipelineService } from './services/pipeline.service';
import { RecruiterAiService } from './services/recruiter-ai.service';
import { RecruiterAnalyticsService } from './services/recruiter-analytics.service';
import { RecruiterJobService } from './services/recruiter-job.service';
import { RecruiterOrgService } from './services/recruiter-org.service';
import { ShortlistService } from './services/shortlist.service';

@Module({
  imports: [PrismaModule, AiModule, BillingModule, NotificationsModule],
  controllers: [
    RecruiterOrgController,
    RecruiterJobController,
    CandidateDiscoveryController,
    ShortlistPipelineController,
    ContactMessagingController,
    RecruiterDashboardController,
    RecruiterAssessmentController,
    RecruiterInterviewController,
    RecruiterOfferController,
    CandidateHiringController,
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
    AssessmentSandboxService,
    AssessmentService,
    AvailabilityCalendarService,
    HiringInterviewService,
    InterviewFeedbackService,
    HiringAiAssistantService,
    OfferService,
    HiringAnalyticsService,
    CandidateAssessmentService,
    CandidateHiringService,
  ],
  exports: [
    RecruiterOrgService,
    CandidateDiscoveryService,
    AssessmentService,
    HiringInterviewService,
    OfferService,
  ],
})
export class RecruiterModule {}
