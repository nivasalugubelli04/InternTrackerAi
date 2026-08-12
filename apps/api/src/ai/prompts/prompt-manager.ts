import { Injectable } from '@nestjs/common';

export interface PromptTemplate {
  name: string;
  version: string;
  systemInstruction: string;
  userInstructionTemplate: string;
  expectedSchema?: Record<string, any>;
}

@Injectable()
export class PromptManager {
  private readonly prompts = new Map<string, PromptTemplate>();

  register(template: PromptTemplate): void {
    this.prompts.set(template.name, template);
  }

  get(name: string): PromptTemplate {
    const template = this.prompts.get(name);
    if (!template) {
      throw new Error(`Prompt template "${name}" not registered`);
    }
    return template;
  }

  compile(name: string, variables: Record<string, string>): { system: string; user: string } {
    const template = this.get(name);
    let userPrompt = template.userInstructionTemplate;
    for (const [key, value] of Object.entries(variables)) {
      userPrompt = userPrompt.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return {
      system: template.systemInstruction,
      user: userPrompt,
    };
  }
}
