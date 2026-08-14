import { Module } from '@nestjs/common';
import { ExtensionService } from './extension.service';
import { ExtensionController } from './extension.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AiModule, AuthModule],
  controllers: [ExtensionController],
  providers: [ExtensionService],
  exports: [ExtensionService],
})
export class ExtensionModule {}
