import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/services/ai.service';
import { EntitlementService, BILLING_FEATURES } from '../billing/services/entitlement.service';

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly entitlementService: EntitlementService,
  ) {}

  async getPortfolio(userId: string) {
    let portfolio = await this.prisma.portfolio.findUnique({
      where: { userId },
    });

    if (!portfolio) {
      // Create empty private portfolio
      portfolio = await this.prisma.portfolio.create({
        data: {
          userId,
          username: `user-${userId.substring(0, 8)}`,
          visibility: 'PRIVATE',
          templateName: 'MINIMAL',
          contentJson: {},
        }
      });
    }

    return portfolio;
  }

  async updatePortfolio(userId: string, data: any) {
    const portfolio = await this.getPortfolio(userId);
    
    // Ensure username is unique if being updated
    if (data.username && data.username !== portfolio.username) {
      const existing = await this.prisma.portfolio.findUnique({ where: { username: data.username } });
      if (existing) {
        throw new ConflictException('Username is already taken');
      }
    }

    return this.prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        username: data.username !== undefined ? data.username : portfolio.username,
        templateName: data.templateName !== undefined ? data.templateName : portfolio.templateName,
        contentJson: data.contentJson !== undefined ? data.contentJson : portfolio.contentJson,
        visibility: data.visibility !== undefined ? data.visibility : portfolio.visibility,
        resumeDocumentId: data.resumeDocumentId !== undefined ? data.resumeDocumentId : portfolio.resumeDocumentId,
      }
    });
  }

  async publishPortfolio(userId: string, username?: string) {
    const portfolio = await this.getPortfolio(userId);
    
    const targetUsername = username || portfolio.username;

    if (username && username !== portfolio.username) {
      const existing = await this.prisma.portfolio.findUnique({ where: { username } });
      if (existing) {
        throw new ConflictException('Username is already taken');
      }
    }

    return this.prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        visibility: 'PUBLIC',
        username: targetUsername
      }
    });
  }

  async unpublishPortfolio(userId: string) {
    const portfolio = await this.getPortfolio(userId);
    return this.prisma.portfolio.update({
      where: { id: portfolio.id },
      data: { visibility: 'PRIVATE' }
    });
  }

  async getPublicPortfolio(username: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { username },
      include: {
        user: {
          include: {
            profile: true,
            userSkills: { include: { skill: true } }
          }
        }
      }
    });

    if (!portfolio || (portfolio.visibility !== 'PUBLIC' && portfolio.visibility !== 'UNLISTED')) {
      throw new NotFoundException('Portfolio not found or is private');
    }

    return portfolio;
  }

  /**
   * AI Portfolio Content Optimization
   */
  async optimizePortfolio(userId: string) {
    // 1. Enforce usage limits
    await this.entitlementService.enforceUsage(userId, BILLING_FEATURES.PORTFOLIO_AI);

    // 2. Fetch portfolio content
    const portfolio = await this.getPortfolio(userId);
    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    // 3. Call AI Service
    return this.aiService.optimizePortfolioContent(
      userId,
      portfolio.contentJson,
      profile || {}
    );
  }
}
