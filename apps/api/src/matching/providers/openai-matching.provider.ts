import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { NormalizedJob } from '../services/job-analyzer.service';
import type { NormalizedProfile } from '../services/profile-analyzer.service';

import type { IMatchingProvider, MatchResult } from './matching-provider.interface';
import { RuleBasedMatchingProvider } from './rule-based-matching.provider';

@Injectable()
export class OpenAiMatchingProvider implements IMatchingProvider {
  private readonly logger = new Logger(OpenAiMatchingProvider.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly fallbackProvider: RuleBasedMatchingProvider,
  ) {}

  async calculateMatch(profile: NormalizedProfile, job: NormalizedJob): Promise<MatchResult> {
    const apiKey = this.configService.get<string>('matching.openaiApiKey');

    if (!apiKey) {
      this.logger.warn(
        'OpenAI API key not configured (MATCHING_STRATEGY=openai). Falling back to RuleBasedMatchingProvider.',
      );
      return this.fallbackProvider.calculateMatch(profile, job);
    }

    // Stub for future OpenAI LLM matching integration
    this.logger.log(`OpenAI Provider active for user ${profile.userId} and job ${job.jobId}`);

    // Fallback to rule-based logic until OpenAI LLM API integration is enabled by administrator
    return this.fallbackProvider.calculateMatch(profile, job);
  }
}
