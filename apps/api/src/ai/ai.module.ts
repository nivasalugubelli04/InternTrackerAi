import { Module } from '@nestjs/common';

import { AiController } from './controllers/ai.controller';
import { PromptManager } from './prompts/prompt-manager';
import { AIProviderFactory } from './providers/ai-provider.factory';
import { FailoverAiProvider } from './providers/failover-ai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AiCacheService } from './services/ai-cache.service';
import { AiRateLimiterService } from './services/ai-rate-limiter.service';
import { AiService } from './services/ai.service';
import { CostTrackerService } from './services/cost-tracker.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AiCacheService,
    CostTrackerService,
    AiRateLimiterService,
    PromptManager,
    OpenAIProvider,
    GeminiProvider,
    FailoverAiProvider,
    AIProviderFactory,
  ],
  exports: [AiService, CostTrackerService, FailoverAiProvider],
})
export class AiModule {}
