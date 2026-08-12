import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';

import { AI_PROVIDER_TOKEN } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';

export const AIProviderFactory = {
  provide: AI_PROVIDER_TOKEN,
  useFactory: (
    configService: ConfigService<AppConfig, true>,
    openaiProvider: OpenAIProvider,
    geminiProvider: GeminiProvider,
  ) => {
    const providerName = configService.get('ai.provider', { infer: true }) ?? 'gemini';
    if (providerName.toLowerCase() === 'openai') {
      return openaiProvider;
    }
    return geminiProvider;
  },
  inject: [ConfigService, OpenAIProvider, GeminiProvider],
};
