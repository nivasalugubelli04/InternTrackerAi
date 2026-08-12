import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { AiService } from '../services/ai.service';

import { AiController } from './ai.controller';

const mockAiService = {
  analyzeResume: jest.fn().mockResolvedValue({ summary: 'summary' }),
  summarizeJob: jest.fn().mockResolvedValue({ roleSummary: 'role' }),
  explainMatch: jest.fn().mockResolvedValue({ matchSummary: 'match' }),
  analyzeSkillGap: jest.fn().mockResolvedValue({ matchedSkills: [] }),
  generateCoverLetter: jest.fn().mockResolvedValue({ content: 'cover' }),
  generateReferral: jest.fn().mockResolvedValue({ linkedinMessage: 'ref' }),
  generateInterviewPrep: jest.fn().mockResolvedValue({ technical: [] }),
  compareInternships: jest.fn().mockResolvedValue({ comparisons: [] }),
  generateRoadmap: jest.fn().mockResolvedValue({ weeklyPlan: [] }),
  handleChat: jest.fn().mockResolvedValue({ conversationId: 'conv-1' }),
  handleChatStream: jest.fn().mockResolvedValue({ conversationId: 'conv-1' }),
  getConversations: jest.fn().mockResolvedValue([]),
  getConversation: jest.fn().mockResolvedValue({ id: 'conv-1' }),
  deleteConversation: jest.fn().mockResolvedValue({ success: true }),
};

const mockUser: JwtPayload = {
  sub: 'user-1',
  email: 'test@example.com',
  role: 'USER',
};

describe('AiController', () => {
  let controller: AiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: mockAiService }],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should route analyzeResume', async () => {
    const res = await controller.analyzeResume(mockUser, { resumeText: 'test' });
    expect(res.summary).toBe('summary');
    expect(mockAiService.analyzeResume).toHaveBeenCalledWith('user-1', 'test');
  });

  it('should route summarizeJob', async () => {
    const res = await controller.summarizeJob(mockUser, 'job-1');
    expect(res.roleSummary).toBe('role');
    expect(mockAiService.summarizeJob).toHaveBeenCalledWith('user-1', 'job-1');
  });

  it('should route chat', async () => {
    const res = await controller.chat(mockUser, { message: 'hello', jobId: 'job-1' });
    expect(res.conversationId).toBe('conv-1');
    expect(mockAiService.handleChat).toHaveBeenCalledWith('user-1', 'hello', undefined, 'job-1');
  });
});
