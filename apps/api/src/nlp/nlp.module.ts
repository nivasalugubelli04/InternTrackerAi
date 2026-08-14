import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { EMBEDDING_QUEUE } from '../queues/queue.constants';

import { OpenAiEmbeddingProvider } from './providers/openai-embedding.provider';
import { EmbeddingService } from './services/embedding.service';
import { NlpPreprocessingService } from './services/nlp-preprocessing.service';
import { SkillNormalizationService } from './services/skill-normalization.service';
import { EmbeddingWorker } from './workers/embedding.worker';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: EMBEDDING_QUEUE })],
  providers: [
    NlpPreprocessingService,
    SkillNormalizationService,
    OpenAiEmbeddingProvider,
    EmbeddingService,
    EmbeddingWorker,
  ],
  exports: [NlpPreprocessingService, SkillNormalizationService, EmbeddingService],
})
export class NlpModule {}
