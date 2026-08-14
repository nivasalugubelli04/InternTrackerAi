import { Injectable, ForbiddenException } from '@nestjs/common';
import { AiService } from '../../ai/services/ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BILLING_FEATURES, EntitlementService } from '../../billing/services/entitlement.service';

/**
 * IMPORTANT SAFETY CONTRACT:
 * - Only passes approved recruiter-visible candidate data to the LLM.
 * - NEVER sends private AI conversations, application notes, or contact details.
 * - AI CANNOT make autonomous hiring or rejection decisions.
 * - All AI outputs are advisory and must be reviewed by the recruiter.
 */
@Injectable()
export class RecruiterAiService {
  constructor(
    private readonly ai: AiService,
    private readonly prisma: PrismaService,
    private readonly entitlement: EntitlementService,
  ) {}

  private async callAi(prompt: string, userId: string): Promise<string> {
    const result = await this.ai.generateCompletion({ prompt, userId, useCache: false });
    return result?.text ?? '';
  }

  /**
   * Summarize a candidate's recruiter-visible profile.
   * Only uses approved public fields — never private AI conversations,
   * application notes, or contact details.
   */
  async summarizeCandidateProfile(
    recruiterUserId: string,
    candidateId: string,
  ) {
    await this.entitlement.canUse(recruiterUserId, BILLING_FEATURES.AI_CHAT, true);

    // Fetch only safe fields — note Profile uses city/state/country not location
    const candidate = await this.prisma.user.findUnique({
      where: { id: candidateId },
      select: {
        firstName: true,
        lastName: true,
        profile: {
          select: {
            headline: true,
            bio: true,
            city: true,
            country: true,
            college: true,
            degree: true,
            graduationYear: true,
          },
        },
        userSkills: {
          select: {
            skill: { select: { name: true } },
            proficiency: true,
          },
        },
        careerPreference: {
          select: { preferredRoles: true, preferredLocations: true },
        },
        discoverabilitySettings: {
          select: { profileVisible: true, discoverabilityLevel: true },
        },
      },
    });

    if (!candidate || !candidate.discoverabilitySettings?.profileVisible) {
      throw new ForbiddenException('Candidate profile not visible or not consented');
    }

    const safeInput = {
      name: `${candidate.firstName ?? ''} ${candidate.lastName ?? ''}`.trim(),
      headline: candidate.profile?.headline ?? '',
      bio: candidate.profile?.bio ?? '',
      location: [candidate.profile?.city, candidate.profile?.country].filter(Boolean).join(', '),
      degree: candidate.profile?.degree ?? '',
      college: candidate.profile?.college ?? '',
      graduationYear: candidate.profile?.graduationYear ?? '',
      skills: candidate.userSkills.map((s) => s.skill.name),
      careerInterests: candidate.careerPreference?.preferredRoles ?? [],
    };

    const prompt = `You are an AI assistant helping a recruiter understand a candidate's profile.
Summarize the following recruiter-visible candidate information in 3-4 sentences. 
Do NOT make assumptions about qualifications not listed. Do NOT add attributes not present in the data.
Do NOT make any hiring recommendation.

Candidate Profile:
- Name: ${safeInput.name}
- Headline: ${safeInput.headline}
- Bio: ${safeInput.bio}
- Location: ${safeInput.location}
- Education: ${safeInput.degree} at ${safeInput.college} (${safeInput.graduationYear})
- Skills: ${safeInput.skills.join(', ')}
- Career Interests: ${safeInput.careerInterests.join(', ')}

Provide a neutral, factual summary based only on the information above.`;

    const summary = await this.callAi(prompt, recruiterUserId);
    await this.entitlement.enforceUsage(recruiterUserId, BILLING_FEATURES.AI_CHAT);
    return { summary, disclaimer: 'AI-generated summary. Always verify with original profile.' };
  }

