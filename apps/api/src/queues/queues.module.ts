import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ScrapersModule } from '../scrapers/scrapers.module';

import { ScrapeProcessor } from './processors/scrape.processor';
import { CLEANUP_QUEUE, HEALTH_QUEUE, PARSER_QUEUE, SCRAPE_QUEUE } from './queue.constants';
import { ScrapeSchedulerService } from './schedulers/scrape-scheduler.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password') || undefined,
          db: configService.get<number>('redis.db', 0),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: SCRAPE_QUEUE },
      { name: PARSER_QUEUE },
      { name: CLEANUP_QUEUE },
      { name: HEALTH_QUEUE },
    ),
    ScrapersModule,
  ],
  providers: [ScrapeProcessor, ScrapeSchedulerService],
  exports: [BullModule, ScrapeSchedulerService],
})
export class QueuesModule {}
