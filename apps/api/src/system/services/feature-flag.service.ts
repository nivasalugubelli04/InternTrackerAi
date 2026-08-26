import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../redis/redis.service';

export type FeatureFlagKey =
  | 'AI_COPILOT_STREAMING'
  | 'AUTONOMOUS_RESEARCH'
  | 'STRATEGY_OPTIMIZATION'
  | 'ADVANCED_SIMULATION'
  | 'HIGH_COST_REASONING'
  | 'EXTERNAL_CALENDAR_SYNC'
  | 'PUSH_NOTIFICATIONS';

export interface FeatureFlagConfig {
  enabled: boolean;
  percentage?: number; // 0 - 100 rollout percentage
  allowedUsers?: string[];
  description: string;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  // In-memory default configurations for instant local / offline fallback
  private readonly defaultFlags: Record<FeatureFlagKey, FeatureFlagConfig> = {
    AI_COPILOT_STREAMING: {
      enabled: true,
      percentage: 100,
      description: 'Real-time AI Copilot token streaming',
    },
    AUTONOMOUS_RESEARCH: {
      enabled: true,
      percentage: 100,
      description: 'Autonomous career research discovery',
    },
    STRATEGY_OPTIMIZATION: {
      enabled: true,
      percentage: 100,
      description: 'Phase 49 strategy optimization engine',
    },
    ADVANCED_SIMULATION: {
      enabled: true,
      percentage: 100,
      description: 'Phase 46 What-If Career Simulation',
    },
    HIGH_COST_REASONING: {
      enabled: true,
      percentage: 100,
      description: 'Deep LLM reasoning for career roadmaps',
    },
    EXTERNAL_CALENDAR_SYNC: {
      enabled: true,
      percentage: 100,
      description: 'Google Calendar integration sync',
    },
    PUSH_NOTIFICATIONS: {
      enabled: true,
      percentage: 100,
      description: 'Web/Mobile push notifications',
    },
  };

  constructor(private readonly redis: RedisService) {}

  /**
   * Checks if a specific feature is enabled for a given user.
   */
  async isEnabled(flag: FeatureFlagKey, userId?: string): Promise<boolean> {
    try {
      const redisClient = this.redis.getClient();
      const override = await redisClient.get(`feature_flag:${flag}`);

      let config: FeatureFlagConfig = this.defaultFlags[flag] || { enabled: true, description: '' };

      if (override) {
        try {
          config = JSON.parse(override);
        } catch {
          config = { ...config, enabled: override === 'true' || override === '1' };
        }
      }

      if (!config.enabled) return false;

      // User specific whitelist check
      if (userId && config.allowedUsers && config.allowedUsers.length > 0) {
        return config.allowedUsers.includes(userId);
      }

      // Percentage rollout check
      if (userId && config.percentage !== undefined && config.percentage < 100) {
        const hash = this.simpleHash(`${flag}:${userId}`);
        return hash % 100 < config.percentage;
      }

      return config.enabled;
    } catch {
      // Safe fallback to default configuration on redis error
      return this.defaultFlags[flag]?.enabled ?? true;
    }
  }

  /**
   * Updates or overrides a feature flag setting.
   */
  async setFlag(flag: FeatureFlagKey, config: Partial<FeatureFlagConfig>): Promise<void> {
    try {
      const current = this.defaultFlags[flag] || { enabled: true, description: '' };
      const updated = { ...current, ...config };
      const redisClient = this.redis.getClient();
      await redisClient.set(`feature_flag:${flag}`, JSON.stringify(updated), 'EX', 86400 * 30);
      this.logger.log(`Updated feature flag [${flag}]: enabled=${updated.enabled}`);
    } catch (err: any) {
      this.logger.warn(`Failed to persist feature flag to Redis: ${err.message}`);
    }
  }

  /**
   * Lists all active feature flags.
   */
  async getAllFlags(): Promise<Record<FeatureFlagKey, FeatureFlagConfig>> {
    const flags = { ...this.defaultFlags };
    try {
      const redisClient = this.redis.getClient();
      for (const key of Object.keys(this.defaultFlags) as FeatureFlagKey[]) {
        const override = await redisClient.get(`feature_flag:${key}`);
        if (override) {
          try {
            flags[key] = JSON.parse(override);
          } catch {
            flags[key].enabled = override === 'true';
          }
        }
      }
    } catch {
      // return defaults on error
    }
    return flags;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
