import { Controller, Post, Delete, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Resume } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

import { UploadResumeDto } from './dto/upload-resume.dto';
import { ResumeService } from './resume.service';

@ApiTags('Resume')
@ApiBearerAuth()
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get()
  @ApiOperation({ summary: 'Get current resume metadata' })
  @ApiResponse({ status: 200, description: 'Resume metadata' })
  getResume(@CurrentUser() user: JwtPayload): Promise<Resume | null> {
    return this.resumeService.findByUserId(user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload resume metadata (PDF or DOCX, max 5MB)' })
  @ApiResponse({ status: 201, description: 'Resume uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  uploadResume(@CurrentUser() user: JwtPayload, @Body() dto: UploadResumeDto): Promise<Resume> {
    return this.resumeService.upload(user.sub, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete current resume' })
  @ApiResponse({ status: 204, description: 'Resume deleted' })
  @ApiResponse({ status: 404, description: 'No resume found' })
  async deleteResume(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.resumeService.delete(user.sub);
  }
}
