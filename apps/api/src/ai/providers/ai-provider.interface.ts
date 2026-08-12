export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  stream?: boolean;
  onChunk?: (text: string) => void;
}

export interface TextResult {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
}

export const AI_PROVIDER_TOKEN = 'AI_PROVIDER_TOKEN';

export interface AIProvider {
  /**
   * Generates standard text response from the LLM.
   */
  generateText(
    prompt: string,
    systemInstruction?: string,
    options?: GenerateOptions,
  ): Promise<TextResult>;

  /**
   * Generates validated structured JSON output from the LLM.
   */
  generateStructuredOutput<T>(
    prompt: string,
    schema: any, // JSON schema or Zod schema structure
    systemInstruction?: string,
    options?: GenerateOptions,
  ): Promise<T & { usage: TextResult['usage']; model: string }>;
}
