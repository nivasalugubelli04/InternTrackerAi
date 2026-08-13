import { Injectable, OnModuleInit } from '@nestjs/common';
import { Gauge } from 'prom-client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DatabaseMetricsService implements OnModuleInit {
  private activeConnections: Gauge<string>;
  private idleConnections: Gauge<string>;
  private waitCount: Gauge<string>;

  constructor(private readonly prisma: PrismaService) {
    this.activeConnections = new Gauge({
      name: 'prisma_client_queries_active',
      help: 'Number of currently active queries',
    });
    this.idleConnections = new Gauge({
      name: 'prisma_client_connections_idle',
      help: 'Number of idle connections',
    });
    this.waitCount = new Gauge({
      name: 'prisma_client_queries_wait',
      help: 'Number of queries waiting for a connection',
    });
  }

  async onModuleInit() {
    // Optionally register them globally, though prom-client does this by default when creating them.
    setInterval(async () => {
      try {
        const metrics = await this.prisma.$metrics.json();

        // Find metrics in the returned JSON
        const activeQueries = metrics.gauges.find(
          (g: any) => g.key === 'prisma_client_queries_active',
        );
        if (activeQueries) this.activeConnections.set(activeQueries.value);

        const idleConn = metrics.gauges.find(
          (g: any) => g.key === 'prisma_client_connections_idle',
        );
        if (idleConn) this.idleConnections.set(idleConn.value);

        const waitQueries = metrics.gauges.find((g: any) => g.key === 'prisma_client_queries_wait');
        if (waitQueries) this.waitCount.set(waitQueries.value);
      } catch (err) {
        // Handle error gracefully if DB is down
      }
    }, 10000); // Poll every 10s
  }
}
