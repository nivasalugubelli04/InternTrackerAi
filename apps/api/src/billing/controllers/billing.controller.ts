import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BillingService } from '../services/billing.service';

class CheckoutDto {
  planId!: string;
}

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get current user subscription status' })
  async getSubscription(@CurrentUser('id') userId: string) {
    return this.billingService.getSubscription(userId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create checkout session for a plan' })
  async createCheckoutSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CheckoutDto,
  ) {
    return this.billingService.createCheckoutSession(userId, dto.planId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel active subscription' })
  async cancelSubscription(@CurrentUser('id') userId: string) {
    return this.billingService.cancelSubscription(userId);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get payment history' })
  async getPayments(@CurrentUser('id') userId: string) {
    return this.billingService.getPayments(userId);
  }
}
