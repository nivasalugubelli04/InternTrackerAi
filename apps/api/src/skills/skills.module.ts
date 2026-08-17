import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { MarketModule } from '../market/market.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SKILL_GRAPH_QUEUE } from '../queues/queue.constants';

import { AdminSkillsController } from './controllers/admin-skills.controller';
import { SkillGraphProcessor } from './processors/skill-graph.processor';
import { CareerPathService } from './services/career-path.service';
import { CareerRecommendationService } from './services/career-recommendation.service';
import { RoleTaxonomyService } from './services/role-taxonomy.service';
import { SkillGraphService } from './services/skill-graph.service';
import { TalentIntelligenceService } from './services/talent-intelligence.service';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    MarketModule,
    BullModule.registerQueue({
      name: SKILL_GRAPH_QUEUE,
    }),
  ],
  controllers: [SkillsController, AdminSkillsController],
  providers: [
    SkillsService,
    SkillGraphService,
    RoleTaxonomyService,
    CareerPathService,
    TalentIntelligenceService,
    CareerRecommendationService,
    SkillGraphProcessor,
  ],
  exports: [
    SkillsService,
    SkillGraphService,
    RoleTaxonomyService,
    CareerPathService,
    TalentIntelligenceService,
    CareerRecommendationService,
  ],
})
export class SkillsModule {}
