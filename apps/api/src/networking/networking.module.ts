import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

import { NetworkingController } from './controllers/networking.controller';
import { NetworkingService } from './services/networking.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [NetworkingController],
  providers: [NetworkingService],
  exports: [NetworkingService],
})
export class NetworkingModule {}
