import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ExtensionService } from './extension.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('v1/extension')
export class ExtensionController {
  constructor(private readonly extensionService: ExtensionService) {}

  @Post('auth/connect')
  async connect(@Body() dto: any, @Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] as string;
    return this.extensionService.connect(dto, ip, userAgent);
  }

  @Post('session')
  @UseGuards(JwtAuthGuard)
  async createSession(@Req() req: Request, @Body('url') url: string, @Body('jobId') jobId?: string) {
    const userId = (req.user as any).id;
    return this.extensionService.createSession(userId, url, jobId);
  }

  @Get('session/:id')
  @UseGuards(JwtAuthGuard)
  async getSession(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).id;
    return this.extensionService.getSession(userId, id);
  }

  @Post('detect')
  @UseGuards(JwtAuthGuard)
  async detectFields(
    @Req() req: Request,
    @Body('sessionId') sessionId: string,
    @Body('fields') fields: Array<{ fieldName: string; fieldType: string }>,
  ) {
    const userId = (req.user as any).id;
    return this.extensionService.detectFields(userId, sessionId, fields);
  }

  @Post('field-suggestions')
  @UseGuards(JwtAuthGuard)
  async fieldSuggestions(
    @Req() req: Request,
    @Body('sessionId') sessionId: string,
    @Body('fieldId') fieldId: string,
    @Body('questionText') questionText: string,
  ) {
    const userId = (req.user as any).id;
    return this.extensionService.fieldSuggestions(userId, sessionId, fieldId, questionText);
  }

  @Post('approve')
  @UseGuards(JwtAuthGuard)
  async approveField(
    @Req() req: Request,
    @Body('sessionId') sessionId: string,
    @Body('fieldId') fieldId: string,
    @Body('value') value: string,
  ) {
    const userId = (req.user as any).id;
    return this.extensionService.approveField(userId, sessionId, fieldId, value);
  }

  @Post('fill-complete')
  @UseGuards(JwtAuthGuard)
  async fillComplete(
    @Req() req: Request,
    @Body('sessionId') sessionId: string,
    @Body('fieldsFilled') fieldsFilled: any,
  ) {
    const userId = (req.user as any).id;
    return this.extensionService.fillComplete(userId, sessionId, fieldsFilled);
  }

  @Post('submission-confirmation')
  @UseGuards(JwtAuthGuard)
  async submissionConfirmation(
    @Req() req: Request,
    @Body('sessionId') sessionId: string,
    @Body('jobId') jobId?: string,
  ) {
    const userId = (req.user as any).id;
    return this.extensionService.submissionConfirmation(userId, sessionId, jobId);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSettings() {
    return {
      enabled: true,
      version: '1.0.0',
      supportedPlatforms: ['greenhouse', 'lever', 'workday', 'smartrecruiters', 'ashby'],
    };
  }
}
