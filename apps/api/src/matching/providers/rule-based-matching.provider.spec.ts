import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { WorkMode } from '@prisma/client';

import { ExplanationGeneratorService } from '../services/explanation-generator.service';
import type { NormalizedJob } from '../services/job-analyzer.service';
import type { NormalizedProfile } from '../services/profile-analyzer.service';

import { RuleBasedMatchingProvider } from './rule-based-matching.provider';

describe('RuleBasedMatchingProvider', () => {
  let provider: RuleBasedMatchingProvider;

  const mockConfig = {
    weights: {
      skills: 35,
      role: 20,
      location: 15,
      company: 10,
      cgpa: 10,
      stipend: 5,
      experience: 5,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleBasedMatchingProvider,
        ExplanationGeneratorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'matching.weights') return mockConfig.weights;
              return null;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<RuleBasedMatchingProvider>(RuleBasedMatchingProvider);
  });

  it('should calculate a high match score for perfectly matching profile and job', async () => {
    const profile: NormalizedProfile = {
      userId: 'user-1',
      skills: ['Java', 'React', 'Node.js', 'PostgreSQL'],
      preferredRoles: ['Software Engineer Intern', 'Backend Engineer'],
      preferredLocations: ['San Francisco', 'Remote'],
      preferredCompanies: ['Google', 'Meta'],
      preferredWorkModes: [WorkMode.REMOTE],
      minimumStipend: 2000,
      internshipDuration: '3 months',
      cgpa: 3.8,
      degree: 'B.S. Computer Science',
      branch: 'CS',
      college: 'Stanford',
      yearOfStudy: 3,
      resumeKeywords: ['Java', 'React'],
      trackedCompanyNames: ['Google'],
    };

    const job: NormalizedJob = {
      jobId: 'job-1',
      title: 'Software Engineer Intern',
      companyId: 'comp-1',
      companyName: 'Google',
      department: 'Engineering',
      experienceLevel: 'Internship',
      location: 'San Francisco, CA',
      workMode: WorkMode.REMOTE,
      stipend: 3000,
      duration: '3 months',
      requiredSkills: ['Java', 'React'],
      preferredSkills: ['Node.js'],
      descriptionKeywords: ['Java', 'React', 'Node.js', 'PostgreSQL'],
      minCgpa: 3.5,
    };

    const result = await provider.calculateMatch(profile, job);

    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(result.matchedSkills).toContain('Java');
    expect(result.matchedSkills).toContain('React');
    expect(result.matchedCompanies).toContain('Google');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('should calculate lower match score for mismatched profile and job', async () => {
    const profile: NormalizedProfile = {
      userId: 'user-2',
      skills: ['Python', 'Django'],
      preferredRoles: ['Data Analyst'],
      preferredLocations: ['New York'],
      preferredCompanies: ['Apple'],
      preferredWorkModes: [WorkMode.ONSITE],
      minimumStipend: 5000,
      internshipDuration: '6 months',
      cgpa: 2.5,
      degree: 'B.A. Arts',
      branch: 'Arts',
      college: 'NYU',
      yearOfStudy: 1,
      resumeKeywords: [],
      trackedCompanyNames: [],
    };

    const job: NormalizedJob = {
      jobId: 'job-2',
      title: 'Senior C++ Embedded Architect',
      companyId: 'comp-2',
      companyName: 'Tesla',
      department: 'Hardware',
      experienceLevel: 'Senior',
      location: 'Austin, TX',
      workMode: WorkMode.ONSITE,
      stipend: 1000,
      duration: '3 months',
      requiredSkills: ['C++', 'Assembly', 'RTOS'],
      preferredSkills: ['Microcontrollers'],
      descriptionKeywords: ['C++', 'Assembly'],
      minCgpa: 3.8,
    };

    const result = await provider.calculateMatch(profile, job);

    expect(result.overallScore).toBeLessThan(50);
  });
});
