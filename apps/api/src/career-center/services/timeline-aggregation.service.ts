import { Injectable } from '@nestjs/common';
import { HiringInterviewStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface TimelineEvent {
  id: string;
  eventType: string;
  category: string;
  timestamp: Date;
  title: string;
  description: string;
  metadata?: any;
}

@Injectable()
export class TimelineAggregationService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregateTimeline(userId: string, categories?: string[]): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    const activeCategories =
      categories && categories.length > 0
        ? categories
        : ['applications', 'learning', 'interviews', 'skills', 'opportunities', 'ai', 'milestones'];

    const promises: Promise<any>[] = [];

    // 1. Profile Completed (milestones)
    if (activeCategories.includes('milestones')) {
      promises.push(
        this.prisma.profile
          .findUnique({
            where: { userId },
            select: { id: true, onboardingCompletedAt: true, degree: true, college: true },
          })
          .then((profile) => {
            if (profile?.onboardingCompletedAt) {
              events.push({
                id: `profile-complete-${profile.id}`,
                eventType: 'PROFILE_COMPLETED',
                category: 'milestones',
                timestamp: profile.onboardingCompletedAt,
                title: 'Onboarding Completed',
                description: `Completed onboarding for ${profile.degree || 'your target degree'} at ${profile.college || 'your university'}.`,
              });
            }
          }),
      );
    }

    // 2. Career Goal Updated (milestones)
    if (activeCategories.includes('milestones')) {
      promises.push(
        this.prisma.careerGoal
          .findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take: 10,
          })
          .then((goals) => {
            goals.forEach((g) => {
              events.push({
                id: `goal-update-${g.id}`,
                eventType: 'GOAL_UPDATED',
                category: 'milestones',
                timestamp: g.updatedAt,
                title: 'Career Goal Updated',
                description: `Set target role to "${g.targetRole}"${g.targetCompany ? ` at ${g.targetCompany}` : ''}.`,
                metadata: { targetRole: g.targetRole, targetCompany: g.targetCompany },
              });
            });
          }),
      );
    }

    // 3. Offer Received (milestones)
    if (activeCategories.includes('milestones')) {
      promises.push(
        this.prisma.offer
          .findMany({
            where: { candidateId: userId },
            include: { job: { include: { company: true } } },
          })
          .then((offers) => {
            offers.forEach((o) => {
              events.push({
                id: `offer-received-${o.id}`,
                eventType: 'OFFER_RECEIVED',
                category: 'milestones',
                timestamp: o.createdAt,
                title: 'Job Offer Received!',
                description: `Received offer for "${o.title}" from ${o.job.company.name}.`,
                metadata: { offerId: o.id, company: o.job.company.name, stipend: o.stipend },
              });
            });
          }),
      );
    }

    // 4. Skills Added (skills)
    if (activeCategories.includes('skills')) {
      promises.push(
        this.prisma.userSkill
          .findMany({
            where: { userId },
            include: { skill: true },
          })
          .then((userSkills) => {
            userSkills.forEach((us) => {
              events.push({
                id: `skill-added-${us.skillId}`,
                eventType: 'SKILL_ADDED',
                category: 'skills',
                timestamp: us.addedAt,
                title: `Added Skill: ${us.skill.name}`,
                description: `Registered "${us.skill.name}" proficiency level as ${us.proficiency}.`,
                metadata: { skillName: us.skill.name, proficiency: us.proficiency },
              });
            });
          }),
      );
    }

    // 5. Learning Milestones (learning)
    if (activeCategories.includes('learning')) {
      promises.push(
        this.prisma.learningEnrollment
          .findMany({
            where: { userId, status: 'COMPLETED' },
            include: { module: true },
          })
          .then((enrollments) => {
            enrollments.forEach((e) => {
              if (e.completedAt) {
                events.push({
                  id: `learning-milestone-${e.id}`,
                  eventType: 'LEARNING_MILESTONE',
                  category: 'learning',
                  timestamp: e.completedAt,
                  title: 'Learning Module Completed',
                  description: `Successfully finished learning module "${e.module.title}".`,
                  metadata: { moduleId: e.moduleId, title: e.module.title },
                });
              }
            });
          }),
      );
    }

    // 6. Opportunities Discovered (opportunities)
    if (activeCategories.includes('opportunities')) {
      promises.push(
        this.prisma.recommendation
          .findMany({
            where: { userId, isSaved: true },
            include: { job: { include: { company: true } } },
          })
          .then((recs) => {
            recs.forEach((r) => {
              events.push({
                id: `opportunity-discovered-${r.id}`,
                eventType: 'OPPORTUNITY_DISCOVERED',
                category: 'opportunities',
                timestamp: r.createdAt,
                title: 'Saved Internship Recommendation',
                description: `Saved match for "${r.job.title}" at ${r.job.company.name}.`,
                metadata: { jobId: r.jobId, company: r.job.company.name, role: r.job.title },
              });
            });
          }),
      );
    }

    // 7. Applications Tracker events (applications)
    if (activeCategories.includes('applications')) {
      promises.push(
        this.prisma.application
          .findMany({
            where: { userId },
            include: {
              events: true,
              job: { include: { company: true } },
            },
          })
          .then((apps) => {
            apps.forEach((app) => {
              if (app.appliedAt) {
                events.push({
                  id: `app-submitted-${app.id}`,
                  eventType: 'APPLICATION_SUBMITTED',
                  category: 'applications',
                  timestamp: app.appliedAt,
                  title: 'Application Submitted',
                  description: `Submitted application for "${app.jobTitleSnapshot || app.job.title}" at ${app.companyNameSnapshot || app.job.company.name}.`,
                  metadata: {
                    appId: app.id,
                    company: app.companyNameSnapshot,
                    role: app.jobTitleSnapshot,
                  },
                });
              }

              app.events.forEach((ev) => {
                events.push({
                  id: `app-event-${ev.id}`,
                  eventType: `APPLICATION_STAGE_${ev.toStatus}`,
                  category: 'applications',
                  timestamp: ev.createdAt,
                  title: `Application Status: ${ev.toStatus}`,
                  description: `Tracked status changed to ${ev.toStatus} for ${app.jobTitleSnapshot || app.job.title} at ${app.companyNameSnapshot || app.job.company.name}.`,
                  metadata: { appId: app.id, note: ev.note, toStatus: ev.toStatus },
                });
              });
            });
          }),
      );
    }

    // 8. Recruiter Interview scheduled/completed (interviews)
    if (activeCategories.includes('interviews')) {
      promises.push(
        this.prisma.hiringInterview
          .findMany({
            where: { candidateId: userId },
            include: { job: { include: { company: true } } },
          })
          .then((interviews) => {
            interviews.forEach((i) => {
              // Scheduled
              events.push({
                id: `interview-scheduled-${i.id}`,
                eventType: 'INTERVIEW_SCHEDULED',
                category: 'interviews',
                timestamp: i.createdAt,
                title: 'Recruiter Interview Scheduled',
                description: `Hiring interview "${i.title}" scheduled for ${i.scheduledStart.toLocaleString()} with ${i.job?.company.name || 'recruiter'}.`,
                metadata: { interviewId: i.id, scheduledStart: i.scheduledStart, type: i.type },
              });

              // Completed
              if (i.status === HiringInterviewStatus.COMPLETED) {
                events.push({
                  id: `interview-completed-${i.id}`,
                  eventType: 'INTERVIEW_COMPLETED',
                  category: 'interviews',
                  timestamp: i.updatedAt,
                  title: 'Interview Completed',
                  description: `Completed hiring interview for "${i.job?.title || 'Software Engineer'}" at ${i.job?.company.name || 'recruiter'}.`,
                  metadata: { interviewId: i.id },
                });
              }
            });
          }),
      );
    }

    // 9. Assessment assignments completed (assessments)
    if (activeCategories.includes('interviews')) {
      promises.push(
        this.prisma.assessmentAssignment
          .findMany({
            where: { candidateId: userId, status: { in: ['SUBMITTED', 'EVALUATED'] } },
            include: { assessment: true, recruiterOrg: { include: { organization: true } } },
          })
          .then((assignments) => {
            assignments.forEach((a) => {
              if (a.submittedAt) {
                events.push({
                  id: `assessment-submitted-${a.id}`,
                  eventType: 'ASSESSMENT_COMPLETED',
                  category: 'interviews',
                  timestamp: a.submittedAt,
                  title: 'Assessment Assignment Submitted',
                  description: `Finished the assigned test "${a.assessment.title}" for ${a.recruiterOrg.organization.name}.`,
                  metadata: { assignmentId: a.id, score: a.score, passed: a.passed },
                });
              }
            });
          }),
      );
    }

    // 10. AI Simulation mock interviews (ai)
    if (activeCategories.includes('ai')) {
      promises.push(
        this.prisma.mockInterview
          .findMany({
            where: { userId, status: 'COMPLETED' },
            include: { job: { include: { company: true } } },
          })
          .then((mocks) => {
            mocks.forEach((m) => {
              events.push({
                id: `simulation-completed-${m.id}`,
                eventType: 'SIMULATION_COMPLETED',
                category: 'ai',
                timestamp: m.updatedAt,
                title: 'Mock Interview Simulator Completed',
                description: `Finished AI simulation mock interview${m.job ? ` for role "${m.job.title}"` : ''} with score of ${m.score}%.`,
                metadata: { mockId: m.id, score: m.score, jobRole: m.job?.title },
              });
            });
          }),
      );
    }

    await Promise.all(promises);

    // Sort descending by timestamp
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return events;
  }
}
