import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CareerCenterModule } from '../career-center/career-center.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchingProcessor } from '../queues/processors/matching.processor';
import { MATCHING_QUEUE } from '../queues/queue.constants';
import { RedisModule } from '../redis/redis.module';

import { MatchingController, MatchScoreController } from './controllers/matching.controller';
import { RecommendationsController } from './controllers/recommendations.controller';
import { MATCHING_PROVIDER } from './providers/matching-provider.interface';
import { OpenAiMatchingProvider } from './providers/openai-matching.provider';
import { RuleBasedMatchingProvider } from './providers/rule-based-matching.provider';
import { ExplanationGeneratorService } from './services/explanation-generator.service';
import { JobAnalyzerService } from './services/job-analyzer.service';
import { KeywordNormalizerService } from './services/keyword-normalizer.service';
import { ProfileAnalyzerService } from './services/profile-analyzer.service';
import { RecommendationService } from './services/recommendation.service';
import { ScoringEngineService } from './services/scoring-engine.service';
import { SemanticMatchingService } from './services/semantic-matching.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
    forwardRef(() => CareerCenterModule),
    BullModule.registerQueue({
      name: MATCHING_QUEUE,
    }),
  ],
  controllers: [MatchingController, MatchScoreController, RecommendationsController],
  providers: [
    KeywordNormalizerService,
    ProfileAnalyzerService,
    JobAnalyzerService,
    ScoringEngineService,
    SemanticMatchingService,
    ExplanationGeneratorService,
    RuleBasedMatchingProvider,
    OpenAiMatchingProvider,
    RecommendationService,
    {
      provide: MATCHING_PROVIDER,
      useFactory: (
        configService: ConfigService,
        ruleBased: RuleBasedMatchingProvider,
        openai: OpenAiMatchingProvider,
      ) => {
        const strategy = configService.get<string>('matching.strategy') ?? 'rule-based';
        if (strategy === 'openai') {
          return openai;
        }
        return ruleBased;
      },
      inject: [ConfigService, RuleBasedMatchingProvider, OpenAiMatchingProvider],
    },
    MatchingProcessor,
  ],
  exports: [RecommendationService, ScoringEngineService, KeywordNormalizerService],
})
export class MatchingModule {}
