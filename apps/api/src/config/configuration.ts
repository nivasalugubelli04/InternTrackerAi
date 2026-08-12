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
  scrapers: {
    intervalMs: number;
    concurrency: number;
    retryCount: number;
    timeoutMs: number;
    userAgent: string;
    headless: boolean;
  };
  matching: {
    strategy: string;
    openaiApiKey: string;
    defaultLimit: number;
    weights: {
      skills: number;
      role: number;
      location: number;
      company: number;
      cgpa: number;
      stipend: number;
      experience: number;
    };
    thresholds: {
      perfectMatch: number;
      strongMatch: number;
      goodMatch: number;
      explore: number;
    };
    priorityThresholds: {
      high: number;
      medium: number;
    };
  };
  notifications: {
    /** SendGrid API key — used for transactional email */
    sendgridApiKey: string;
    sendgridFrom: string;
    /** Firebase Admin SDK credentials for FCM push */
    fcmProjectId: string;
    fcmPrivateKey: string;
    fcmClientEmail: string;
    /** Twilio — gated by twilioEnabled feature flag */
    twilioEnabled: boolean;
    twilioSid: string;
    twilioToken: string;
    twilioFrom: string;
    /** Match-score thresholds that govern channel selection */
    thresholds: {
      /** ≥ this → instant Push + Email */
      instantPushEmail: number;
      /** ≥ this → Push only */
      pushOnly: number;
      /** ≥ this → Email only */
      emailOnly: number;
      /** below emailOnly → digest */
      digestOnly: number;
    };
    /** Default frequency limits (overridden per-user in NotificationPreference) */
    frequencyLimits: {
      maxPerDay: number;
      maxInstantPerDay: number;
    };
    digest: {
      /** Hour (0-23) for daily digest — weekdays */
      dailyHour: number;
      /** Cron expression for daily digest */
      dailyCron: string;
      /** Hour (0-23) for weekly digest — Sunday */
      weeklyHour: number;
      /** Cron expression for weekly digest */
      weeklyCron: string;
    };
    /** Maximum delivery retry attempts before DLQ */
    maxRetries: number;
    /** Base delay in ms for exponential backoff */
    retryBaseDelayMs: number;
  };
  ai: {
    enabled: boolean;
    provider: string;
    model: string;
    apiKey: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
    features: {
      chatEnabled: boolean;
      resumeAnalysisEnabled: boolean;
      coverLetterEnabled: boolean;
      interviewEnabled: boolean;
      roadmapEnabled: boolean;
    };
    rateLimits: {
      chatPerHour: number;
      resumePerDay: number;
      coverLetterPerDay: number;
      interviewPerDay: number;
    };
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
    limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10),
  },
  scrapers: {
    intervalMs: parseInt(process.env['SCRAPE_INTERVAL_MS'] ?? '21600000', 10), // Default 6 hours
    concurrency: parseInt(process.env['SCRAPER_CONCURRENCY'] ?? '5', 10),
    retryCount: parseInt(process.env['SCRAPER_RETRY_COUNT'] ?? '3', 10),
    timeoutMs: parseInt(process.env['SCRAPER_TIMEOUT_MS'] ?? '60000', 10),
    userAgent: process.env['SCRAPER_USER_AGENT'] ?? 'InternTrackerAI-Scraper/1.0',
    headless: process.env['SCRAPER_HEADLESS'] !== 'false',
  },
  matching: {
    strategy: process.env['MATCHING_STRATEGY'] ?? 'rule-based',
    openaiApiKey: process.env['OPENAI_API_KEY'] ?? '',
    defaultLimit: parseInt(process.env['MATCHING_DEFAULT_LIMIT'] ?? '20', 10),
    weights: {
      skills: parseFloat(process.env['MATCH_WEIGHT_SKILLS'] ?? '35'),
      role: parseFloat(process.env['MATCH_WEIGHT_ROLE'] ?? '20'),
      location: parseFloat(process.env['MATCH_WEIGHT_LOCATION'] ?? '15'),
      company: parseFloat(process.env['MATCH_WEIGHT_COMPANY'] ?? '10'),
      cgpa: parseFloat(process.env['MATCH_WEIGHT_CGPA'] ?? '10'),
      stipend: parseFloat(process.env['MATCH_WEIGHT_STIPEND'] ?? '5'),
      experience: parseFloat(process.env['MATCH_WEIGHT_EXPERIENCE'] ?? '5'),
    },
    thresholds: {
      perfectMatch: parseFloat(process.env['MATCH_THRESHOLD_PERFECT'] ?? '90'),
      strongMatch: parseFloat(process.env['MATCH_THRESHOLD_STRONG'] ?? '80'),
      goodMatch: parseFloat(process.env['MATCH_THRESHOLD_GOOD'] ?? '70'),
      explore: parseFloat(process.env['MATCH_THRESHOLD_EXPLORE'] ?? '50'),
    },
    priorityThresholds: {
      high: parseFloat(process.env['PRIORITY_THRESHOLD_HIGH'] ?? '80'),
      medium: parseFloat(process.env['PRIORITY_THRESHOLD_MEDIUM'] ?? '60'),
    },
  },
  notifications: {
    // ── SendGrid (email) ────────────────────────────────────────────────────
    sendgridApiKey: process.env['SENDGRID_API_KEY'] ?? '',
    sendgridFrom: process.env['SENDGRID_FROM'] ?? 'noreply@interntracker.ai',
    // ── Firebase Cloud Messaging (push) ─────────────────────────────────────
    fcmProjectId: process.env['FCM_PROJECT_ID'] ?? '',
    fcmPrivateKey: (process.env['FCM_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n'),
    fcmClientEmail: process.env['FCM_CLIENT_EMAIL'] ?? '',
    // ── Twilio (SMS — feature flag disabled by default) ──────────────────────
    twilioEnabled: process.env['TWILIO_ENABLED'] === 'true',
    twilioSid: process.env['TWILIO_SID'] ?? '',
    twilioToken: process.env['TWILIO_TOKEN'] ?? '',
    twilioFrom: process.env['TWILIO_FROM'] ?? '',
    // ── Score-to-channel thresholds ─────────────────────────────────────────
    thresholds: {
      instantPushEmail: parseFloat(process.env['NOTIF_THRESHOLD_INSTANT_PUSH_EMAIL'] ?? '90'),
      pushOnly: parseFloat(process.env['NOTIF_THRESHOLD_PUSH_ONLY'] ?? '80'),
      emailOnly: parseFloat(process.env['NOTIF_THRESHOLD_EMAIL_ONLY'] ?? '70'),
      digestOnly: parseFloat(process.env['NOTIF_THRESHOLD_DIGEST_ONLY'] ?? '50'),
    },
    // ── Global frequency limits ─────────────────────────────────────────────
    frequencyLimits: {
      maxPerDay: parseInt(process.env['NOTIF_MAX_PER_DAY'] ?? '10', 10),
      maxInstantPerDay: parseInt(process.env['NOTIF_MAX_INSTANT_PER_DAY'] ?? '5', 10),
    },
    // ── Digest schedule ─────────────────────────────────────────────────────
    digest: {
      dailyHour: parseInt(process.env['DIGEST_DAILY_HOUR'] ?? '17', 10),
      dailyCron: process.env['DIGEST_DAILY_CRON'] ?? '0 17 * * 1-5', // Mon-Fri 17:00
      weeklyHour: parseInt(process.env['DIGEST_WEEKLY_HOUR'] ?? '18', 10),
      weeklyCron: process.env['DIGEST_WEEKLY_CRON'] ?? '0 18 * * 0', // Sunday 18:00
    },
    // ── Retry policy ────────────────────────────────────────────────────────
    maxRetries: parseInt(process.env['NOTIF_MAX_RETRIES'] ?? '3', 10),
    retryBaseDelayMs: parseInt(process.env['NOTIF_RETRY_BASE_DELAY_MS'] ?? '5000', 10),
  },
  ai: {
    enabled: process.env['AI_ENABLED'] === 'true',
    provider: process.env['AI_PROVIDER'] ?? 'gemini',
    model: process.env['AI_MODEL'] ?? 'gemini-1.5-flash',
    apiKey: process.env['AI_API_KEY'] ?? '',
    maxTokens: parseInt(process.env['AI_MAX_TOKENS'] ?? '2048', 10),
    temperature: parseFloat(process.env['AI_TEMPERATURE'] ?? '0.3'),
    timeout: parseInt(process.env['AI_TIMEOUT'] ?? '30000', 10),
    features: {
      chatEnabled: process.env['AI_CHAT_ENABLED'] !== 'false',
      resumeAnalysisEnabled: process.env['AI_RESUME_ANALYSIS_ENABLED'] !== 'false',
      coverLetterEnabled: process.env['AI_COVER_LETTER_ENABLED'] !== 'false',
      interviewEnabled: process.env['AI_INTERVIEW_ENABLED'] !== 'false',
      roadmapEnabled: process.env['AI_ROADMAP_ENABLED'] !== 'false',
    },
    rateLimits: {
      chatPerHour: parseInt(process.env['AI_RATE_LIMIT_CHAT_PER_HOUR'] ?? '30', 10),
      resumePerDay: parseInt(process.env['AI_RATE_LIMIT_RESUME_PER_DAY'] ?? '3', 10),
      coverLetterPerDay: parseInt(process.env['AI_RATE_LIMIT_COVER_LETTER_PER_DAY'] ?? '10', 10),
      interviewPerDay: parseInt(process.env['AI_RATE_LIMIT_INTERVIEW_PER_DAY'] ?? '10', 10),
    },
  },
});
