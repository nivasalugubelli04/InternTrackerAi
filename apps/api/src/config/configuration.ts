/**
 * Configuration factory for NestJS ConfigModule.
 *
 * Architectural Decision:
 *  - We centralise all env-var reads here so that every other module
 *    gets typed, validated values via ConfigService instead of reading
 *    process.env directly. This makes misconfigured deployments fail
 *    fast at startup rather than at runtime.
 *  - Phase 1 adds JWT, email, and security sections.
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
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
    frontendUrl: string;
  };
  security: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
  };
  throttle: {
    ttl: number;
    limit: number;
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
  jwt: {
    accessSecret: process.env['JWT_ACCESS_SECRET'] ?? 'CHANGE_THIS_ACCESS_SECRET_IN_PRODUCTION',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'CHANGE_THIS_REFRESH_SECRET_IN_PRODUCTION',
    accessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  },
  email: {
    host: process.env['EMAIL_HOST'] ?? 'smtp.mailtrap.io',
    port: parseInt(process.env['EMAIL_PORT'] ?? '587', 10),
    secure: process.env['EMAIL_SECURE'] === 'true',
    user: process.env['EMAIL_USER'] ?? '',
    password: process.env['EMAIL_PASSWORD'] ?? '',
    from: process.env['EMAIL_FROM'] ?? 'noreply@interntracker.ai',
    frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:8081',
  },
  security: {
    bcryptRounds: parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10),
    maxLoginAttempts: parseInt(process.env['MAX_LOGIN_ATTEMPTS'] ?? '5', 10),
    lockoutDurationMinutes: parseInt(process.env['LOCKOUT_DURATION_MINUTES'] ?? '15', 10),
  },
  throttle: {
    ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60000', 10),
    limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '10', 10),
  },
});
