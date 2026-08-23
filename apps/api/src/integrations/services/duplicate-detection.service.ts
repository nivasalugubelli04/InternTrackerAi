import { Injectable, Logger } from '@nestjs/common';
import { ExternalRecordType, ReviewMatchConfidence } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface DuplicateCheckResult {
  matchConfidence: ReviewMatchConfidence;
  suggestedAction: string;
  targetEntityType?: string;
  targetEntityId?: string;
  matchReason?: string;
}

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluate a normalized external record against existing user career data.
   */
  async evaluate(
    userId: string,
    recordType: ExternalRecordType,
    normalized: Record<string, any>,
  ): Promise<DuplicateCheckResult> {
    this.logger.log(`Evaluating duplicate detection for user ${userId}, type: ${recordType}`);

    switch (recordType) {
      case ExternalRecordType.REPOSITORY:
      case ExternalRecordType.PORTFOLIO_LINK:
        return this.evaluateProject(userId, normalized);
      case ExternalRecordType.CALENDAR_EVENT:
        return this.evaluateCalendarEvent(userId, normalized);
      case ExternalRecordType.EMAIL_SIGNAL:
        return this.evaluateEmailSignal(userId, normalized);
      case ExternalRecordType.DOCUMENT_SUMMARY:
        return this.evaluateDocument(userId, normalized);
      default:
        return {
          matchConfidence: ReviewMatchConfidence.NEW_RECORD,
          suggestedAction: 'REVIEW_DATA',
        };
    }
  }

  private async evaluateProject(
    userId: string,
    normalized: Record<string, any>,
  ): Promise<DuplicateCheckResult> {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { userId },
    });

    if (!portfolio || !portfolio.contentJson) {
      return {
        matchConfidence: ReviewMatchConfidence.NEW_RECORD,
        suggestedAction: 'CREATE_PROJECT',
        targetEntityType: 'PortfolioProject',
      };
    }

    const content = portfolio.contentJson as any;
    const existingProjects = Array.isArray(content?.projects) ? content.projects : [];

    const normTitle = (normalized['title'] || '').toLowerCase();
    const normUrl = normalized['repoUrl'] || normalized['liveUrl'] || '';

    for (const p of existingProjects) {
      const pTitle = (p.title || '').toLowerCase();
      const pUrl = p.githubUrl || p.liveUrl || p.projectUrl || '';

      // Exact URL match
      if (normUrl && pUrl && normUrl.toLowerCase() === pUrl.toLowerCase()) {
        return {
          matchConfidence: ReviewMatchConfidence.EXACT_MATCH,
          suggestedAction: 'LINK_EXISTING_PROJECT',
          targetEntityType: 'PortfolioProject',
          targetEntityId: p.id || p.title,
          matchReason: `Exact repository/demo URL match with existing project "${p.title}".`,
        };
      }

      // Title similarity
      if (normTitle && pTitle && (normTitle === pTitle || normTitle.includes(pTitle) || pTitle.includes(normTitle))) {
        return {
          matchConfidence: ReviewMatchConfidence.HIGH_SIMILARITY,
          suggestedAction: 'MERGE_PROJECT',
          targetEntityType: 'PortfolioProject',
          targetEntityId: p.id || p.title,
          matchReason: `High title similarity with existing project "${p.title}".`,
        };
      }
    }

    return {
      matchConfidence: ReviewMatchConfidence.NEW_RECORD,
      suggestedAction: 'CREATE_PROJECT',
      targetEntityType: 'PortfolioProject',
      matchReason: 'No existing matching portfolio project found.',
    };
  }

  private async evaluateCalendarEvent(
    userId: string,
    normalized: Record<string, any>,
  ): Promise<DuplicateCheckResult> {
    const companyName = normalized['company'];
    if (!companyName) {
      return {
        matchConfidence: ReviewMatchConfidence.NEW_RECORD,
        suggestedAction: 'CREATE_CALENDAR_NOTE',
      };
    }

    // Check existing applications via companyNameSnapshot
    const matchingApp = await this.prisma.application.findFirst({
      where: {
        userId,
        companyNameSnapshot: { contains: companyName, mode: 'insensitive' },
      },
    });

    if (matchingApp) {
      return {
        matchConfidence: ReviewMatchConfidence.HIGH_SIMILARITY,
        suggestedAction: 'CREATE_INTERVIEW_CONTEXT',
        targetEntityType: 'Application',
        targetEntityId: matchingApp.id,
        matchReason: `Matches tracked application at ${companyName}.`,
      };
    }

    return {
      matchConfidence: ReviewMatchConfidence.NEW_RECORD,
      suggestedAction: 'CREATE_APPLICATION_CONTEXT',
      matchReason: `New event detected for ${companyName}.`,
    };
  }

  private async evaluateEmailSignal(
    userId: string,
    normalized: Record<string, any>,
  ): Promise<DuplicateCheckResult> {
    const company = normalized['company'];
    if (!company) {
      return {
        matchConfidence: ReviewMatchConfidence.NEW_RECORD,
        suggestedAction: 'REVIEW_EMAIL_SIGNAL',
      };
    }

    const app = await this.prisma.application.findFirst({
      where: {
        userId,
        companyNameSnapshot: { contains: company, mode: 'insensitive' },
      },
    });

    if (app) {
      return {
        matchConfidence: ReviewMatchConfidence.HIGH_SIMILARITY,
        suggestedAction: 'UPDATE_APPLICATION_STAGE',
        targetEntityType: 'Application',
        targetEntityId: app.id,
        matchReason: `Matches existing tracked application at ${company}.`,
      };
    }

    return {
      matchConfidence: ReviewMatchConfidence.NEW_RECORD,
      suggestedAction: 'CREATE_APPLICATION',
      matchReason: `New application signal detected for ${company}.`,
    };
  }

  private async evaluateDocument(
    userId: string,
    _normalized: Record<string, any>,
  ): Promise<DuplicateCheckResult> {
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    if (userSkills.length > 0) {
      return {
        matchConfidence: ReviewMatchConfidence.HIGH_SIMILARITY,
        suggestedAction: 'ADD_SKILL_EVIDENCE',
        targetEntityType: 'UserSkill',
        matchReason: `Found ${userSkills.length} existing skills in your catalog to enrich.`,
      };
    }

    return {
      matchConfidence: ReviewMatchConfidence.NEW_RECORD,
      suggestedAction: 'IMPORT_DOCUMENT_DATA',
      matchReason: 'Document ready for review and career data extraction.',
    };
  }
}
