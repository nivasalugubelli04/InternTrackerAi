/**
 * Phase 8 — OpportunitiesModule
 *
 * Orchestrates the Opportunity Feed, Search & Discovery layer.
 * This module does NOT contain any scrapers, matchers, or LLM services.
 * It consumes existing data from JobPosting, MatchScore, Recommendation,
 * TrackedCompany, SavedJob, DismissedJob, and JobInteraction.
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
