import { Injectable, Logger } from '@nestjs/common';

import { CopilotIntentType } from '../interfaces/copilot.interfaces';

export interface IntentAnalysisResult {
  primaryIntent: CopilotIntentType;
  secondaryIntents: CopilotIntentType[];
  extractedKeywords: string[];
  extractedSkillOrRole?: string | undefined;
  isMultiEngine: boolean;
}

@Injectable()
export class CopilotIntentService {
  private readonly logger = new Logger(CopilotIntentService.name);

  /**
   * Understands and routes user query into deterministic primary and secondary intents.
   */
  analyzeIntent(message: string): IntentAnalysisResult {
    this.logger.debug(`Analyzing intent for: "${message.substring(0, 30)}..."`);
    const text = message.toLowerCase().trim();
    const secondaryIntents: CopilotIntentType[] = [];
    const extractedKeywords: string[] = [];

    // 1. Daily Planning
    const isDaily =
      text.includes('today') ||
      text.includes('daily plan') ||
      text.includes('focus on today') ||
      text.includes('next task');
    if (isDaily) secondaryIntents.push('DAILY_PLANNING');

    // 2. Weekly Planning & Sprints
    const isWeekly =
      text.includes('this week') ||
      text.includes('weekly') ||
      text.includes('sprint') ||
      text.includes('plan my week');
    if (isWeekly) secondaryIntents.push('WEEKLY_PLANNING');

    // 3. Career Simulation
    const isSimulation =
      text.includes('what happens if') ||
      text.includes('what if i') ||
      text.includes('simulate') ||
      text.includes('if i focus on') ||
      text.includes('if i spend');
    if (isSimulation) secondaryIntents.push('CAREER_SIMULATION');

    // 4. Portfolio & Project
    const isPortfolio =
      text.includes('portfolio') ||
      text.includes('project') ||
      text.includes('evidence') ||
      text.includes('github') ||
      text.includes('build next');
    if (isPortfolio) secondaryIntents.push('PORTFOLIO_ANALYSIS');

    // 5. Skills & Weakness
    const isSkill =
      text.includes('skill') ||
      text.includes('learn') ||
      text.includes('weakness') ||
      text.includes('gap') ||
      text.includes('roadmap') ||
      text.includes('technology');
    if (isSkill) secondaryIntents.push('SKILL_ANALYSIS');

    // 6. Opportunity & Research
    const isOpportunity =
      text.includes('internship') ||
      text.includes('job') ||
      text.includes('opportunity') ||
      text.includes('opportunities') ||
      text.includes('find internships') ||
      text.includes('ready for this');
    if (isOpportunity) secondaryIntents.push('OPPORTUNITY_ANALYSIS');

    // 7. Application Analytics & Outcomes
    const isApplication =
      text.includes('interview calls') ||
      text.includes('rejection') ||
      text.includes('not getting interviews') ||
      text.includes('conversion') ||
      text.includes('application history') ||
      text.includes('applied');
    if (isApplication) secondaryIntents.push('APPLICATION_ANALYSIS');

    // 8. Trajectory & Progress
    const isProgress =
      text.includes('progress') ||
      text.includes('trajectory') ||
      text.includes('how am i doing') ||
      text.includes('career status');
    if (isProgress) secondaryIntents.push('PROGRESS_ANALYSIS');

    // 9. Comparison & Trade-offs
    const isComparison =
      text.includes('compare') ||
      text.includes('versus') ||
      text.includes(' vs ') ||
      text.includes('which is better') ||
      text.includes('should i improve my portfolio or apply');
    if (isComparison) secondaryIntents.push('CAREER_COMPARISON');

    // 10. Prioritization & Bottlenecks
    const isPriority =
      text.includes('prioritize') ||
      text.includes('priority') ||
      text.includes('bottleneck') ||
      text.includes('biggest hurdle');
    if (isPriority) secondaryIntents.push('PRIORITY_ANALYSIS');

    // Determine Primary Intent
    let primaryIntent: CopilotIntentType = 'GENERAL_CAREER_GUIDANCE';

    if (isComparison || secondaryIntents.length >= 2) {
      if (isComparison) {
        primaryIntent = 'CAREER_COMPARISON';
      } else {
        primaryIntent = secondaryIntents[0] || 'MULTI_ENGINE';
      }
    } else if (secondaryIntents.length === 1 && secondaryIntents[0]) {
      primaryIntent = secondaryIntents[0];
    } else {
      primaryIntent = 'GENERAL_CAREER_GUIDANCE';
    }

    // Extract potential target skill or role for simulation/skills (e.g. MLOps, AI Engineer)
    let extractedSkillOrRole: string | undefined;
    const skillMatches = message.match(
      /(?:focus on|learn|learning|with|about)\s+([a-zA-Z0-9+#\s]{2,20})/i,
    );
    if (skillMatches?.[1]) {
      extractedSkillOrRole = skillMatches[1].trim();
    }

    const isMultiEngine = secondaryIntents.length > 1 || isComparison;

    return {
      primaryIntent,
      secondaryIntents,
      extractedKeywords,
      extractedSkillOrRole,
      isMultiEngine,
    };
  }
}
