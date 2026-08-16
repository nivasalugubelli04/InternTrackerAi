import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentService } from './assessment.service';
import { AssessmentSandboxService } from './assessment-sandbox.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';

describe('AssessmentService & Sandbox', () => {
  let assessmentService: AssessmentService;
  let sandboxService: AssessmentSandboxService;

  const mockPrismaService = {
    recruiterProfile: {
      findUnique: jest.fn(),
    },
    assessment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    assessmentAssignment: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockNotificationsService = {
    queueNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        AssessmentSandboxService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    assessmentService = module.get<AssessmentService>(AssessmentService);
    sandboxService = module.get<AssessmentSandboxService>(AssessmentSandboxService);
  });

  describe('AssessmentSandboxService', () => {
    it('should evaluate candidate code correctly in isolated VM sandbox', async () => {
      const candidateCode = `
        function solution(input) {
          return input.a + input.b;
        }
      `;
      const testCases = [
        { input: JSON.stringify({ a: 2, b: 3 }), expectedOutput: '5' },
        { input: JSON.stringify({ a: 10, b: 20 }), expectedOutput: '30' },
      ];

      const res = await sandboxService.executeCode(candidateCode, testCases);
      expect(res.passed).toBe(true);
      expect(res.passedCount).toBe(2);
    });

    it('should catch runtime errors without crashing the main thread', async () => {
      const badCode = `
        function solution(input) {
          throw new Error('Candidate syntax runtime failure');
        }
      `;
      const testCases = [{ input: '123', expectedOutput: '123' }];

      const res = await sandboxService.executeCode(badCode, testCases);
      expect(res.passed).toBe(false);
      expect(res.testResults[0]?.error).toContain('Candidate syntax runtime failure');
    });
  });

  describe('AssessmentService CRUD', () => {
    it('should create assessment successfully', async () => {
      mockPrismaService.recruiterProfile.findUnique.mockResolvedValue({ id: 'rec-1' });
      mockPrismaService.assessment.create.mockResolvedValue({ id: 'ass-1', title: 'JS Test' });

      const res = await assessmentService.createAssessment('user-1', 'org-1', {
        title: 'JS Test',
        questions: [{ question: 'What is 2+2?', type: 'MCQ' as any }],
      });

      expect(res.title).toBe('JS Test');
      expect(mockPrismaService.assessment.create).toHaveBeenCalled();
    });
  });
});
