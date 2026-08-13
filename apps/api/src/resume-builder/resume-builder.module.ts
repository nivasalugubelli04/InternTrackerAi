import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

import { ResumeBuilderController } from './resume-builder.controller';
import { ResumeBuilderService } from './resume-builder.service';

@Module({
  imports: [PrismaModule, AiModule],
  providers: [ResumeBuilderService],
  controllers: [ResumeBuilderController],
  exports: [ResumeBuilderService],
})
export class ResumeBuilderModule {}
