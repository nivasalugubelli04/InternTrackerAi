import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';

import type { AIProvider, GenerateOptions, TextResult } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';

@Injectable()
export class FailoverAiProvider implements AIProvider {
  private readonly logger = new Logger(FailoverAiProvider.name);

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly gemini: GeminiProvider,
    private readonly openai: OpenAIProvider,
    private readonly prisma: PrismaService,
  ) {}

  private get aiConfig() {
    return this.configService.get('ai', { infer: true });
  }

  async generateText(
    prompt: string,
    systemInstruction?: string,
    options?: GenerateOptions,
  ): Promise<TextResult> {
    const primaryName = this.aiConfig.provider || 'gemini';
    const primary = primaryName.toLowerCase() === 'openai' ? this.openai : this.gemini;
    const fallback = primaryName.toLowerCase() === 'openai' ? this.gemini : this.openai;
    const fallbackName = primaryName.toLowerCase() === 'openai' ? 'gemini' : 'openai';

    try {
      return await this.executeWithRetry(
        () => primary.generateText(prompt, systemInstruction, options),
        `primary-${primaryName}`,
      );
    } catch (err) {
      this.logger.error(
        `Primary AI Provider (${primaryName}) failed. Triggering failover to ${fallbackName}. Error: ${err instanceof Error ? err.message : String(err)}`,
      );

      // Log SRE Failover Event
      await this.logFailoverIncident(primaryName, fallbackName, err);

      try {
        const result = await fallback.generateText(prompt, systemInstruction, options);
        this.logger.log(`Failover to Fallback Provider (${fallbackName}) successful.`);
        return result;
      } catch (fallbackErr) {
        this.logger.error(
          `Fallback AI Provider (${fallbackName}) failed too. AI service completely unavailable.`,
        );
        await this.logCriticalOutage(primaryName, fallbackName, fallbackErr);
        throw fallbackErr;
      }
    }
  }

  async generateStructuredOutput<T>(
    prompt: string,
    schema: any,
    systemInstruction?: string,
    options?: GenerateOptions,
  ): Promise<T & { usage: TextResult['usage']; model: string }> {
    const primaryName = this.aiConfig.provider || 'gemini';
    const primary = primaryName.toLowerCase() === 'openai' ? this.openai : this.gemini;
    const fallback = primaryName.toLowerCase() === 'openai' ? this.gemini : this.openai;
    const fallbackName = primaryName.toLowerCase() === 'openai' ? 'gemini' : 'openai';

    try {
      return await this.executeWithRetry(
        () => primary.generateStructuredOutput<T>(prompt, schema, systemInstruction, options),
        `primary-${primaryName}`,
      );
    } catch (err) {
      this.logger.error(
        `Primary AI Provider (${primaryName}) structured output failed. Triggering failover to ${fallbackName}. Error: ${err instanceof Error ? err.message : String(err)}`,
      );

      // Log SRE Failover Event
      await this.logFailoverIncident(primaryName, fallbackName, err);

      try {
        const result = await fallback.generateStructuredOutput<T>(
          prompt,
          schema,
          systemInstruction,
          options,
        );
        this.logger.log(
          `Structured Output failover to Fallback Provider (${fallbackName}) successful.`,
        );
        return result;
      } catch (fallbackErr) {
        this.logger.error(`Fallback AI Provider (${fallbackName}) structured output failed too.`);
        await this.logCriticalOutage(primaryName, fallbackName, fallbackErr);
        throw fallbackErr;
      }
    }
  }

  private async executeWithRetry<R>(
    operation: () => Promise<R>,
    label: string,
    maxAttempts = 3,
  ): Promise<R> {
    let lastError: any;
    let delay = 200; // start 200ms

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (err: any) {
        lastError = err;
        // Do not retry permanent errors
        if (err instanceof HttpException && err.getStatus() < 500 && err.getStatus() !== 429) {
          throw err;
        }

        if (attempt === maxAttempts) break;

        const jitter = Math.random() * 50;
        const sleepTime = delay + jitter;
        this.logger.warn(
          `AI attempt ${attempt} for ${label} failed. Retrying in ${Math.round(sleepTime)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, sleepTime));
        delay *= 2; // exponential backoff
      }
    }
    throw lastError;
  }

  private async logFailoverIncident(primary: string, fallback: string, error: any): Promise<void> {
    try {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // 1. Create SRE Incident
      const incident = await this.prisma.incident.create({
        data: {
          title: `AI Provider Failover: ${primary} -> ${fallback}`,
          severity: 'P1',
          status: 'MITIGATING',
          component: 'AI',
          description: `Primary AI provider ${primary} failed with error: ${errorMsg}. Automatically failing over to ${fallback}.`,
        },
      });

      // 2. Log Incident Event
      await this.prisma.incidentEvent.create({
        data: {
          incidentId: incident.id,
          status: 'MITIGATING',
          message: `Incident detected. Failover execution triggered automatically.`,
        },
      });

      // 3. Log Recovery Action
      await this.prisma.recoveryAction.create({
        data: {
          action: `Failover to fallback provider: ${fallback}`,
          component: 'AI',
          trigger: `Primary provider ${primary} threw exception: ${errorMsg}`,
          result: `Routed AI call to ${fallback}.`,
          beforeStatus: 'WARNING',
          afterStatus: 'HEALTHY',
          operator: 'SYSTEM',
        },
      });
    } catch (e) {
      this.logger.error(
        `Failed to write failover logs: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async logCriticalOutage(primary: string, fallback: string, error: any): Promise<void> {
    try {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Create SRE Incident
      const incident = await this.prisma.incident.create({
        data: {
          title: `CRITICAL: AI Provider Outage`,
          severity: 'P0',
          status: 'DETECTED',
          component: 'AI',
          description: `Both primary (${primary}) and fallback (${fallback}) providers failed. AI service completely unavailable. Fallback error: ${errorMsg}`,
        },
      });

      await this.prisma.incidentEvent.create({
        data: {
          incidentId: incident.id,
          status: 'DETECTED',
          message: `Both primary and fallback AI models failed. Manual SRE inspection required.`,
        },
      });
    } catch (e) {
      this.logger.error(
        `Failed to write critical outage logs: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
