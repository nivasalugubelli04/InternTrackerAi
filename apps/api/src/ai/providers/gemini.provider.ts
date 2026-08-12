import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';

import type { AIProvider, GenerateOptions, TextResult } from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AIProvider {
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
    const model = this.aiConfig.model || 'gemini-1.5-flash';
    const temperature = options?.temperature ?? this.aiConfig.temperature ?? 0.3;
    const maxTokens = options?.maxTokens ?? this.aiConfig.maxTokens ?? 2048;
    const timeoutMs = options?.timeoutMs ?? this.aiConfig.timeout ?? 30000;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: Record<string, any> = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    if (systemInstruction) {
      body['systemInstruction'] = {
        parts: [{ text: systemInstruction }],
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Gemini API error: ${response.statusText} - ${errorText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = (await response.json()) as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const usage = {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      };

      return { text, usage, model };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new HttpException('Gemini request timed out', HttpStatus.GATEWAY_TIMEOUT);
      }
      throw new HttpException(err.message || 'Gemini error', HttpStatus.BAD_GATEWAY);
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    _schema: any,
    systemInstruction?: string,
    options?: GenerateOptions,
  ): Promise<T & { usage: TextResult['usage']; model: string }> {
    const apiKey = this.aiConfig.apiKey;
    const model = this.aiConfig.model || 'gemini-1.5-flash';
    const temperature = options?.temperature ?? this.aiConfig.temperature ?? 0.3;
    const maxTokens = options?.maxTokens ?? this.aiConfig.maxTokens ?? 2048;
    const timeoutMs = options?.timeoutMs ?? this.aiConfig.timeout ?? 30000;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: Record<string, any> = {
      contents: [
        {
          parts: [
            {
              text: `${prompt}\n\nYou MUST respond ONLY with a valid JSON object matching the requested schema.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
      },
    };

    if (systemInstruction) {
      body['systemInstruction'] = {
        parts: [{ text: systemInstruction }],
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Gemini API error: ${response.statusText} - ${errorText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = (await response.json()) as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const usage = {
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      };

      let parsed: T;
      try {
        parsed = JSON.parse(text) as T;
      } catch (jsonErr) {
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
        throw new HttpException('Gemini request timed out', HttpStatus.GATEWAY_TIMEOUT);
      }
      throw new HttpException(err.message || 'Gemini error', HttpStatus.BAD_GATEWAY);
    }
  }
}
