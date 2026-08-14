import { Controller, Get, Post, Patch, Delete, Body, Param, Req, Res, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ResumeStudioService } from './resume-studio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('v1/resumes')
@UseGuards(JwtAuthGuard)
export class ResumeStudioController {
  constructor(private readonly resumeStudioService: ResumeStudioService) {}

  @Get()
  async getResumes(@Req() req: Request) {
    return this.resumeStudioService.getResumes((req.user as any).id);
  }

  @Post()
  async createResume(@Req() req: Request, @Body() data: any) {
    return this.resumeStudioService.createResume((req.user as any).id, data);
  }

  @Get(':id')
  async getResume(@Req() req: Request, @Param('id') id: string) {
    return this.resumeStudioService.getResume((req.user as any).id, id);
  }

  @Patch(':id')
  async updateResume(@Req() req: Request, @Param('id') id: string, @Body() data: any) {
    return this.resumeStudioService.updateResume((req.user as any).id, id, data);
  }

  @Delete(':id')
  async deleteResume(@Req() req: Request, @Param('id') id: string) {
    return this.resumeStudioService.deleteResume((req.user as any).id, id);
  }

  @Post(':id/analyze')
  async analyzeResume(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('jobId') jobId?: string,
    @Body('versionId') versionId?: string
  ) {
    return this.resumeStudioService.analyzeResume((req.user as any).id, id, jobId, versionId);
  }

  @Post(':id/optimize')
  async optimizeResume(@Req() req: Request, @Param('id') id: string, @Body() data: any) {
    return this.resumeStudioService.optimizeResume((req.user as any).id, id, data);
  }

  @Post(':id/compare/:jobId')
  async compareResume(@Req() req: Request, @Param('id') id: string, @Param('jobId') jobId: string) {
    return this.resumeStudioService.compareResume((req.user as any).id, id, jobId);
  }

  @Post(':id/versions')
  async createVersion(@Req() req: Request, @Param('id') id: string, @Body() data: any) {
    return this.resumeStudioService.createVersion((req.user as any).id, id, data);
  }

  @Get(':id/history')
  async getHistory(@Req() req: Request, @Param('id') id: string) {
    return this.resumeStudioService.getHistory((req.user as any).id, id);
  }

  @Post(':id/export')
  async exportResume(@Req() req: Request, @Param('id') id: string, @Body('format') format: string) {
    return this.resumeStudioService.exportResume((req.user as any).id, id, format || 'PDF');
  }

  @Post(':id/suggestions/:suggestionId/approve')
  async approveSuggestion(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('suggestionId') suggestionId: string
  ) {
    return this.resumeStudioService.approveSuggestion((req.user as any).id, id, suggestionId);
  }

  @Post(':id/suggestions/:suggestionId/reject')
  async rejectSuggestion(
    @Req() req: Request,
    @Param('suggestionId') suggestionId: string
  ) {
    return this.resumeStudioService.rejectSuggestion((req.user as any).id, suggestionId);
  }

  @Get(':id/download')
  async downloadResume(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: any,
    @Query('format') _format?: string
  ) {
    const userId = (req.user as any).id;
    const document = await this.resumeStudioService.getResume(userId, id);
    const version = document.versions[0];
    if (!version) throw new NotFoundException('No version to download');

    const pdfBuffer = await this.resumeStudioService.buildPdf(version.contentJson);
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="${document.name}.pdf"`);
    res.send(pdfBuffer);
  }
}
