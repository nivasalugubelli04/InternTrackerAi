import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SemanticMatchingService {
  private readonly logger = new Logger(SemanticMatchingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Computes the semantic similarity score (0 to 100) between a user profile and a job posting.
   * Relies on the pgvector `<=>` cosine distance operator.
   */
  async computeSemanticScore(userId: string, jobId: string): Promise<number | null> {
    try {
      // Find the user's profile ID
      const profile = await this.prisma.profile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) return null;

      // Query the distance between the USER_PROFILE embedding and JOB_POSTING embedding
      // Cosine distance in pgvector is `<=>`.
      // The distance is between 0 (identical) and 2 (opposite).
      // Similarity = 1 - distance
      // Score = Similarity * 100 (clamp 0 to 100)

      const result = await this.prisma.$queryRaw<{ distance: number }[]>`
        SELECT (e1.embedding <=> e2.embedding) as distance
        FROM "content_embeddings" e1, "content_embeddings" e2
        WHERE e1."entityType" = 'USER_PROFILE'::"EntityType"
          AND e1."entityId" = ${profile.id}::uuid
          AND e2."entityType" = 'JOB_POSTING'::"EntityType"
          AND e2."entityId" = ${jobId}::uuid
        LIMIT 1;
      `;

      if (!result || result.length === 0 || result[0]?.distance === null || result[0]?.distance === undefined) {
        return null;
      }

      const distance = result[0].distance;
      const similarity = 1 - distance;
      
      const rawScore = Math.round(similarity * 100);
      
      // Clamp between 0 and 100
      return Math.max(0, Math.min(100, rawScore));
    } catch (error) {
      this.logger.error(`Failed to compute semantic score for user ${userId} and job ${jobId}`, error);
      return null;
    }
  }
}
