import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';

/**
 * RedisModule is global so BullMQ queues and any caching layer
 * can inject RedisService without re-importing this module.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
