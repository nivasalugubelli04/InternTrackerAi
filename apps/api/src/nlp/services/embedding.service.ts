import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NlpPreprocessingService } from './nlp-preprocessing.service';
import { OpenAiEmbeddingProvider } from '../providers/openai-embedding.provider';
import { EntityType } from '@prisma/client';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private prisma: PrismaService,
    private nlpService: NlpPreprocessingService,
    private embeddingProvider: OpenAiEmbeddingProvider // Dependency injection, could use IEmbeddingProvider token in the future
  ) {}

  /**
   * Retrieves or generates an embedding for a given entity type and ID.
   * Caches the result in Postgres using pgvector.
   */
  async getOrGenerateEmbedding(
    entityType: EntityType,
    entityId: string,
    rawText: string
  ): Promise<void> {
    const inputHash = this.nlpService.generateInputHash(rawText);

    // Check if we already have this exact embedding
    const existing = await this.prisma.contentEmbedding.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
      select: { inputHash: true, id: true },
    });

    if (existing && existing.inputHash === inputHash) {
      // Embedding is up-to-date, nothing to do
      return;
    }

    try {
      this.logger.debug(`Generating embedding for ${entityType} ${entityId}`);
      const vector = await this.embeddingProvider.generateEmbedding(rawText);
      const vectorString = `[${vector.join(',')}]`;

      // Upsert into DB. Prisma doesn't natively support creating 'Unsupported' types via typical Prisma Client methods easily, 
      // we often need $executeRaw for vector inserts, but Prisma 5.1+ natively supports pgvector if used correctly, or we can use $executeRaw.
      if (existing) {
        await this.prisma.$executeRaw`
          UPDATE "content_embeddings" 
          SET "inputHash" = ${inputHash}, 
              "embedding" = ${vectorString}::vector, 
              "model" = ${this.embeddingProvider.modelName}, 
              "dimension" = ${this.embeddingProvider.dimension}, 
              "updatedAt" = NOW()
          WHERE "id" = ${existing.id}::uuid
        `;
      } else {
        await this.prisma.$executeRaw`
          INSERT INTO "content_embeddings" ("id", "entityType", "entityId", "inputHash", "model", "dimension", "embedding", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid(), 
            ${entityType}::"EntityType", 
            ${entityId}::uuid, 
            ${inputHash}, 
            ${this.embeddingProvider.modelName}, 
            ${this.embeddingProvider.dimension}, 
            ${vectorString}::vector, 
            NOW(), 
            NOW()
          )
        `;
      }
    } catch (error) {
      this.logger.error(`Failed to generate embedding for ${entityType} ${entityId}`, error);
      throw error;
    }
  }
}
