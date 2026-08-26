import { Test, TestingModule } from '@nestjs/testing';

import { CareerIntelligenceService } from '../career-intelligence/services/career-intelligence.service';
import { ExecutionEngineService } from '../execution/services/execution-engine.service';
import { NetworkingService } from '../networking/services/networking.service';
import { CareerAnalyticsService } from '../outcomes/services/career-analytics.service';
import { PortfolioIntelligenceService } from '../portfolio/services/portfolio-intelligence.service';
import { ApplicationOptimizationService } from '../preparation/services/application-optimization.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResearchService } from '../research/services/research.service';
import { SimulationService } from '../simulation/services/simulation.service';

import { CopilotActionProposalService } from './services/copilot-action-proposal.service';
import { CopilotContextService } from './services/copilot-context.service';
import { CopilotIntentService } from './services/copilot-intent.service';
import { CopilotMemoryService } from './services/copilot-memory.service';
import { CopilotOrchestratorService } from './services/copilot-orchestrator.service';
import { CopilotToolRegistryService } from './services/copilot-tool-registry.service';
import { CopilotService } from './services/copilot.service';

describe('Phase 48: Personal AI Career Copilot & Unified AI Orchestration', () => {
  let copilotService: CopilotService;
  let intentService: CopilotIntentService;
  let contextService: CopilotContextService;
  let memoryService: CopilotMemoryService;
  let proposalService: CopilotActionProposalService;
  let toolRegistry: CopilotToolRegistryService;
  let orchestrator: CopilotOrchestratorService;

  const mockUserId = 'user-uuid-copilot-48';

  const mockPrisma = {
    copilotConversation: {
      create: jest
        .fn()
        .mockImplementation((args) => Promise.resolve({ id: 'conv-123', ...args.data })),
      findFirst: jest.fn().mockResolvedValue({ id: 'conv-123', userId: mockUserId }),
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'conv-123', title: 'Plan my week', isPinned: false }]),
      delete: jest.fn().mockResolvedValue({ id: 'conv-123' }),
    },
    copilotMessage: {
      create: jest
        .fn()
        .mockImplementation((args) => Promise.resolve({ id: 'msg-456', ...args.data })),
      findMany: jest.fn().mockResolvedValue([
        { role: 'USER', content: 'What should I focus on this week?' },
        { role: 'ASSISTANT', content: 'Deploy your AI project' },
      ]),
    },
    copilotMemory: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'mem-1',
          userId: mockUserId,
          key: 'preferred_target_role',
          value: 'Machine Learning Engineer',
        },
      ]),
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'mem-1', userId: mockUserId, key: 'preferred_target_role' }),
      upsert: jest
        .fn()
        .mockImplementation((args) => Promise.resolve({ id: 'mem-1', ...args.create })),
      delete: jest.fn().mockResolvedValue({ id: 'mem-1' }),
    },
    copilotActionProposal: {
      create: jest
        .fn()
        .mockImplementation((args) =>
          Promise.resolve({ id: 'prop-789', status: 'PENDING', ...args.data }),
        ),
      findFirst: jest.fn().mockResolvedValue({
        id: 'prop-789',
        userId: mockUserId,
        proposalType: 'ADD_DAILY_TASK',
        title: 'Deploy AI Project Evidence',
        description: 'Deploy project to cloud',
        targetEngine: 'EXECUTION_ENGINE',
        actionPayload: {
          title: 'Deploy AI Project Evidence',
          estimatedMinutes: 45,
          priority: 'HIGH',
        },
        status: 'PENDING',
      }),
      update: jest
        .fn()
        .mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
    },
    executionPlan: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'plan-active-1', userId: mockUserId, status: 'ACTIVE' }),
      create: jest
        .fn()
        .mockResolvedValue({ id: 'plan-active-1', userId: mockUserId, status: 'ACTIVE' }),
    },
    executionPlanItem: {
      create: jest
        .fn()
        .mockResolvedValue({ id: 'item-1', planId: 'plan-active-1', title: 'Deploy AI Project' }),
    },
    careerSprint: {
      create: jest
        .fn()
        .mockResolvedValue({ id: 'sprint-1', userId: mockUserId, title: 'Master MLOps Sprint' }),
    },
    careerEvent: {
      create: jest.fn().mockResolvedValue({ id: 'event-1' }),
    },
    jobPosting: {
      count: jest.fn().mockResolvedValue(120),
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'job-1', title: 'ML Intern', company: { name: 'Google' } }),
    },
    interviewSkillGap: {
      count: jest.fn().mockResolvedValue(2),
    },
    project: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockCareerIntelligence = {
    buildCareerState: jest.fn().mockResolvedValue({
      userId: mockUserId,
      targetRole: 'AI Engineer',
      careerGoals: ['Land Top AI Internship'],
      skills: [
        { name: 'Python', category: 'LANG', proficiency: 'ADVANCED' },
        { name: 'PyTorch', category: 'FRAMEWORK', proficiency: 'INTERMEDIATE' },
        { name: 'TypeScript', category: 'LANG', proficiency: 'ADVANCED' },
      ],
      projects: [],
      portfolioMaturity: 'DEVELOPING',
      applicationCount: 5,
      interviewCount: 2,
      mockInterviewAvgScore: 82,
      completedLearningModules: 4,
      networkingContactCount: 6,
      evidenceNodeCount: 3,
      dataLimitations: [],
    }),
  };

  const mockExecutionEngine = {
    getDailyPlan: jest.fn().mockResolvedValue({
      id: 'plan-1',
      todayActions: [{ id: 'task-1', title: 'Complete Docker deployment', status: 'PENDING' }],
      nextBestAction: {
        action: {
          title: 'Complete Docker deployment',
          estimatedMinutes: 45,
        },
        urgencyLabel: 'HIGH',
      },
    }),
  };

  const mockSimulation = {
    createAndRunSimulation: jest.fn().mockResolvedValue({
      id: 'sim-123',
      scenarioName: 'Focus on MLOps',
      projectedReadinessScore: 92,
      impactMetrics: { interviewCallbackBoost: 22 },
    }),
  };

  const mockResearch = {
    getPersonalizedFeed: jest.fn().mockResolvedValue({
      topMatches: [
        {
          jobId: 'job-1',
          jobTitle: 'AI Research Intern',
          companyName: 'OpenAI',
          relevance: { overallScore: 94, criticalGaps: [] },
        },
      ],
      trendingSignals: [{ skillName: 'LangChain', frequencyCount: 45 }],
      totalDiscovered: 15,
    }),
  };

  const mockPortfolio = {
    getPortfolioIntelligence: jest.fn().mockResolvedValue({
      overallScore: 82,
      totalProjects: 3,
      evidenceGaps: ['Missing live deployed URL for LLM project'],
    }),
  };

  const mockAnalytics = {
    getFunnelAnalytics: jest.fn().mockResolvedValue({
      discovered: 15,
      submitted: 12,
      interview: 3,
      offer: 1,
    }),
    getSkillAnalytics: jest.fn().mockResolvedValue({
      highDemandSkills: [{ name: 'Python', requestedCount: 10 }],
      missingEvidenceGaps: [],
      strongEvidenceSkills: ['PyTorch'],
    }),
  };

  const mockApplicationOptimization = {
    analyzeOpportunity: jest.fn().mockResolvedValue({
      requirements: [{ name: 'Python', classification: 'REQUIRED' }],
    }),
  };

  const mockNetworking = {
    getFollowUps: jest
      .fn()
      .mockResolvedValue([
        { contactId: 'contact-1', name: 'Alex Smith', daysElapsed: 6, recommendation: 'Follow up' },
      ]),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotService,
        CopilotIntentService,
        CopilotContextService,
        CopilotMemoryService,
        CopilotToolRegistryService,
        CopilotOrchestratorService,
        CopilotActionProposalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CareerIntelligenceService, useValue: mockCareerIntelligence },
        { provide: ExecutionEngineService, useValue: mockExecutionEngine },
        { provide: SimulationService, useValue: mockSimulation },
        { provide: ResearchService, useValue: mockResearch },
        { provide: PortfolioIntelligenceService, useValue: mockPortfolio },
        { provide: CareerAnalyticsService, useValue: mockAnalytics },
        { provide: ApplicationOptimizationService, useValue: mockApplicationOptimization },
        { provide: NetworkingService, useValue: mockNetworking },
      ],
    }).compile();

    copilotService = module.get<CopilotService>(CopilotService);
    intentService = module.get<CopilotIntentService>(CopilotIntentService);
    contextService = module.get<CopilotContextService>(CopilotContextService);
    memoryService = module.get<CopilotMemoryService>(CopilotMemoryService);
    proposalService = module.get<CopilotActionProposalService>(CopilotActionProposalService);
    toolRegistry = module.get<CopilotToolRegistryService>(CopilotToolRegistryService);
    orchestrator = module.get<CopilotOrchestratorService>(CopilotOrchestratorService);
  });

  describe('1. Intent Understanding & Multi-Engine Routing', () => {
    it('should detect single-intent DAILY_PLANNING correctly', () => {
      const result = intentService.analyzeIntent('What should I focus on today?');
      expect(result.primaryIntent).toBe('DAILY_PLANNING');
      expect(result.isMultiEngine).toBe(false);
    });

    it('should detect WEEKLY_PLANNING correctly', () => {
      const result = intentService.analyzeIntent('What should I do this week for my career?');
      expect(result.primaryIntent).toBe('WEEKLY_PLANNING');
    });

    it('should detect CAREER_SIMULATION and extract target focus', () => {
      const result = intentService.analyzeIntent('What happens if I focus on MLOps?');
      expect(result.primaryIntent).toBe('CAREER_SIMULATION');
      expect(result.extractedSkillOrRole).toContain('MLOps');
    });

    it('should detect multi-engine trade-off comparison questions', () => {
      const result = intentService.analyzeIntent(
        'Should I improve my portfolio or apply to more internships?',
      );
      expect(result.primaryIntent).toBe('CAREER_COMPARISON');
      expect(result.isMultiEngine).toBe(true);
    });
  });

  describe('2. Copilot Tool Registry & Context Retrieval', () => {
    it('should retrieve grounded career state from CareerIntelligenceService', async () => {
      const state = await toolRegistry.getCareerState(mockUserId);
      expect(state.targetRole).toBe('AI Engineer');
      expect(state.skills).toHaveLength(3);
    });

    it('should selectively retrieve context based on intent without overloading DB', async () => {
      const intentAnalysis = intentService.analyzeIntent('What should I do today?');
      const context = await contextService.buildContextBundle(mockUserId, intentAnalysis);

      expect(context.userId).toBe(mockUserId);
      expect(context.executionPlan).toBeDefined();
      expect(context.groundingSources.some((s) => s.sourceType === 'EXECUTION_ENGINE')).toBe(true);
      expect(context.estimatedTokens).toBeGreaterThan(0);
    });
  });

  describe('3. Controlled Long-Term Memory & Conversation Continuity', () => {
    it('should save user approved long-term memory items', async () => {
      const memory = await memoryService.saveMemory(mockUserId, {
        key: 'preferred_work_mode',
        value: 'Remote or Hybrid',
        reason: 'User explicitly stated preference',
      });
      expect(memory.key).toBe('preferred_work_mode');
    });

    it('should allow user to view and delete long-term memory', async () => {
      const list = await memoryService.getUserMemories(mockUserId);
      expect(list).toHaveLength(1);

      const deleteRes = await memoryService.deleteMemory(mockUserId, 'mem-1');
      expect(deleteRes.success).toBe(true);
    });

    it('should resolve recent conversational turn context for follow-ups', async () => {
      const recentContext = await memoryService.resolveRecentTurnContext('conv-123');
      expect(recentContext).toContain('Deploy your AI project');
    });
  });

  describe('4. Grounded Synthesis & Deterministic Fallback', () => {
    it('should generate structured deterministic fallback when AI is unavailable', async () => {
      const intentAnalysis = intentService.analyzeIntent('What is my biggest weakness?');
      const context = await contextService.buildContextBundle(mockUserId, intentAnalysis);
      const response = orchestrator.generateDeterministicFallback(
        'What is my biggest weakness?',
        context,
        intentAnalysis,
      );

      expect(response.answerType).toBe('ANALYSIS');
      expect(response.summary).toContain('Kubernetes & Docker Deployment');
      expect(response.evidence.length).toBeGreaterThan(0);
      expect(response.confidence).toBe('HIGH');
      expect(response.suggestedFollowUps.length).toBeGreaterThan(0);
    });
  });

  describe('5. Action Proposal & Explicit Confirmation Model', () => {
    it('should create a PENDING action proposal when actionable guidance is recommended', async () => {
      const proposal = await proposalService.createProposal({
        userId: mockUserId,
        proposalType: 'ADD_DAILY_TASK',
        title: 'Deploy AI Project Evidence',
        description: 'Deploy project to cloud for portfolio proof',
        targetEngine: 'EXECUTION_ENGINE',
        payload: { title: 'Deploy AI Project Evidence', estimatedMinutes: 45, priority: 'HIGH' },
      });

      expect(proposal.id).toBe('prop-789');
      expect(proposal.status).toBe('PENDING');
    });

    it('should execute proposal and update Phase 45 Execution Plan only upon user confirmation', async () => {
      const result = await proposalService.confirmProposal(mockUserId, 'prop-789');
      expect(result.success).toBe(true);
      expect(mockPrisma.executionPlanItem.create).toHaveBeenCalled();
      expect(mockPrisma.careerEvent.create).toHaveBeenCalled();
    });
  });

  describe('6. End-to-End Copilot Conversational Flow', () => {
    it('should execute complete pipeline: message -> intent -> context -> grounded response -> proposal', async () => {
      const result = await copilotService.sendMessage(mockUserId, {
        message: 'What should I focus on this week?',
      });

      expect(result.conversationId).toBeDefined();
      expect(result.intent).toBe('WEEKLY_PLANNING');
      expect(result.response.answerType).toBe('ACTION_PLAN');
      expect(result.response.confidence).toBe('HIGH');
      expect(result.proposal).toBeDefined();
      expect(result.groundingSources.length).toBeGreaterThan(0);
    });

    it('should provide personalized Copilot Home dashboard summary', async () => {
      const home = await copilotService.getHomeSummary(mockUserId);
      expect(home.currentRole).toBe('AI Engineer');
      expect(home.topPriority?.title).toBe('Complete Docker deployment');
      expect(home.suggestedPrompts.length).toBe(5);
    });
  });
});
