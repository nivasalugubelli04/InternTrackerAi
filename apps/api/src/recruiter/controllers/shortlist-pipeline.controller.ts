import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RecruitmentPipelineStage } from '@prisma/client';
import { RecruiterGuard } from '../guards/recruiter.guard';
import { ShortlistService } from '../services/shortlist.service';
import { PipelineService } from '../services/pipeline.service';

@Controller('api/v1/recruiter')
@UseGuards(RecruiterGuard)
export class ShortlistPipelineController {
  constructor(
    private readonly shortlistService: ShortlistService,
    private readonly pipelineService: PipelineService,
  ) {}

  // ─── Shortlists ────────────────────────────────────────────────────────────

  @Post('shortlists')
  createShortlist(
    @Request() req: any,
    @Body() body: { name: string; description?: string },
  ) {
    return this.shortlistService.createShortlist(
      req.user.id,
      req.recruiterProfile.recruiterOrgId,
      body.name,
      body.description,
    );
  }

  @Get('shortlists')
  listShortlists(@Request() req: any) {
    return this.shortlistService.listShortlists(req.recruiterProfile.recruiterOrgId);
  }

  @Get('shortlists/:id')
  getShortlist(@Request() req: any, @Param('id') id: string) {
    return this.shortlistService.getShortlist(id, req.recruiterProfile.recruiterOrgId);
  }

  @Post('shortlists/:id/candidates')
  addCandidateToShortlist(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { candidateId: string; note?: string },
  ) {
    return this.shortlistService.addCandidate(
      id,
      req.recruiterProfile.recruiterOrgId,
      body.candidateId,
      body.note,
    );
  }

  @Delete('shortlists/:id/candidates/:candidateId')
  removeCandidateFromShortlist(
    @Request() req: any,
    @Param('id') id: string,
    @Param('candidateId') candidateId: string,
  ) {
    return this.shortlistService.removeCandidate(
      id,
      req.recruiterProfile.recruiterOrgId,
      candidateId,
    );
  }

  @Patch('shortlists/:id/candidates/:candidateId/stage')
  updateCandidateStage(
    @Request() req: any,
    @Param('id') id: string,
    @Param('candidateId') candidateId: string,
    @Body() body: { stage: RecruitmentPipelineStage; note?: string },
  ) {
    return this.shortlistService.updateCandidateStage(
      id,
      req.recruiterProfile.recruiterOrgId,
      candidateId,
      body.stage,
      body.note,
    );
  }

  // ─── Pipelines ─────────────────────────────────────────────────────────────

  @Post('pipelines')
  createPipeline(
    @Request() req: any,
    @Body() body: { name: string; jobId?: string },
  ) {
    return this.pipelineService.createPipeline(
      req.user.id,
      req.recruiterProfile.recruiterOrgId,
      body.name,
      body.jobId,
    );
  }

  @Get('pipelines')
  listPipelines(@Request() req: any) {
    return this.pipelineService.listPipelines(req.recruiterProfile.recruiterOrgId);
  }

  @Get('pipeline')
  getDefaultPipeline(@Request() req: any) {
    return this.pipelineService.listPipelines(req.recruiterProfile.recruiterOrgId);
  }

  @Get('pipelines/:id')
  getPipeline(@Request() req: any, @Param('id') id: string) {
    return this.pipelineService.getPipeline(id, req.recruiterProfile.recruiterOrgId);
  }

  @Get('pipelines/:id/funnel')
  getPipelineFunnel(@Request() req: any, @Param('id') id: string) {
    return this.pipelineService.getPipelineFunnelCounts(
      id,
      req.recruiterProfile.recruiterOrgId,
    );
  }

  @Post('pipelines/:id/candidates')
  addCandidateToPipeline(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { candidateId: string; jobId?: string; note?: string },
  ) {
    return this.pipelineService.addCandidateToPipeline(
      id,
      req.recruiterProfile.recruiterOrgId,
      body.candidateId,
      body.jobId,
      body.note,
    );
  }

  @Patch('pipelines/:id/candidates/:candidateId/stage')
  movePipelineStage(
    @Request() req: any,
    @Param('id') id: string,
    @Param('candidateId') candidateId: string,
    @Body() body: { stage: RecruitmentPipelineStage; note?: string },
  ) {
    return this.pipelineService.moveCandidateStage(
      id,
      req.recruiterProfile.recruiterOrgId,
      candidateId,
      body.stage,
      body.note,
    );
  }

  @Delete('pipelines/:id/candidates/:candidateId')
  removeCandidateFromPipeline(
    @Request() req: any,
    @Param('id') id: string,
    @Param('candidateId') candidateId: string,
  ) {
    return this.pipelineService.removeCandidateFromPipeline(
      id,
      req.recruiterProfile.recruiterOrgId,
      candidateId,
    );
  }
}
