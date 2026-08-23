import { Injectable, Logger } from '@nestjs/common';
import { ExternalRecordType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CareerDataSyncService {
  private readonly logger = new Logger(CareerDataSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Propagates an APPROVED external data record to downstream intelligence engines.
   * Modifies Career State ONLY when user explicitly approves.
   */
  async propagateApprovedRecord(
    userId: string,
    recordType: ExternalRecordType,
    normalized: Record<string, any>,
  ) {
    this.logger.log(`Propagating approved external record for user ${userId}, type: ${recordType}`);

    switch (recordType) {
      case ExternalRecordType.REPOSITORY:
      case ExternalRecordType.PORTFOLIO_LINK:
        return this.applyProjectToCareerState(userId, normalized);
      case ExternalRecordType.CALENDAR_EVENT:
        return this.applyCalendarEventToCareerState(userId, normalized);
      case ExternalRecordType.EMAIL_SIGNAL:
        return this.applyEmailSignalToCareerState(userId, normalized);
      case ExternalRecordType.DOCUMENT_SUMMARY:
        return this.applyDocumentToCareerState(userId, normalized);
      default:
        return { success: true, message: 'Record processed.' };
    }
  }

  // ─── 1. PHASE 39 & CAREER STATE: PROJECTS & REPOSITORIES ─────────────────

  private async applyProjectToCareerState(userId: string, normalized: Record<string, any>) {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { userId } });

    const newProject = {
      id: `proj-${Date.now()}`,
      title: normalized['title'] || 'Imported Project',
      description: normalized['description'] || 'External project evidence',
      technologies: normalized['technologies'] || [],
      githubUrl: normalized['repoUrl'],
      liveUrl: normalized['liveUrl'],
      starCount: normalized['starCount'] || 0,
      evidenceType: normalized['evidenceType'] || 'PROJECT',
      importedAt: new Date().toISOString(),
    };

    if (portfolio) {
      const content = (portfolio.contentJson as any) || { projects: [] };
      const existingProjects = Array.isArray(content.projects) ? content.projects : [];
      content.projects = [newProject, ...existingProjects];

      await this.prisma.portfolio.update({
        where: { userId },
        data: { contentJson: content, updatedAt: new Date() },
      });
    } else {
      await this.prisma.portfolio.create({
        data: {
          userId,
          username: `user_${userId.slice(0, 8)}`,
          contentJson: { projects: [newProject] },
        },
      });
    }

    // Phase 39 Evidence Graph: Create SkillEvidence rows for each technology
    const techList: string[] = normalized['technologies'] || [];
    for (const tech of techList) {
      // Find or create skill in catalog
      let skill = await this.prisma.skill.findFirst({
        where: { name: { equals: tech, mode: 'insensitive' } },
      });

      if (!skill) {
        skill = await this.prisma.skill.create({
          data: {
            name: tech,
            category: 'PROGRAMMING',
            description: 'Imported skill',
          },
        });
      }

      // Add SkillEvidence node
      await this.prisma.skillEvidence.create({
        data: {
          userId,
          skillId: skill.id,
          evidenceType: 'PROJECT',
          description: `Imported project "${newProject.title}" featuring ${tech}.`,
          score: 85.0,
        },
      });
    }

    // Phase 38 Event System: Log CareerEvent
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'ProjectImportedFromIntegration',
        source: 'EXTERNAL_INTEGRATION',
        entityType: 'PortfolioProject',
        entityId: newProject.id,
        importance: 'INFO',
        metadata: { title: newProject.title, tech: techList },
      },
    });

    // Phase 37 Action Engine: Suggest project optimization task
    await this.prisma.careerAction.create({
      data: {
        userId,
        actionType: 'PORTFOLIO_OPTIMIZATION',
        entityType: 'PortfolioProject',
        priority: 'MEDIUM',
        status: 'PENDING',
        explanation: `Add live demo and documentation for newly imported portfolio project "${newProject.title}".`,
      },
    });

    return {
      success: true,
      message: `Project "${newProject.title}" successfully added to Portfolio and Evidence Graph.`,
      project: newProject,
    };
  }

  // ─── 2. PHASE 42 & CAREER CENTER: CALENDAR EVENTS ───────────────────────

  private async applyCalendarEventToCareerState(userId: string, normalized: Record<string, any>) {
    const title = normalized['title'] || 'Career Event';
    const eventType = normalized['eventType'] || 'INTERVIEW';
    const company = normalized['company'];

    // Create CareerEvent
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: `Calendar${eventType}`,
        source: 'EXTERNAL_INTEGRATION',
        entityType: 'CalendarEvent',
        importance: 'INFO',
        metadata: { title, company, scheduledAt: normalized['scheduledAt'] },
      },
    });

    // Phase 37 Action Engine: Create prep action
    await this.prisma.careerAction.create({
      data: {
        userId,
        actionType: eventType === 'INTERVIEW' ? 'INTERVIEW_PREPARATION' : 'NETWORKING_PREPARATION',
        entityType: 'CalendarEvent',
        priority: 'HIGH',
        status: 'PENDING',
        explanation: `Prepare for ${title} (${eventType.toLowerCase()}) scheduled for ${new Date(normalized['scheduledAt']).toLocaleDateString()}.`,
      },
    });

    return { success: true, message: `Calendar event "${title}" added to Career Command Center.` };
  }

  // ─── 3. PHASE 33 & 41: EMAIL SIGNALS ─────────────────────────────────────

  private async applyEmailSignalToCareerState(userId: string, normalized: Record<string, any>) {
    const companyName = normalized['company'] || 'Target Company';
    const detectedStatus = normalized['detectedStatus'] || 'APPLIED';

    // Log CareerEvent
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'EmailSignalDetected',
        source: 'EXTERNAL_INTEGRATION',
        entityType: 'ApplicationSignal',
        importance: 'INFO',
        metadata: { company: companyName, detectedStatus },
      },
    });

    return { success: true, message: `Application signal for ${companyName} processed.` };
  }

  // ─── 4. SKILL EXTRACTOR: DOCUMENTS ────────────────────────────────────────

  private async applyDocumentToCareerState(userId: string, normalized: Record<string, any>) {
    const skills: string[] = normalized['extractedSkills'] || [];

    for (const skillName of skills) {
      let skill = await this.prisma.skill.findFirst({
        where: { name: { equals: skillName, mode: 'insensitive' } },
      });

      if (!skill) {
        skill = await this.prisma.skill.create({
          data: { name: skillName, category: 'PROGRAMMING', description: 'Document extracted skill' },
        });
      }

      // Add to user skills if not already present
      const existingUserSkill = await this.prisma.userSkill.findUnique({
        where: { userId_skillId: { userId, skillId: skill.id } },
      });

      if (!existingUserSkill) {
        await this.prisma.userSkill.create({
          data: {
            userId,
            skillId: skill.id,
            proficiency: 'INTERMEDIATE',
          },
        });
      }
    }

    return { success: true, message: `Extracted ${skills.length} skills from document.` };
  }
}
