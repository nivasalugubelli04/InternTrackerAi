import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('v1/portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getPortfolio(@Req() req: Request) {
    return this.portfolioService.getPortfolio((req.user as any).id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async updatePortfolio(@Req() req: Request, @Body() data: any) {
    return this.portfolioService.updatePortfolio((req.user as any).id, data);
  }

  @Post('publish')
  @UseGuards(JwtAuthGuard)
  async publishPortfolio(@Req() req: Request, @Body('username') username: string) {
    return this.portfolioService.publishPortfolio((req.user as any).id, username);
  }

  @Post('unpublish')
  @UseGuards(JwtAuthGuard)
  async unpublishPortfolio(@Req() req: Request) {
    return this.portfolioService.unpublishPortfolio((req.user as any).id);
  }

  @Get('public/:username')
  async getPublicPortfolio(@Param('username') username: string) {
    return this.portfolioService.getPublicPortfolio(username);
  }

  @Post('optimize')
  @UseGuards(JwtAuthGuard)
  async optimizePortfolio(@Req() req: Request) {
    return this.portfolioService.optimizePortfolio((req.user as any).id);
  }
}
