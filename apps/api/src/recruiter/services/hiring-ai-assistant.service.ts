import { Injectable, NotFoundException } from '@nestjs/common';
import { AiService } from '../../ai/services/ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InterviewFeedbackService } from './interview-feedback.service';

@Injectable()
export class HiringAiAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly feedbackService: InterviewFeedbackService,
  ) {}

  /**
   * Generates AI summary of authorized interviewer feedback.
   * STRICT SAFETY RULE: AI must NOT declare "Candidate should definitely be hired/rejected".
   * Output: Strengths, Concerns, Common themes, Areas for further evaluation, Suggested next-step questions.
   */
  async generateInterviewSummary(userId: string, interviewId: string, recruiterOrgId: string) {
    const summaryData = await this.feedbackService.getAggregatedFeedback(interviewId, recruiterOrgId);

    if (summaryData.totalFeedback === 0) {
      throw new NotFoundException('No feedback available to summarize');
    }

    const feedbackTexts = summaryData.feedbacks
      .map(
        (f, idx) =>
          `Interviewer ${idx + 1} (${f.recommendation}, Score ${f.rating}/5):\n` +
          `Strengths: ${f.strengths || 'None specified'}\n` +
          `Concerns: ${f.concerns || 'None specified'}\n` +
          `Technical: ${f.technicalAssessment || 'N/A'}\n` +
          `Communication: ${f.communicationAssessment || 'N/A'}`,
      )
      .join('\n\n');

    const prompt = `
      Act as an objective hiring copilot for recruiters.
      Summarize the following panel interview feedback for a candidate:
      ${feedbackTexts}

      Consensus: ${summaryData.consensus}
      Average Score: ${summaryData.averageRating}/5

      Format your response strictly into JSON with keys:
      - strengths: array of string
      - concerns: array of string
      - commonThemes: array of string
      - areasForFurtherEvaluation: array of string
      - suggestedNextStepQuestions: array of string
      - summaryNote: objective summary statement

      CRITICAL MANDATE:
      Do NOT state "Candidate should be hired" or "Candidate should be rejected".
      Remain strictly advisory and neutral, highlighting evidence and factual interviewer observations.
    `;

    const aiRes = await this.aiService.generateCompletion({
      prompt,
      userId,
      useCache: false,
    });

    let resultJson: any = {};
    try {
      const cleanText = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
      resultJson = JSON.parse(cleanText);
    } catch (e) {
      resultJson = {
        strengths: summaryData.strengths,
        concerns: summaryData.concerns,
        summaryNote: aiRes.text,
      };
    }

    return resultJson;
  }

  /**
   * Generates role-tailored interview questions.
   */
  async generateInterviewQuestions(
    userId: string,
    jobTitle: string,
    jobDescription?: string,
    candidateSkills?: string[],
  ) {
    const prompt = `
      Generate role-tailored interview questions for a candidate applying for "${jobTitle}".
      Job Description Context: ${jobDescription || 'N/A'}
      Candidate Skills: ${(candidateSkills || []).join(', ') || 'N/A'}

      Provide 5 questions divided into:
      - 2 Technical Questions
      - 2 Role-Specific Questions
      - 1 Behavioral Question

      Format your response as a JSON array of objects with keys:
      "category", "question", "evaluationCriteria", "difficulty".
      Do not invent candidate background details not provided.
    `;

    const aiRes = await this.aiService.generateCompletion({
      prompt,
      userId,
      useCache: true,
    });

    let questions: any[] = [];
    try {
      const cleanText = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
      questions = JSON.parse(cleanText);
    } catch (e) {
      questions = [
        { category: 'Technical', question: aiRes.text, evaluationCriteria: 'Technical accuracy', difficulty: 'MEDIUM' },
      ];
    }

    return questions;
  }

  /**
   * Advisory evaluation assistance comparison for candidate vs job requirements.
   */
  async evaluateCandidateJobFit(userId: string, candidateId: string, jobId: string) {
    const [candidate, job] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: candidateId },
        include: { profile: true, userSkills: { include: { skill: true } } },
      }),
      this.prisma.jobPosting.findUnique({
        where: { id: jobId },
      }),
    ]);

    if (!candidate || !job) throw new NotFoundException('Candidate or Job not found');

    const skills = candidate.userSkills.map((s) => s.skill.name).join(', ');
    const profile = candidate.profile as any;
    const prompt = `
      Compare candidate skills and profile against job requirements:
      Candidate Skills: ${skills}
      Headline: ${profile?.headline || 'N/A'}
      Bio: ${profile?.bio || 'N/A'}

      Job Title: ${job.title}
      Requirements: ${(job.requirements || []).join('; ')}
      Description: ${job.description || ''}

      Provide an objective comparison outlining:
      - Matched skills
      - Missing or potential skill gaps
      - Recommended interview focus areas

      Format response as JSON with keys: "matchedSkills", "skillGaps", "recommendedFocusAreas".
    `;

    const aiRes = await this.aiService.generateCompletion({
      prompt,
      userId,
      useCache: true,
    });

    try {
      const cleanText = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (e) {
      return { rawEvaluation: aiRes.text };
    }
  }
}
