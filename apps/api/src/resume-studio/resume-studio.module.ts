import { Module } from '@nestjs/common';
import { ResumeStudioService } from './resume-studio.service';
import { ResumeStudioController } from './resume-studio.controller';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NlpModule } from '../nlp/nlp.module';

@Module({
  imports: [PrismaModule, AiModule, NlpModule],
  controllers: [ResumeStudioController],
  providers: [ResumeStudioService],
  exports: [ResumeStudioService],
})
export class ResumeStudioModule {}
