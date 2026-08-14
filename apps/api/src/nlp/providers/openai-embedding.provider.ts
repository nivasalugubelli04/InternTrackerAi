import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '../../config/configuration';

import { IEmbeddingProvider } from './embedding-provider.interface';

@Injectable()
export class OpenAiEmbeddingProvider implements IEmbeddingProvider {
  private readonly logger = new Logger(OpenAiEmbeddingProvider.name);
  readonly modelName = 'text-embedding-3-small';
  readonly dimension = 1536;

  constructor(private configService: ConfigService<AppConfig, true>) {}

  async generateEmbedding(text: string): Promise<number[]> {
    const res = await this.generateEmbeddings([text]);
    if (!res?.length) throw new Error('Failed to generate embedding');
    const embedding = res[0];
    if (!embedding) throw new Error('Embedding is undefined');
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const apiKey = this.configService.get('ai', { infer: true }).apiKey;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    try {
      // Direct fetch to OpenAI API
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: texts,
          model: this.modelName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`OpenAI API error: ${response.status} - ${errorText}`);
        throw new Error(`OpenAI API returned status ${response.status}`);
      }

      const data = (await response.json()) as any;

      // Ensure the order is maintained by sorting based on the index returned by OpenAI
      data.data.sort((a: any, b: any) => a.index - b.index);
      return data.data.map((item: any) => item.embedding);
    } catch (error) {
      this.logger.error('Failed to generate embeddings', error);
      throw error;
    }
  }
}
