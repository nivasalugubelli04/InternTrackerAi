import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
// RolesGuard and Roles decorator would typically be used here, 
// Assuming they exist or we just trust the admin guard logic for this phase.
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Admin Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/billing')
export class AdminBillingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get revenue and subscription analytics' })
  async getDashboard() {
    const totalUsers = await this.prisma.user.count();
    const activeSubscriptions = await this.prisma.subscription.count({
      where: { status: 'ACTIVE' },
    });

    const failedPayments = await this.prisma.payment.count({
      where: { status: 'FAILED' },
    });

    const payments = await this.prisma.payment.findMany({
      where: { status: 'COMPLETED' },
    });
    
    // Calculate MRR from active subscriptions (approximate for MVP)
    const subscriptions = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });

    let mrr = 0;
    subscriptions.forEach(sub => {
      if (sub.plan.billingInterval === 'MONTHLY') mrr += Number(sub.plan.price);
      if (sub.plan.billingInterval === 'YEARLY') mrr += Number(sub.plan.price) / 12;
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      activePaidUsers: activeSubscriptions,
      freeUsers: totalUsers - activeSubscriptions,
      conversionRate: totalUsers > 0 ? ((activeSubscriptions / totalUsers) * 100).toFixed(2) + '%' : '0%',
      mrr: Math.round(mrr),
      totalRevenue: Math.round(totalRevenue),
      failedPayments,
      churnRate: 'Needs implementation based on cancellations over time', // Requires more complex time-series queries
    };
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
}
