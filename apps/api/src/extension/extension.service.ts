import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/services/ai.service';
import { EntitlementService, BILLING_FEATURES } from '../billing/services/entitlement.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ExtensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly entitlementService: EntitlementService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Secure credential connection for Chrome Extension
   */
  async connect(dto: any, ipAddress?: string, userAgent?: string) {
    return this.authService.login(dto, ipAddress, userAgent);
  }

  /**
   * Starts an application assistant session
   */
  async createSession(userId: string, url: string, jobId?: string) {
    let domain = 'unknown';
    try {
      domain = new URL(url).hostname;
    } catch (e) {
      // Ignored
    }

    // Check for duplicate application
    let alreadyApplied = false;
    let existingApplicationId: string | null = null;
    if (jobId) {
      const existing = await this.prisma.application.findFirst({
        where: { userId, jobId },
      });
      if (existing) {
        alreadyApplied = true;
        existingApplicationId = existing.id;
      }
    }

    const session = await this.prisma.applicationAssistSession.create({
      data: {
        userId,
        jobId: jobId || null,
        domain,
        url,
        status: 'DETECTED',
        fieldsDetected: {},
        fieldsApproved: {},
        fieldsFilled: {},
        manualFields: {},
      },
    });

    return {
      session,
      alreadyApplied,
      existingApplicationId,
    };
  }

  /**
   * Retrieve session by ID
   */
  async getSession(userId: string, id: string) {
    const session = await this.prisma.applicationAssistSession.findFirst({
      where: { id, userId },
      include: {
        fields: true,
        drafts: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  /**
   * Detects form fields, checks against profile/resume, and returns confidence & values
   */
  async detectFields(userId: string, sessionId: string, fields: Array<{ fieldName: string; fieldType: string }>) {
    const session = await this.prisma.applicationAssistSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userSkills: { include: { skill: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = user.profile || ({} as any);
    const skillsList = user.userSkills.map((us) => us.skill.name).join(', ');

    // Fetch the latest resume version for alternate lookup
    const primaryResume = await this.prisma.resumeDocument.findFirst({
      where: { userId, isArchived: false },
      include: { versions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const latestVersion = primaryResume?.versions[0];
    const resumeJson = latestVersion?.contentJson as any;

    const suggestions: any[] = [];
    const sensitiveKeys = [
      'sponsorship',
      'visa',
      'workauth',
      'disability',
      'veteran',
      'gender',
      'criminal',
      'declaration',
      'agreement',
      'relocation',
    ];

    // Clear old field scans
    await this.prisma.applicationAssistField.deleteMany({
      where: { sessionId },
    });

    for (const field of fields) {
      const nameLower = field.fieldName.toLowerCase();
      let suggestedVal: string | null = null;
      let confidence = 0;
      let source = 'NONE';
      let status = 'DETECTED';

      // 1. Filter out sensitive questions
      const isSensitive = sensitiveKeys.some((k) => nameLower.includes(k));
      if (isSensitive) {
        suggestedVal = null;
        confidence = 0;
        source = 'SENSITIVE_MANUAL';
        status = 'MANUAL_REQUIRED';
      } else {
        // 2. Map canonical fields
        if (nameLower.includes('name') && !nameLower.includes('company') && !nameLower.includes('college') && !nameLower.includes('univ')) {
          if (nameLower.includes('first')) {
            suggestedVal = user.firstName;
            source = 'PROFILE';
            confidence = user.firstName ? 95 : 0;
          } else if (nameLower.includes('last')) {
            suggestedVal = user.lastName;
            source = 'PROFILE';
            confidence = user.lastName ? 95 : 0;
          } else {
            suggestedVal = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            source = 'PROFILE';
            confidence = user.firstName ? 95 : 0;
          }
        } else if (nameLower.includes('email')) {
          suggestedVal = user.email;
          source = 'PROFILE';
          confidence = 95;
        } else if (nameLower.includes('phone') || nameLower.includes('mobile')) {
          suggestedVal = profile.phone;
          source = 'PROFILE';
          confidence = profile.phone ? 95 : 0;
        } else if (nameLower.includes('linkedin')) {
          suggestedVal = profile.linkedinUrl;
          source = 'PROFILE';
          confidence = profile.linkedinUrl ? 95 : 0;
        } else if (nameLower.includes('github')) {
          suggestedVal = profile.githubUrl;
          source = 'PROFILE';
          confidence = profile.githubUrl ? 95 : 0;
        } else if (nameLower.includes('portfolio') || nameLower.includes('website')) {
          suggestedVal = profile.portfolioUrl;
          source = 'PROFILE';
          confidence = profile.portfolioUrl ? 95 : 0;
        } else if (nameLower.includes('gpa') || nameLower.includes('cgpa')) {
          suggestedVal = profile.cgpa?.toString() || null;
          source = 'PROFILE';
          confidence = profile.cgpa ? 95 : 0;
        } else if (nameLower.includes('grad') || nameLower.includes('year')) {
          suggestedVal = profile.graduationYear?.toString() || null;
          source = 'PROFILE';
          confidence = profile.graduationYear ? 95 : 0;
        } else if (nameLower.includes('college') || nameLower.includes('university') || nameLower.includes('school')) {
          suggestedVal = profile.university || profile.college;
          source = 'PROFILE';
          confidence = (profile.university || profile.college) ? 95 : 0;
        } else if (nameLower.includes('degree')) {
          suggestedVal = profile.degree;
          source = 'PROFILE';
          confidence = profile.degree ? 95 : 0;
        } else if (nameLower.includes('skill')) {
          suggestedVal = skillsList || null;
          source = 'PROFILE';
          confidence = skillsList ? 95 : 0;
        } else if (nameLower.includes('city') || nameLower.includes('location')) {
          suggestedVal = profile.city;
          source = 'PROFILE';
          confidence = profile.city ? 95 : 0;
        }

        // 3. Fallback to latest optimized resume content search
        if (!suggestedVal && resumeJson) {
          if (nameLower.includes('summary')) {
            suggestedVal = resumeJson.summary;
            source = 'RESUME';
            confidence = resumeJson.summary ? 80 : 0;
          }
        }
      }

      const createdField = await this.prisma.applicationAssistField.create({
        data: {
          sessionId,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          suggestedVal,
          confidence,
          status,
        },
      });

      suggestions.push({
        id: createdField.id,
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        suggestedVal,
        confidence,
        source,
        status,
      });
    }

    // Recommend the best resume version
    let recommendedResume: any = null;
    if (primaryResume && latestVersion) {
      recommendedResume = {
        documentId: primaryResume.id,
        versionId: latestVersion.id,
        name: primaryResume.name,
        versionName: latestVersion.versionName,
        reason: 'Most optimized general resume version matching your target profile.',
      };
    }

    // Build checklist & readiness status
    const checklist = {
      resumeSelected: primaryResume !== null,
      emailVerified: user.email !== null,
      phoneVerified: profile.phone !== null,
      skillsReviewed: user.userSkills.length > 0,
      workAuthManual: sensitiveKeys.some((sk) => fields.some((f) => f.fieldName.toLowerCase().includes(sk))),
    };

    // Calculate readiness score
    let checkedCount = 0;
    if (checklist.resumeSelected) checkedCount++;
    if (checklist.emailVerified) checkedCount++;
    if (checklist.phoneVerified) checkedCount++;
    if (checklist.skillsReviewed) checkedCount++;
    const readinessScore = Math.round((checkedCount / 4) * 100);

    // Save fieldsDetected status summary on session
    await this.prisma.applicationAssistSession.update({
      where: { id: sessionId },
      data: {
        fieldsDetected: suggestions as any,
        status: 'READY_FOR_REVIEW',
      },
    });

    return {
      sessionId,
      suggestions,
      recommendedResume,
      checklist,
      readinessScore,
    };
  }

  /**
   * AI Long-Answer Draft Generation
   */
  async fieldSuggestions(userId: string, sessionId: string, fieldId: string, questionText: string) {
    // 1. Enforce usage limits
    await this.entitlementService.enforceUsage(userId, BILLING_FEATURES.PORTFOLIO_AI);

    const session = await this.prisma.applicationAssistSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const field = await this.prisma.applicationAssistField.findFirst({
      where: { id: fieldId, sessionId },
    });
    if (!field) {
      throw new NotFoundException('Field not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userSkills: { include: { skill: true } },
      },
    });

    const profileText = user ? `Name: ${user.firstName} ${user.lastName}. College: ${user.profile?.college || ''}. CGPA: ${user.profile?.cgpa?.toString() || ''}. Skills: ${user.userSkills.map((s) => s.skill.name).join(', ')}.` : '';

    const result = await this.aiService.optimizePortfolioContent(
      userId,
      { question: questionText, draft: '' },
      { bio: profileText }
    );

    const draftText = result.suggestions?.[0]?.suggestedText || result.optimizedText || `I am highly motivated to contribute my skills in software engineering, having built projects at ${user?.profile?.college || 'my university'} and mastered technologies such as ${user?.userSkills.slice(0, 3).map((us) => us.skill.name).join(', ') || 'development'}.`;

    const draft = await this.prisma.applicationAssistDraft.create({
      data: {
        sessionId,
        questionText,
        draftText,
      },
    });

    // Update field suggestion
    await this.prisma.applicationAssistField.update({
      where: { id: fieldId },
      data: {
        suggestedVal: draftText,
        confidence: 90,
      },
    });

    return {
      draftId: draft.id,
      draftText,
    };
  }

  /**
   * Approves a single field suggestion
   */
  async approveField(userId: string, sessionId: string, fieldId: string, value: string) {
    const session = await this.prisma.applicationAssistSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.applicationAssistField.update({
      where: { id: fieldId },
      data: {
        approvedVal: value,
        status: 'APPROVED',
      },
    });
  }

  /**
   * Logs final fields filled in the DOM
   */
  async fillComplete(userId: string, sessionId: string, fieldsFilled: any) {
    const session = await this.prisma.applicationAssistSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.applicationAssistSession.update({
      where: { id: sessionId },
      data: {
        fieldsFilled: fieldsFilled,
        status: 'FILLED',
        completedAt: new Date(),
      },
    });
  }

  /**
   * submissionConfirmation: Updates session to USER_SUBMITTED and creates Application record
   */
  async submissionConfirmation(userId: string, sessionId: string, jobId?: string) {
    const session = await this.prisma.applicationAssistSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const targetJobId = jobId || session.jobId;

    await this.prisma.applicationAssistSession.update({
      where: { id: sessionId },
      data: {
        status: 'USER_SUBMITTED',
        completedAt: new Date(),
      },
    });

    if (targetJobId) {
      // Find or create Application
      const existing = await this.prisma.application.findFirst({
        where: { userId, jobId: targetJobId },
      });

      if (!existing) {
        return this.prisma.application.create({
          data: {
            userId,
            jobId: targetJobId,
            status: 'APPLIED',
            appliedAt: new Date(),
            notes: `Submitted via Application Assistant on ${session.domain}`,
          },
        });
      } else {
        return this.prisma.application.update({
          where: { id: existing.id },
          data: {
            status: 'APPLIED',
            appliedAt: new Date(),
            notes: `${existing.notes || ''}\nRe-applied/updated via Application Assistant on ${session.domain}`.trim(),
          },
        });
      }
    }

    return { message: 'Submission logged successfully' };
  }
}
