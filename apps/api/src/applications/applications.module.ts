import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { CareerCenterModule } from '../career-center/career-center.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [PrismaModule, NotificationsModule, AiModule, CareerCenterModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
