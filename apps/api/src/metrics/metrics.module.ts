import { Global, Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

import { DatabaseMetricsService } from './services/database-metrics.service';
import { QueueMetricsService } from './services/queue-metrics.service';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
    PrismaModule,
    RedisModule,
  ],
  providers: [DatabaseMetricsService, QueueMetricsService],
  exports: [DatabaseMetricsService, QueueMetricsService],
})
export class MetricsModule {}
