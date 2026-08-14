import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { RecruiterAiService } from '../services/recruiter-ai.service';
import { RecruiterGuard } from '../guards/recruiter.guard';
import { RecruiterAnalyticsService } from '../services/recruiter-analytics.service';

@Controller('api/v1/recruiter')
@UseGuards(RecruiterGuard)
export class RecruiterDashboardController {
  constructor(
    private readonly analytics: RecruiterAnalyticsService,
    private readonly recruiterAi: RecruiterAiService,
  ) {}

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard(@Request() req: any) {
    return this.analytics.getDashboardKpis(req.recruiterProfile.recruiterOrgId);
  }

  @Get('analytics')
  getAnalytics(@Request() req: any) {
    return this.analytics.getHiringFunnel(req.recruiterProfile.recruiterOrgId);
  }

  @Get('analytics/jobs/:jobId')
  getJobAnalytics(@Request() req: any, @Param('jobId') jobId: string) {
    return this.analytics.getJobAnalytics(jobId, req.recruiterProfile.recruiterOrgId);
  }

  @Get('analytics/activity')
  getRecentActivity(@Request() req: any) {
    return this.analytics.getRecentActivity(req.recruiterProfile.recruiterOrgId);
  }

  @Get('analytics/time-to-shortlist')
  getTimeToShortlist(@Request() req: any) {
    return this.analytics.getTimeToShortlist(req.recruiterProfile.recruiterOrgId);
  }

  // ─── AI Capabilities ───────────────────────────────────────────────────────

  @Post('ai/summarize-candidate')
  summarizeCandidate(@Request() req: any, @Body() body: { candidateId: string }) {
    return this.recruiterAi.summarizeCandidateProfile(
      req.user.id,
      body.candidateId,
    );
  }

  @Post('ai/interview-questions')
  generateInterviewQuestions(
    @Request() req: any,
    @Body() body: { candidateId: string; jobId: string },
  ) {
    return this.recruiterAi.generateInterviewQuestions(
      req.user.id,
      body.jobId,
      body.candidateId,
    );
  }

  @Post('ai/draft-message')
  draftMessage(
    @Request() req: any,
    @Body() body: { candidateId: string; jobId: string; recruiterName: string; orgName: string },
  ) {
    return this.recruiterAi.draftRecruiterMessage(
      req.user.id,
      body.candidateId,
      body.jobId,
      body.recruiterName,
      body.orgName,
    );
  }

  @Post('ai/improve-job/:jobId')
  improveJobDescription(@Request() req: any, @Param('jobId') jobId: string) {
    return this.recruiterAi.improveJobDescription(
      req.user.id,
      jobId,
      req.recruiterProfile.recruiterOrgId,
    );
  }

  @Post('ai/explain-match')
  explainMatch(
    @Request() req: any,
    @Body() body: { candidateId: string; jobId: string },
  ) {
    return this.recruiterAi.explainCandidateJobMatch(
      req.user.id,
      body.candidateId,
      body.jobId,
    );
  }
}
