import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Response,
  NotFoundException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { ResumeBuilderService } from './resume-builder.service';

@Controller('resume-builder')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class ResumeBuilderController {
  constructor(private readonly resumeBuilderService: ResumeBuilderService) {}

  @Post('tailor/:jobId')
  async tailorBulletPoints(
    @Request() req: any,
    @Param('jobId') jobId: string,
    @Body('experienceId') experienceId: string,
  ) {
    return this.resumeBuilderService.generateTailoredBulletPoints(req.user.id, jobId, experienceId);
  }

  @Post('generate')
  async generateBulletPoints(
    @Request() req: any,
    @Body() body: { jobId: string; experienceId: string },
    @Body('resumeData') resumeData: any,
  ) {
    return this.resumeBuilderService.createAndSaveResume(req.user.id, body.jobId, resumeData);
  }

  @Get('download/:resumeId')
  async downloadPdf(
    @Request() req: any,
    @Response() res: any,
    @Param('resumeId') resumeId: string,
  ) {
    const userId = req.user.id;
    // Ideally we'd fetch the generated resume, check ownership, and redirect to S3 URL or stream it.
    // For this demonstration, we'll build it on the fly to simulate a download.
    const resumes = await this.resumeBuilderService.getUserResumes(userId);
    const resume = resumes.find((r) => r.id === resumeId);

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const pdfBuffer = await this.resumeBuilderService.buildPdf(resume.content);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${resume.name}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Get('my-resumes')
  async getMyResumes(@Request() req: any) {
    const userId = req.user.id;
    return this.resumeBuilderService.getUserResumes(userId);
  }
}
