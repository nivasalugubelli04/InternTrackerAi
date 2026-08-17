import { AI_PROVIDER_TOKEN } from './ai-provider.interface';
import { FailoverAiProvider } from './failover-ai.provider';

export const AIProviderFactory = {
  provide: AI_PROVIDER_TOKEN,
  useFactory: (failoverAiProvider: FailoverAiProvider) => {
    return failoverAiProvider;
  },
  inject: [FailoverAiProvider],
};
