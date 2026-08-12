import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';

import type { AIProvider, GenerateOptions, TextResult } from './ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  private get aiConfig() {
    return this.configService.get('ai', { infer: true });
  }

  async generateText(
    prompt: string,
    systemInstruction?: string,
    options?: GenerateOptions,
  ): Promise<TextResult> {
    const apiKey = this.aiConfig.apiKey;
    const model = this.aiConfig.model || 'gpt-4o-mini';
    const temperature = options?.temperature ?? this.aiConfig.temperature ?? 0.3;
    const maxTokens = options?.maxTokens ?? this.aiConfig.maxTokens ?? 2048;
    const timeoutMs = options?.timeoutMs ?? this.aiConfig.timeout ?? 30000;

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `OpenAI API error: ${response.statusText} - ${errorText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = (await response.json()) as any;
      const text = data.choices?.[0]?.message?.content ?? '';
      const usage = {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      };

      return { text, usage, model };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new HttpException('OpenAI request timed out', HttpStatus.GATEWAY_TIMEOUT);
      }
      throw new HttpException(err.message || 'OpenAI error', HttpStatus.BAD_GATEWAY);
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    _schema: any,
    systemInstruction?: string,
    options?: GenerateOptions,
  ): Promise<T & { usage: TextResult['usage']; model: string }> {
    const apiKey = this.aiConfig.apiKey;
    const model = this.aiConfig.model || 'gpt-4o-mini';
    const temperature = options?.temperature ?? this.aiConfig.temperature ?? 0.3;
    const maxTokens = options?.maxTokens ?? this.aiConfig.maxTokens ?? 2048;
    const timeoutMs = options?.timeoutMs ?? this.aiConfig.timeout ?? 30000;

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({
      role: 'user',
      content: `${prompt}\n\nYou MUST respond ONLY with a valid JSON object matching the requested schema. Do not output markdown blocks or extra text.`,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `OpenAI API error: ${response.statusText} - ${errorText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = (await response.json()) as any;
      const text = data.choices?.[0]?.message?.content ?? '';
      const usage = {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      };

      let parsed: T;
      try {
        parsed = JSON.parse(text) as T;
      } catch (jsonErr) {
        // Attempt simple repair (strip markdown blocks if any exist despite instructions)
        const cleaned = text
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        parsed = JSON.parse(cleaned) as T;
      }

      return {
        ...parsed,
        usage,
        model,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new HttpException('OpenAI request timed out', HttpStatus.GATEWAY_TIMEOUT);
      }
      throw new HttpException(err.message || 'OpenAI error', HttpStatus.BAD_GATEWAY);
    }
  }
}
