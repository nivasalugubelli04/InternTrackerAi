import { Injectable, Inject, NotFoundException } from '@nestjs/common';

import { AIProvider, AI_PROVIDER_TOKEN } from '../../ai/providers/ai-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

import { TalentIntelligenceService } from './talent-intelligence.service';

@Injectable()
export class CareerRecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly talentIntelligenceService: TalentIntelligenceService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: AIProvider,
  ) {}

  /**
   * Generates a personalized career recommendation with a confidence score
   * and evidence-based AI explanation.
   */
  async generateRecommendation(userId: string, targetRoleId: string) {
    // 1. Get user profile and target role
    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          userSkills: { include: { skill: true } },
        },
      }),
      this.prisma.role.findUnique({
        where: { id: targetRoleId },
        include: { roleSkills: { include: { skill: true } } },
      }),
    ]);

    if (!user) throw new NotFoundException(`User ${userId} not found.`);
    if (!role) throw new NotFoundException(`Role ${targetRoleId} not found.`);

    const userSkillIds = new Set(user.userSkills.map((us) => us.skillId));
    const roleSkills = role.roleSkills;
    const requiredSkills = roleSkills.filter((rs) => rs.requirement === 'REQUIRED');

    // 2. Compute confidence score methodology
    let confidence = 'INSUFFICIENT_DATA';
    let overlapCount = 0;

    for (const rs of requiredSkills) {
      if (userSkillIds.has(rs.skillId)) {
        overlapCount++;
      }
    }

    if (user.userSkills.length === 0) {
      confidence = 'INSUFFICIENT_DATA';
    } else if (requiredSkills.length === 0) {
      confidence = 'HIGH'; // No required skills defined
    } else {
      const coverage = overlapCount / requiredSkills.length;
      if (coverage >= 0.7) {
        confidence = 'HIGH';
      } else if (coverage >= 0.3) {
        confidence = 'MEDIUM';
      } else {
        confidence = 'LOW';
      }
    }

    // 3. Resolve transferable skills & next best skills
    const transferable = await this.talentIntelligenceService.identifyTransferableSkills(
      userId,
      targetRoleId,
    );
    const nextSkills = await this.talentIntelligenceService.recommendNextBestSkills(
      userId,
      targetRoleId,
    );

    // 4. Construct Structured Intelligence details for the LLM prompt
    const userSkillsText = user.userSkills.map((us) => us.skill.name).join(', ') || 'None';
    const roleSkillsText =
      roleSkills.map((rs) => `${rs.skill.name} (${rs.requirement})`).join(', ') || 'None';
    const transferableText =
      transferable.map((t) => `${t.userSkillName} -> ${t.targetSkillName}`).join(', ') || 'None';
    const nextSkillsText =
      nextSkills.map((n) => `${n.skillName} (${n.priority})`).join(', ') || 'None';

    const systemPrompt = `You are a Principal AI Career Assistant.
You must construct a career transition summary and recommended next steps using ONLY the provided structured inputs.
Do NOT invent market statistics, promise promotions/employment, or claim automatic proficiency.
Use association-only language (e.g., "Candidates who possess X showed a higher likelihood of Y").
Keep the response extremely concise: a short summary of up to 100 words and 3 clear next steps.`;

    const userPrompt = `Generate a career transition plan based on:
- Candidate Current Skills: ${userSkillsText}
- Target Role Name: ${role.name}
- Target Role Skills: ${roleSkillsText}
- Transferable Skills Mapping: ${transferableText}
- Next Recommended Skills to Learn: ${nextSkillsText}
- Current Assessment Confidence: ${confidence}

Provide the output in JSON format with two fields:
{
  "summary": "...",
  "nextSteps": ["...", "...", "..."]
}`;

    // 5. Generate AI summary
    let explanationText = '{"summary": "Insufficient profile data to evaluate.", "nextSteps": []}';
    try {
      const aiResult = await this.aiProvider.generateText(userPrompt, systemPrompt);
      if (aiResult?.text) {
        explanationText = aiResult.text;
      }
    } catch (e) {
      // fallback
      explanationText = JSON.stringify({
        summary: `Candidates targeting a ${role.name} role usually build on a foundation of ${roleSkillsText}.`,
        nextSteps: nextSkills
          .slice(0, 3)
          .map((n) => `Learn ${n.skillName} (${n.priority} Priority)`),
      });
    }

    let parsedExplanation: any;
    try {
      parsedExplanation = JSON.parse(explanationText);
    } catch {
      // If AI didn't return strict JSON, wrap it
      parsedExplanation = {
        summary: explanationText,
        nextSteps: nextSkills
          .slice(0, 3)
          .map((n) => `Learn ${n.skillName} (${n.priority} Priority)`),
      };
    }

    // 6. Save recommendation in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

    return this.prisma.careerRecommendation.create({
      data: {
        userId,
        targetRoleId,
        targetRoleName: role.name,
        confidence,
        score: requiredSkills.length > 0 ? (overlapCount / requiredSkills.length) * 100 : 100.0,
        explanationJson: parsedExplanation,
        expiresAt,
      },
    });
  }

  /**
   * Retrieves previous career recommendations for a user.
   */
  async getRecommendations(userId: string) {
    return this.prisma.careerRecommendation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
