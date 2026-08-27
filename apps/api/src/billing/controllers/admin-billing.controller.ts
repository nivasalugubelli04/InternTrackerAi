import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminGrantOverrideDto, CreatePromoCodeDto } from '../dto/billing.dto';
import { MonetizationAnalyticsService } from '../services/monetization-analytics.service';

@ApiTags('Admin Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/billing')
export class AdminBillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: MonetizationAnalyticsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get revenue, subscriber, and churn metrics' })
  async getDashboard() {
    return this.analyticsService.getMonetizationMetrics();
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions' })
  async getSubscriptions() {
    return this.prisma.subscription.findMany({
      include: { user: { select: { email: true } }, plan: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get('failed-payments')
  @ApiOperation({ summary: 'List failed payments' })
  async getFailedPayments() {
    return this.prisma.payment.findMany({
      where: { status: 'FAILED' },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Post('overrides')
  @ApiOperation({ summary: 'Grant manual admin plan override' })
  async grantOverride(@CurrentUser('id') adminId: string, @Body() dto: AdminGrantOverrideDto) {
    const expiresAt = dto.durationDays
      ? new Date(Date.now() + dto.durationDays * 24 * 60 * 60 * 1000)
      : null;

    return this.prisma.adminBillingOverride.create({
      data: {
        userId: dto.userId,
        planId: dto.planId,
        reason: dto.reason,
        grantedByUserId: adminId,
        expiresAt,
        isActive: true,
      },
    });
  }

  @Post('promos')
  @ApiOperation({ summary: 'Create new promotion / discount code' })
  async createPromo(@Body() dto: CreatePromoCodeDto) {
    const expiresAt = dto.validDays
      ? new Date(Date.now() + dto.validDays * 24 * 60 * 60 * 1000)
      : null;

    return this.prisma.promotionCode.create({
      data: {
        code: dto.code.toUpperCase(),
        description: dto.description,
        discountPercent: dto.discountPercent || null,
        discountAmount: dto.discountAmount || null,
        currency: dto.currency || 'USD',
        maxRedemptions: dto.maxRedemptions || null,
        startsAt: new Date(),
        expiresAt,
        isActive: true,
      },
    });
  }

  @Get('promos')
  @ApiOperation({ summary: 'List all active promotion codes' })
  async getPromos() {
    return this.prisma.promotionCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
