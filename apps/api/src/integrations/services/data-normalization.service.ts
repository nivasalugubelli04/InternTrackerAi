import { Injectable } from '@nestjs/common';
import { ExternalRecordType } from '@prisma/client';

export interface NormalizedProject {
  title: string;
  description: string;
  technologies: string[];
  repoUrl?: string;
  liveUrl?: string;
  starCount?: number;
  evidenceType: 'PROJECT' | 'DEPLOYMENT';
}

export interface NormalizedSkill {
  name: string;
  category: string;
  source: string;
}

export interface NormalizedCalendarEvent {
  title: string;
  eventType: 'INTERVIEW' | 'DEADLINE' | 'FOLLOW_UP' | 'NETWORKING';
  company?: string;
  role?: string;
  scheduledAt: string;
  context?: string;
}

export interface NormalizedApplicationSignal {
  company: string;
  role?: string;
  detectedStatus: 'APPLIED' | 'ASSESSMENT' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
  confidence: 'HIGH' | 'MEDIUM';
}

@Injectable()
export class DataNormalizationService {
  /**
   * Normalizes a raw external record based on recordType.
   */
  normalize(recordType: ExternalRecordType, rawJson: Record<string, any>): Record<string, any> {
    switch (recordType) {
      case ExternalRecordType.REPOSITORY:
        return this.normalizeRepository(rawJson);
      case ExternalRecordType.CALENDAR_EVENT:
        return this.normalizeCalendarEvent(rawJson);
      case ExternalRecordType.DOCUMENT_SUMMARY:
        return this.normalizeDocumentSummary(rawJson);
      case ExternalRecordType.PORTFOLIO_LINK:
        return this.normalizePortfolioLink(rawJson);
      case ExternalRecordType.EMAIL_SIGNAL:
        return this.normalizeEmailSignal(rawJson);
      default:
        return rawJson;
    }
  }

  private normalizeRepository(raw: Record<string, any>): NormalizedProject {
    const tech = Array.from(
      new Set([raw['language'], ...(raw['topics'] || [])].filter(Boolean)),
    ) as string[];

    return {
      title: raw['name'] || 'Untitled Repository',
      description: raw['description'] || 'GitHub project repository',
      technologies: tech.length > 0 ? tech : ['Programming'],
      repoUrl: raw['html_url'] || raw['repoUrl'],
      starCount: raw['stargazers_count'] || 0,
      evidenceType: 'PROJECT',
    };
  }

  private normalizeCalendarEvent(raw: Record<string, any>): NormalizedCalendarEvent {
    const summary = (raw['summary'] || raw['title'] || '').toString();
    const summaryLower = summary.toLowerCase();

    let eventType: NormalizedCalendarEvent['eventType'] = 'NETWORKING';
    if (summaryLower.includes('interview')) eventType = 'INTERVIEW';
    else if (summaryLower.includes('deadline') || summaryLower.includes('due')) eventType = 'DEADLINE';
    else if (summaryLower.includes('follow') || summaryLower.includes('catchup')) eventType = 'FOLLOW_UP';

    // Parse company name if present (e.g., "Interview — Stripe")
    let companyRaw: string | undefined = undefined;
    if (summary.includes('—')) companyRaw = summary.split('—')[1]?.trim();
    else if (summary.includes('-')) companyRaw = summary.split('-')[1]?.trim();

    const company = companyRaw ? companyRaw.split(' ')[0] : undefined;
    const context = raw['description'] || raw['context'];

    return {
      title: summary || 'Calendar Event',
      eventType,
      scheduledAt: raw['start']?.['dateTime'] || raw['scheduledAt'] || new Date().toISOString(),
      ...(company ? { company } : {}),
      ...(context ? { context } : {}),
    };
  }

  private normalizeDocumentSummary(raw: Record<string, any>): Record<string, any> {
    return {
      title: raw['fileName'] ? `Document: ${raw['fileName']}` : 'Uploaded Document',
      extractedSkills: raw['extractedSkills'] || [],
      summary: raw['snippet'] || raw['summary'] || '',
      evidenceType: 'DOCUMENT',
    };
  }

  private normalizePortfolioLink(raw: Record<string, any>): NormalizedProject {
    return {
      title: raw['title'] || 'Portfolio Live Demo',
      description: raw['description'] || 'External portfolio project deployment',
      technologies: raw['technologies'] || ['Web Development'],
      liveUrl: raw['url'] || raw['targetUrl'],
      evidenceType: 'DEPLOYMENT',
    };
  }

  private normalizeEmailSignal(raw: Record<string, any>): NormalizedApplicationSignal {
    const subject = (raw['subject'] || '').toString();
    const sender = (raw['sender'] || '').toString();

    let detectedStatus: NormalizedApplicationSignal['detectedStatus'] = 'APPLIED';
    if (subject.toLowerCase().includes('interview')) detectedStatus = 'INTERVIEW';
    else if (subject.toLowerCase().includes('assessment') || subject.toLowerCase().includes('test')) detectedStatus = 'ASSESSMENT';
    else if (subject.toLowerCase().includes('offer')) detectedStatus = 'OFFER';
    else if (subject.toLowerCase().includes('status') || subject.toLowerCase().includes('decision')) detectedStatus = 'REJECTED';

    let company = sender.split('@')[1]?.split('.')[0] || 'Unknown Company';
    if (company.length > 1) {
      company = company.charAt(0).toUpperCase() + company.slice(1);
    }

    return {
      company,
      role: subject.split('—')[0]?.trim() || 'Role',
      detectedStatus,
      confidence: 'HIGH',
    };
  }
}
