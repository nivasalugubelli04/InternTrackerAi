import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { ApplicationOptimizationService } from '../services/application-optimization.service';

@ApiTags('Application Optimization')
@ApiBearerAuth()
@Controller()
export class ApplicationOptimizationController {
  constructor(private readonly optimizationService: ApplicationOptimizationService) {}

  @Get('opportunities/:id/intelligence')
  @ApiOperation({ summary: 'Get Opportunity Intelligence Profile for a job posting' })
  getOpportunityIntelligence(@Param('id', ParseUUIDPipe) id: string) {
    return this.optimizationService.analyzeOpportunity(id);
  }

  @Post('opportunities/:id/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run analysis and extract job requirements' })
  analyzeOpportunity(@Param('id', ParseUUIDPipe) id: string) {
    return this.optimizationService.analyzeOpportunity(id);
  }

  @Get('opportunities/:id/alignment')
  @ApiOperation({ summary: 'Get profile alignment analysis against opportunity requirements' })
  getAlignment(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.optimizationService.getOrCreateAlignment(user.sub, id);
  }

  @Get('opportunities/:id/preparation-plan')
  @ApiOperation({ summary: 'Get structured NOW/NEXT/OPTIONAL preparation steps' })
  getPreparationPlan(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.optimizationService.generatePreparationPlan(user.sub, id);
  }

  @Post('applications/:id/prepare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate alignment, preparation plan and quick wins for an application',
  })
  prepareApplication(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.optimizationService.getOrCreateAlignment(user.sub, id);
  }

  @Get('applications/:id/checklist')
  @ApiOperation({ summary: 'Get preparation checklist for an application' })
  getChecklist(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.optimizationService.getChecklist(id, user.sub);
  }

  @Patch('applications/:id/checklist/:itemKey')
  @ApiOperation({ summary: 'Toggle completion status of a checklist item' })
  toggleChecklistItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemKey') itemKey: string,
    @Body('isCompleted') isCompleted: boolean,
  ) {
    return this.optimizationService.toggleChecklistItem(id, itemKey, isCompleted, user.sub);
  }

  @Get('applications/:id/project-recommendations')
  @ApiOperation({ summary: 'Get ranked project highlight recommendations' })
  getProjectRecommendations(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.optimizationService.recommendProjects(user.sub, id);
  }

  @Post('applications/:id/resume-tailor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suggest custom resume tailoring modifications' })
  suggestResumeTailoring(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.optimizationService.suggestResumeTailoring(user.sub, id);
  }

  @Post('applications/:id/resume-tailor/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve resume tailoring draft and update application resume' })
  approveResumeTailoring(@CurrentUser() user: JwtPayload, @Body('draftId') draftId: string) {
    return this.optimizationService.approveResumeTailoring(draftId, user.sub);
  }

  @Post('applications/:id/copilot/ask')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Copilot question grounding utility' })
  askCopilot(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('question') question: string,
  ) {
    return this.optimizationService.answerApplicationQuestion(user.sub, id, question);
  }

  @Post('applications/:id/snapshot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save persistent contextual snapshot on submission' })
  saveSnapshot(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.optimizationService.saveContextSnapshot(user.sub, id);
  }
}
