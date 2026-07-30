import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * PrismaModule is marked @Global so that PrismaService can be injected
 * anywhere in the application without re-importing this module.
 *
 * Architectural Decision:
 *  - Global modules are reserved for true application-wide singletons
 *    (database connection, config, cache). Business feature modules must
 *    NOT be global.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