  /**
   * Generate interview questions for a specific job-candidate match.
   * Based only on job requirements and candidate's public skill list.
   * Does NOT make hiring decisions.
   */
  async generateInterviewQuestions(
    recruiterUserId: string,
    jobId: string,
    candidateId: string,
  ) {
    await this.entitlement.canUse(recruiterUserId, BILLING_FEATURES.AI_CHAT, true);

    const [job, candidate] = await Promise.all([
      this.prisma.jobPosting.findUnique({
        where: { id: jobId },
        select: { title: true, requirements: true, description: true },
      }),
      this.prisma.user.findUnique({
        where: { id: candidateId },
        select: {
          userSkills: { select: { skill: { select: { name: true } }, proficiency: true } },
          discoverabilitySettings: { select: { profileVisible: true } },
        },
      }),
    ]);

    if (!job) throw new ForbiddenException('Job not found');
    if (!candidate?.discoverabilitySettings?.profileVisible) {
      throw new ForbiddenException('Candidate profile not visible');
    }

    const skills = candidate.userSkills.map((s) => s.skill.name).join(', ');

    const prompt = `Generate 5 relevant technical interview questions for a "${job.title}" role.
Job requirements: ${job.requirements.slice(0, 5).join('; ')}.
Candidate skills listed: ${skills}.

Instructions:
- Questions must assess technical and role-specific competency.
- Do NOT ask questions about personal characteristics, demographics, or protected attributes.
- Focus only on verifiable skills and experience.
- Format as a numbered list.`;

    const questions = await this.callAi(prompt, recruiterUserId);
    await this.entitlement.enforceUsage(recruiterUserId, BILLING_FEATURES.AI_CHAT);
    return {
      questions,
      disclaimer: 'AI-generated questions for reference only. Review before use in interviews.',
    };
  }

  /**
   * Draft a personalized recruiter outreach message.
   * Uses only role-visible candidate data.
   */
  async draftRecruiterMessage(
    recruiterUserId: string,
    candidateId: string,
    jobId: string,
    recruiterName: string,
    orgName: string,
  ) {
    await this.entitlement.canUse(recruiterUserId, BILLING_FEATURES.AI_CHAT, true);

    const [job, candidate] = await Promise.all([
      this.prisma.jobPosting.findUnique({
        where: { id: jobId },
        select: { title: true, location: true, workMode: true },
      }),
      this.prisma.user.findUnique({
        where: { id: candidateId },
        select: {
          firstName: true,
          profile: { select: { headline: true } },
          discoverabilitySettings: { select: { contactPermitted: true } },
        },
      }),
    ]);

    if (!job) throw new ForbiddenException('Job not found');
    if (!candidate?.discoverabilitySettings?.contactPermitted) {
      throw new ForbiddenException('Candidate has not permitted contact');
    }

    const prompt = `Write a professional, personalized recruiter outreach message (max 200 words).
Recruiter: ${recruiterName} at ${orgName}
Job: ${job.title} (${job.workMode ?? 'unspecified'}, ${job.location ?? 'location flexible'})
Candidate first name: ${candidate.firstName ?? 'there'}
Candidate headline: ${candidate.profile?.headline ?? ''}

Instructions:
- Be concise and professional.
- Do NOT make promises about compensation, immigration sponsorship, or guarantees.
- Do NOT pressure or be aggressive.
- Include a clear call to action (reply to discuss the role).`;

    const draft = await this.callAi(prompt, recruiterUserId);
    await this.entitlement.enforceUsage(recruiterUserId, BILLING_FEATURES.AI_CHAT);
    return {
      draft,
      disclaimer: 'AI-generated draft. Review and personalize before sending.',
    };
  }

