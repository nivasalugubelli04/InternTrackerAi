import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService wraps the PrismaClient and hooks into the NestJS lifecycle.
 *
 * Architectural Decision:
 *  - We extend PrismaClient directly (rather than wrapping it) so that
 *    all Prisma query methods are available as first-class members of
 *    PrismaService — no forwarding boilerplate required.
 *  - OnModuleInit connects eagerly so that a missing DB is detected at
 *    startup, not on the first request.
 *  - OnModuleDestroy ensures connections are released cleanly when the
 *    NestJS application shuts down (e.g., SIGTERM in containers).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  [key: string]: any;
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to PostgreSQL via Prisma…');
    await this.$connect();
    this.logger.log('PostgreSQL connection established');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from PostgreSQL…');
    await this.$disconnect();
    this.logger.log('PostgreSQL connection closed');
  }

  /**
   * Checks the database connectivity by running a cheap query.
   * Used by the health endpoint to report DB status.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
