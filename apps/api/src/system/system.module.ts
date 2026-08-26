import { Module, forwardRef } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

import { SystemAdminController } from './controllers/system-admin.controller';
import { DeadLetterQueueService } from './services/dead-letter-queue.service';
import { FeatureFlagService } from './services/feature-flag.service';
import { HealthMonitorService } from './services/health-monitor.service';
import { IncidentManagerService } from './services/incident-manager.service';
import { QueueGuardService } from './services/queue-guard.service';
import { ScraperObserverService } from './services/scraper-observer.service';
import { SelfHealingService } from './services/self-healing.service';
import { TelemetryService } from './services/telemetry.service';

@Module({
  imports: [PrismaModule, RedisModule, forwardRef(() => NotificationsModule)],
  controllers: [SystemAdminController],
  providers: [
    HealthMonitorService,
    ScraperObserverService,
    QueueGuardService,
    TelemetryService,
    IncidentManagerService,
    SelfHealingService,
    DeadLetterQueueService,
    FeatureFlagService,
  ],
  exports: [
    HealthMonitorService,
    ScraperObserverService,
    QueueGuardService,
    TelemetryService,
    IncidentManagerService,
    SelfHealingService,
    DeadLetterQueueService,
    FeatureFlagService,
  ],
})
export class SystemModule {}
