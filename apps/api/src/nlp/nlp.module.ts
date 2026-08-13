import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NlpPreprocessingService } from './services/nlp-preprocessing.service';
import { SkillNormalizationService } from './services/skill-normalization.service';
import { EmbeddingService } from './services/embedding.service';
import { OpenAiEmbeddingProvider } from './providers/openai-embedding.provider';
import { EmbeddingWorker } from './workers/embedding.worker';
import { BullModule } from '@nestjs/bullmq';
import { EMBEDDING_QUEUE } from '../queues/queue.constants';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: EMBEDDING_QUEUE }),
  ],
  providers: [
    NlpPreprocessingService,
    SkillNormalizationService,
    OpenAiEmbeddingProvider,
    EmbeddingService,
    EmbeddingWorker,
  ],
  exports: [
    NlpPreprocessingService,
    SkillNormalizationService,
    EmbeddingService,
  ],
})
export class NlpModule {}
