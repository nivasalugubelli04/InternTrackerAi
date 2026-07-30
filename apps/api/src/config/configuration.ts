/**
 * Configuration factory for NestJS ConfigModule.
 *
 * Architectural Decision:
 *  - We centralise all env-var reads here so that every other module
 *    gets typed, validated values via ConfigService instead of reading
 *    process.env directly. This makes misconfigured deployments fail
 *    fast at startup rather than at runtime.
 */
export interface AppConfig {
  app: {
    port: number;
    name: string;
    prefix: string;
    nodeEnv: string;
  };
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
  };
  logging: {
    level: string;
    pretty: boolean;
  };
  cors: {
    origins: string[];
  };
}

export default (): AppConfig => ({
  app: {
    port: parseInt(process.env['APP_PORT'] ?? '3000', 10),
    name: process.env['APP_NAME'] ?? 'InternTrackerAPI',
    prefix: process.env['API_PREFIX'] ?? 'api/v1',
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
  },
  database: {
    url:
      process.env['DATABASE_URL'] ??
      'postgresql://intern_user:change_me@localhost:5432/intern_tracker_db?schema=public',
  },
  redis: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'] ?? '',
    db: parseInt(process.env['REDIS_DB'] ?? '0', 10),
  },
  logging: {
    level: process.env['LOG_LEVEL'] ?? 'info',
    pretty: process.env['LOG_PRETTY'] === 'true',
  },
  cors: {
    origins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
  },
});