  /**
   * Improve a job description using AI.
   * Recruiter MUST review all changes before publishing.
   */
  async improveJobDescription(
    recruiterUserId: string,
    jobId: string,
    recruiterOrgId: string,
  ) {
    await this.entitlement.canUse(recruiterUserId, BILLING_FEATURES.AI_CHAT, true);

    const job = await this.prisma.jobPosting.findFirst({
      where: { id: jobId, recruiterOrgId },
    });
    if (!job) throw new ForbiddenException('Job not found or access denied');

    const prompt = `You are a job description expert. Improve the following internship/job description for clarity, completeness, and candidate appeal.

Title: ${job.title}
Description: ${job.description?.slice(0, 2000) ?? ''}
Requirements: ${job.requirements.slice(0, 10).join('; ')}
Responsibilities: ${job.responsibilities.slice(0, 10).join('; ')}

Return:
1. Improved description (max 400 words)
2. List of missing information the recruiter should add
3. Suggested improvements to requirements section

Note: Do NOT fabricate role details or add requirements not mentioned.`;

    const improvement = await this.callAi(prompt, recruiterUserId);
    await this.entitlement.enforceUsage(recruiterUserId, BILLING_FEATURES.AI_CHAT);
    return {
      improvement,
      disclaimer:
        'AI suggestions require recruiter review and approval before any changes are published.',
    };
  }

  /**
   * Explain why a candidate matches a specific job.
   * Based only on job requirements and candidate's public skills.
   * AI provides explainability ONLY — never makes hiring decisions.
   */
  async explainCandidateJobMatch(
    recruiterUserId: string,
    candidateId: string,
    jobId: string,
  ) {
    await this.entitlement.canUse(recruiterUserId, BILLING_FEATURES.AI_CHAT, true);

    const [job, candidate] = await Promise.all([
      this.prisma.jobPosting.findUnique({
        where: { id: jobId },
        select: { title: true, requirements: true, location: true, workMode: true },
      }),
      this.prisma.user.findUnique({
        where: { id: candidateId },
        select: {
          userSkills: { select: { skill: { select: { name: true } } } },
          profile: { select: { city: true, country: true, degree: true } },
          careerPreference: { select: { preferredRoles: true, preferredLocations: true } },
          discoverabilitySettings: { select: { profileVisible: true } },
        },
      }),
    ]);

    if (!job) throw new ForbiddenException('Job not found');
    if (!candidate?.discoverabilitySettings?.profileVisible)
      throw new ForbiddenException('Candidate profile not visible');

    const candidateSkills = candidate.userSkills.map((s: any) => s.skill.name);
    const jobRequirements = job.requirements;

    const matchedSkills = candidateSkills.filter((sk: string) =>
      jobRequirements.some((r) => r.toLowerCase().includes(sk.toLowerCase())),
    );

    const location = [candidate.profile?.city, candidate.profile?.country]
      .filter(Boolean)
      .join(', ');

    const prompt = `Explain why a candidate may be a good match for a "${job.title}" role.

Job requirements: ${jobRequirements.slice(0, 8).join('; ')}
Job location: ${job.location ?? 'flexible'}
Job work mode: ${job.workMode ?? 'unspecified'}

Candidate skills: ${candidateSkills.join(', ')}
Candidate degree: ${candidate.profile?.degree ?? 'unknown'}
Candidate location: ${location || 'unknown'}
Preferred roles: ${candidate.careerPreference?.preferredRoles?.join(', ') ?? 'unknown'}
Matched skills: ${matchedSkills.join(', ')}

Provide:
1. Skill overlap explanation
2. Role relevance explanation
3. Location/work mode compatibility note

IMPORTANT: This is AI explainability only. Not a hiring recommendation.
Do NOT invent any qualifications not listed.`;

    const explanation = await this.callAi(prompt, recruiterUserId);
    await this.entitlement.enforceUsage(recruiterUserId, BILLING_FEATURES.AI_CHAT);

    return {
      explanation,
      matchedSkills,
      disclaimer:
        'AI explainability output. Based solely on approved candidate data. Not a hiring decision.',
    };
  }
}
