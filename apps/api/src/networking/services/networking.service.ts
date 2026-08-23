import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ContactPipelineState, RelationshipInteractionType } from '@prisma/client';

import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

export interface DateRange {
  start: Date;
  end: Date;
}

@Injectable()
export class NetworkingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
  ) {}

  // ── 1. CRUD OPERATIONS & CRM PIPELINE ──────────────────────────────────

  async createContact(userId: string, data: any) {
    const contact = await this.prisma.professionalContact.create({
      data: {
        userId,
        name: data.name,
        role: data.role,
        company: data.company,
        industry: data.industry,
        skills: data.skills || [],
        education: data.education,
        connectionSource: data.connectionSource,
        publicProfileUrl: data.publicProfileUrl,
        privateNotes: data.privateNotes,
        pipelineState: data.pipelineState || ContactPipelineState.DISCOVERED,
      },
    });

    await this.prisma.relationshipInteraction.create({
      data: {
        contactId: contact.id,
        type: RelationshipInteractionType.CONTACT_ADDED,
        description: `Contact added to networking profile: ${contact.name} (${contact.role} at ${contact.company || 'Unknown company'}).`,
      },
    });

    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'ContactAdded',
        source: 'NETWORKING',
        entityType: 'ProfessionalContact',
        entityId: contact.id,
        importance: 'INFO',
        metadata: { name: contact.name, company: contact.company },
      },
    });

    await this.prisma.careerAction.create({
      data: {
        userId,
        actionType: 'NETWORKING_PREPARATION',
        entityType: 'ProfessionalContact',
        entityId: contact.id,
        priority: 'MEDIUM',
        explanation: `Identify a warm target opportunity and define a clear networking goal for reaching out to ${contact.name}.`,
      },
    });

    return contact;
  }

  async getContacts(userId: string) {
    const contacts = await this.prisma.professionalContact.findMany({
      where: { userId },
      include: {
        interactions: { orderBy: { occurredAt: 'desc' } },
        networkingGoals: true,
        followUps: true,
      },
      orderBy: { name: 'asc' },
    });

    return Promise.all(
      contacts.map(async (c) => {
        const relevance = await this.calculateRelevance(userId, c);
        const recommendation = this.getRecommendation(c, relevance);
        return {
          ...c,
          relevance,
          recommendation,
        };
      }),
    );
  }

  async getContactById(userId: string, id: string) {
    const contact = await this.prisma.professionalContact.findFirst({
      where: { id, userId },
      include: {
        interactions: { orderBy: { occurredAt: 'desc' } },
        networkingGoals: true,
        followUps: true,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const relevance = await this.calculateRelevance(userId, contact);
    const recommendation = this.getRecommendation(contact, relevance);

    return {
      ...contact,
      relevance,
      recommendation,
    };
  }

  async updateContact(userId: string, id: string, data: any) {
    const contact = await this.prisma.professionalContact.findFirst({
      where: { id, userId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const updated = await this.prisma.professionalContact.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        company: data.company,
        industry: data.industry,
        skills: data.skills,
        education: data.education,
        connectionSource: data.connectionSource,
        publicProfileUrl: data.publicProfileUrl,
        privateNotes: data.privateNotes,
        pipelineState: data.pipelineState,
      },
    });

    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'ContactUpdated',
        source: 'NETWORKING',
        entityType: 'ProfessionalContact',
        entityId: updated.id,
        importance: 'INFO',
        metadata: { pipelineState: updated.pipelineState },
      },
    });

    return updated;
  }

  async deleteContact(userId: string, id: string) {
    const contact = await this.prisma.professionalContact.findFirst({
      where: { id, userId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }
    await this.prisma.professionalContact.delete({
      where: { id },
    });
    return { success: true };
  }

  // ── 2. CONTACT RELEVANCE SCORING ENGINE ────────────────────────────────

  private async calculateRelevance(userId: string, contact: any) {
    const explanations: string[] = [];
    let score = 0;

    const goals = await this.prisma.careerGoal.findMany({ where: { userId } });
    const targetRoles = goals.map((g) => g.targetRole.toLowerCase());
    const contactRole = contact.role.toLowerCase();

    const matchesRole = targetRoles.some(
      (tr) => contactRole.includes(tr) || tr.includes(contactRole),
    );
    if (matchesRole) {
      score += 30;
      explanations.push('Role aligns with your active Career Goals.');
    }

    const tracked = await this.prisma.trackedCompany.findMany({ where: { userId } });
    const trackedNames = tracked.map((tc) => tc.companyId.toLowerCase());
    const contactCompany = (contact.company || '').toLowerCase();

    const matchesCompany = trackedNames.some(
      (tn) => contactCompany.includes(tn) || tn.includes(contactCompany),
    );
    if (matchesCompany) {
      score += 25;
      explanations.push('Works at one of your Target tracked companies.');
    }

    const profile = await this.prisma.profile.findFirst({ where: { userId } });
    const userEdu = (profile?.university || profile?.college || '').toLowerCase();
    const contactEdu = (contact.education || '').toLowerCase();
    if (userEdu && contactEdu && (userEdu.includes(contactEdu) || contactEdu.includes(userEdu))) {
      score += 20;
      explanations.push('Shares a university alumni background.');
    }

    const saved = await this.prisma.savedJob.findMany({
      where: { userId },
      include: { job: true },
    });
    const savedCompanies = saved.map((sj) => (sj.job?.companyId || '').toLowerCase());
    if (savedCompanies.includes(contactCompany)) {
      score += 15;
      explanations.push('Works at a company where you have saved active job postings.');
    }

    let priority = 'EXPLORE';
    if (score >= 50) priority = 'HIGH PRIORITY';
    else if (score >= 30) priority = 'RELEVANT';

    return {
      score,
      priority,
      reasons: explanations,
    };
  }

  private getRecommendation(contact: any, relevance: any) {
    if (
      relevance.priority === 'HIGH PRIORITY' &&
      contact.pipelineState === ContactPipelineState.DISCOVERED
    ) {
      return {
        action: 'Reach out to learn about their current role.',
        reason: 'This connection is highly relevant to your career path.',
      };
    }
    if (contact.pipelineState === ContactPipelineState.FOLLOW_UP) {
      return {
        action: 'Follow up on your previous conversation.',
        reason: 'Keep this professional relationship active.',
      };
    }
    return {
      action: 'Maintain conversation and build context.',
      reason: 'Great connection for general networking.',
    };
  }

  // ── 3. REFERRAL READINESS EVALUATOR ────────────────────────────────────

  async evaluateReferralReadiness(userId: string, contactId: string, opportunityId: string) {
    const contact = await this.getContactById(userId, contactId);
    const job = await this.prisma.jobPosting.findUnique({ where: { id: opportunityId } });
    if (!job) {
      throw new NotFoundException('Opportunity not found');
    }

    const checklist = {
      resumeReady: false,
      portfolioReady: false,
      relationshipBuilt: false,
      roleAlignment: false,
    };

    const resume = await this.prisma.resume.findFirst({ where: { userId } });
    if (resume) {
      checklist.resumeReady = true;
    }

    const countProjects = await this.prisma.projectAnalysis.count({
      where: { userId },
    });
    if (countProjects > 0) {
      checklist.portfolioReady = true;
    }

    const contactCompany = (contact.company || '').toLowerCase();
    const jobCompany = (job.companyId || '').toLowerCase();
    if (
      contactCompany &&
      jobCompany &&
      (contactCompany.includes(jobCompany) || jobCompany.includes(contactCompany))
    ) {
      checklist.roleAlignment = true;
    }

    const interactionCount = await this.prisma.relationshipInteraction.count({
      where: {
        contactId,
        type: {
          in: [
            RelationshipInteractionType.OUTREACH_SENT,
            RelationshipInteractionType.CONVERSATION_NOTE,
            RelationshipInteractionType.ADVICE_RECEIVED,
          ],
        },
      },
    });
    if (interactionCount >= 2) {
      checklist.relationshipBuilt = true;
    }

    let status = 'NOT READY';
    let recommendation =
      'Before requesting a referral, consider introducing yourself and scheduling a role-focused advice conversation.';

    if (checklist.resumeReady && checklist.portfolioReady && checklist.relationshipBuilt) {
      status = 'POSSIBLE REFERRAL REQUEST';
      recommendation =
        'You have established sufficient professional context. You may consider drafting a respectful referral consideration message.';
    } else if (checklist.relationshipBuilt) {
      status = 'PREPARE FIRST';
      recommendation =
        'You have a good relationship base. Please finalize highlighting your portfolio evidence and custom resumes first.';
    } else if (checklist.resumeReady && checklist.portfolioReady) {
      status = 'RELATIONSHIP DEVELOPING';
      recommendation =
        'Your documents are ready, but you need to initiate conversations and exchange professional advice first.';
    }

    return {
      status,
      checklist,
      recommendation,
    };
  }

  // ── 4. PERSONALIZED AI OUTREACH DRAFTING ───────────────────────────────

  async generateOutreach(userId: string, data: any) {
    const contact = await this.getContactById(userId, data.contactId);

    let projectContext = '';
    if (data.projectId) {
      const selection = await this.prisma.projectAnalysis.findFirst({
        where: { id: data.projectId },
      });
      if (selection) {
        projectContext = `I completed a project: ${selection.explanation || ''}.`;
      }
    }

    const alumniText = contact.education ? `Both graduated/attended ${contact.education}.` : '';

    const systemPrompt = `You are a professional networking writing assistant.
You draft highly personalized, short, respectful outreach messages.
STRICT RULES:
1. NEVER invent mutual connections or say "I was referred by [Name]" unless explicitly told.
2. NEVER say "I have followed your work for years" or fabricate fake flattery.
3. Keep all claims completely grounded in the provided factual context.
4. If drafting a referral request, make it polite, brief, and extremely easy for them to decline without guilt.`;

    const userPrompt = `Draft a personalized outreach message for:
Contact Name: ${contact.name}
Role: ${contact.role} at ${contact.company || 'their company'}
My Networking Goal: ${data.goal}
Tone: ${data.tone || 'Professional'}
Alumni context: ${alumniText}
Project evidence context: ${projectContext}

Generate:
- Recommended strategy
- A short message version (LinkedIn limit, under 300 chars)
- A detailed message version (Email format)
- Fact references used.

Return a JSON object:
{
  "goal": "${data.goal}",
  "recommendedApproach": "Approach details.",
  "draftShort": "Short draft.",
  "draftDetailed": "Email draft.",
  "factsReferenced": ["Fact A"],
  "riskFlags": [],
  "suggestedNextStep": "Mark as outreach sent."
}`;

    const jsonSchema = {
      type: 'object',
      properties: {
        goal: { type: 'string' },
        recommendedApproach: { type: 'string' },
        draftShort: { type: 'string' },
        draftDetailed: { type: 'string' },
        factsReferenced: { type: 'array', items: { type: 'string' } },
        riskFlags: { type: 'array', items: { type: 'string' } },
        suggestedNextStep: { type: 'string' },
      },
      required: [
        'goal',
        'recommendedApproach',
        'draftShort',
        'draftDetailed',
        'factsReferenced',
        'riskFlags',
        'suggestedNextStep',
      ],
    };

    let result;
    try {
      result = await this.aiProvider.generateStructuredOutput<any>(
        userPrompt,
        jsonSchema,
        systemPrompt,
      );

      const textToCheck = (result.draftShort + ' ' + result.draftDetailed).toLowerCase();
      const forbiddenClaims = [
        'referred by',
        'mutual friend',
        'followed your career for years',
        'long time follower',
      ];
      const flagged = forbiddenClaims.filter((c) => textToCheck.includes(c));

      if (flagged.length > 0) {
        result.riskFlags.push(
          'Contains potential fabricated flattery or ungrounded relation references.',
        );
      }
    } catch (err) {
      result = this.getFallbackTemplate(data.goal, contact, projectContext);
    }

    await this.prisma.outreachDraft.create({
      data: {
        contactId: contact.id,
        userId,
        goal: data.goal,
        subject: `Re: ${data.goal} insight request`,
        body: result.draftDetailed,
        factsReferenced: result.factsReferenced,
        qualityScore: result.riskFlags.length === 0 ? 95 : 60,
        feedback: result.riskFlags.join(', ') || 'Draft matches professional guidelines.',
      },
    });

    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'OutreachDraftGenerated',
        source: 'NETWORKING',
        entityType: 'ProfessionalContact',
        entityId: contact.id,
        importance: 'INFO',
      },
    });

    return result;
  }

  private getFallbackTemplate(goal: string, contact: any, projectContext: string) {
    const baseProject = projectContext
      ? `\n\nI have been working on building portfolio proof points: ${projectContext}`
      : '';
    return {
      goal,
      recommendedApproach:
        'Deterministic fallback template activated due to AI generator unavailability.',
      draftShort: `Hi ${contact.name}, I noticed your role as ${contact.role} at ${contact.company || 'your company'}. I'm exploring paths in this area and would love to exchange advice briefly.`,
      draftDetailed: `Subject: Career guidance request\n\nHi ${contact.name},\n\nHope you are doing well.\n\nI came across your profile and noticed your inspiring journey as ${contact.role} at ${contact.company || 'your company'}.${baseProject}\n\nI would greatly appreciate 10 minutes of your advice on the skills and milestones that are most critical in your field. Thank you for your time.\n\nBest,\n[Your Name]`,
      factsReferenced: [contact.name, contact.role, contact.company].filter(Boolean),
      riskFlags: ['Deterministic fallback template active.'],
      suggestedNextStep: 'Send outreach message independently.',
    };
  }

  // ── 5. TIMELINE & INTERACTION LOGGING ──────────────────────────────────

  async addInteraction(userId: string, data: any) {
    const contact = await this.getContactById(userId, data.contactId);
    const interaction = await this.prisma.relationshipInteraction.create({
      data: {
        contactId: data.contactId,
        type: data.type,
        description: data.description,
      },
    });

    let nextState = contact.pipelineState;
    if (data.type === RelationshipInteractionType.OUTREACH_SENT) {
      nextState = ContactPipelineState.CONTACTED;
    } else if (data.type === RelationshipInteractionType.ADVICE_RECEIVED) {
      nextState = ContactPipelineState.CONVERSATION_ACTIVE;
    } else if (data.type === RelationshipInteractionType.REFERRAL_DISCUSSED) {
      nextState = ContactPipelineState.REFERRAL_DISCUSSED;
    }

    await this.prisma.professionalContact.update({
      where: { id: contact.id },
      data: { pipelineState: nextState },
    });

    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'InteractionRecorded',
        source: 'NETWORKING',
        entityType: 'ProfessionalContact',
        entityId: contact.id,
        importance: 'INFO',
        metadata: { type: data.type },
      },
    });

    if (data.type === RelationshipInteractionType.OUTREACH_SENT) {
      await this.prisma.careerAction.create({
        data: {
          userId,
          actionType: 'NETWORKING_FOLLOW_UP',
          entityType: 'ProfessionalContact',
          entityId: contact.id,
          priority: 'LOW',
          explanation: `Check response status for outreach sent to ${contact.name} and follow up if appropriate.`,
        },
      });
    }

    return interaction;
  }

  // ── 6. FOLLOW-UP TIMING & REMINDERS ───────────────────────────────────

  async getFollowUps(userId: string) {
    const contacts = await this.prisma.professionalContact.findMany({
      where: { userId },
      include: {
        interactions: { orderBy: { occurredAt: 'desc' } },
        networkingGoals: true,
      },
    });

    const recommendations = [];

    for (const c of contacts) {
      const lastInt = c.interactions[0];
      if (!lastInt) continue;

      const diffDays = Math.round(
        (new Date().getTime() - lastInt.occurredAt.getTime()) / (1000 * 24 * 60 * 60),
      );

      if (lastInt.type === RelationshipInteractionType.OUTREACH_SENT && diffDays >= 5) {
        recommendations.push({
          contactId: c.id,
          name: c.name,
          role: c.role,
          company: c.company,
          lastInteractionType: 'Outreach Sent',
          lastInteractionDate: lastInt.occurredAt,
          daysElapsed: diffDays,
          recommendation:
            'Your outreach has not received a response yet. You may choose to wait or send a short polite follow-up.',
          actionable: true,
        });
      } else if (lastInt.type === RelationshipInteractionType.ADVICE_RECEIVED && diffDays >= 20) {
        recommendations.push({
          contactId: c.id,
          name: c.name,
          role: c.role,
          company: c.company,
          lastInteractionType: 'Advice Received',
          lastInteractionDate: lastInt.occurredAt,
          daysElapsed: diffDays,
          recommendation:
            'Consider sending a short update on how their advice/referral tips helped you progress.',
          actionable: true,
        });
      }
    }

    return recommendations;
  }
}
