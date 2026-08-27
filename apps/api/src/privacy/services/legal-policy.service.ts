import { Injectable } from '@nestjs/common';

export interface LegalDocument {
  title: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  summary: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
}

@Injectable()
export class LegalPolicyService {
  getTermsOfService(): LegalDocument {
    return {
      title: 'Terms of Service',
      version: '2026-08.1',
      effectiveDate: 'August 1, 2026',
      lastUpdated: 'August 27, 2026',
      summary:
        'These Terms govern your use of the InternTracker AI platform, subscription services, and AI career guidance tools.',
      sections: [
        {
          heading: '1. Platform Purpose & Scope',
          content:
            'InternTracker AI provides software tools for career exploration, internship tracking, skill analysis, and AI-assisted application optimization.',
        },
        {
          heading: '2. User Accounts & Responsibilities',
          content:
            'You are responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your account.',
        },
        {
          heading: '3. Subscription, Billing & Cancellation',
          content:
            'Paid plans are billed in advance on a recurring monthly or annual basis. You may cancel at any time; access continues through the paid period.',
        },
        {
          heading: '4. AI Career Assistance Disclaimer',
          content:
            'AI tools provide guidance and estimations only. InternTracker AI makes no representation or warranty regarding job placement or interview success.',
        },
        {
          heading: '5. Limitation of Liability',
          content:
            'To the maximum extent permitted by law, InternTracker AI shall not be liable for indirect, incidental, or consequential damages.',
        },
      ],
    };
  }

  getPrivacyPolicy(): LegalDocument {
    return {
      title: 'Privacy Policy',
      version: '2026-08.1',
      effectiveDate: 'August 1, 2026',
      lastUpdated: 'August 27, 2026',
      summary:
        'This Privacy Policy describes how InternTracker AI collects, uses, protects, and gives you control over your personal career information.',
      sections: [
        {
          heading: '1. Information We Collect',
          content:
            'We collect career profile details, skill sets, application records, search preferences, and optional resume text to deliver personalized features.',
        },
        {
          heading: '2. How We Use Your Data',
          content:
            'Data is processed to calculate opportunity match scores, personalize AI copilot recommendations, and manage application pipelines.',
        },
        {
          heading: '3. Data Sharing & Third Parties',
          content:
            'We never sell your personal data. We partner with secure providers (e.g. Stripe for payments, Gemini/OpenAI for compute) strictly under data processing agreements.',
        },
        {
          heading: '4. Your Data Rights & Controls',
          content:
            'You retain full rights to view, export in JSON format, correct, or request staged deletion of your personal data at any time via the Privacy Center.',
        },
        {
          heading: '5. Data Retention & Purge Policy',
          content:
            'Deleted accounts enter a 14-day recovery window before permanent cascading purge. Financial transaction logs are retained for statutory tax requirements.',
        },
      ],
    };
  }

  getAiTransparencyPolicy(): LegalDocument {
    return {
      title: 'AI Transparency & Limitations Policy',
      version: '2026-08.1',
      effectiveDate: 'August 1, 2026',
      lastUpdated: 'August 27, 2026',
      summary:
        'Transparent explanation of how artificial intelligence models operate within InternTracker AI, their constraints, and user controls.',
      sections: [
        {
          heading: '1. AI Models Employed',
          content:
            'We utilize state-of-the-art multimodal LLMs (Google Gemini 1.5 Pro / Flash with automated OpenAI failover) for semantic analysis and simulation.',
        },
        {
          heading: '2. Scope of AI Recommendations',
          content:
            'AI tools generate advisory career simulations, resume alignment suggestions, and personalized study roadmaps based on user-provided profile context.',
        },
        {
          heading: '3. Explicit Non-Guarantees',
          content:
            'AI output does not constitute hiring guarantees, wage promises, or certified legal/financial counsel. Users must exercise independent judgment.',
        },
        {
          heading: '4. User Feedback & Model Safeguards',
          content:
            'Users can flag inaccurate or unhelpful AI suggestions via contextual feedback buttons to improve platform safety and alignment.',
        },
      ],
    };
  }

  getAcceptableUsePolicy(): LegalDocument {
    return {
      title: 'Acceptable Use Policy',
      version: '2026-08.1',
      effectiveDate: 'August 1, 2026',
      lastUpdated: 'August 27, 2026',
      summary: 'Rules governing fair, secure, and respectful use of the InternTracker AI platform.',
      sections: [
        {
          heading: '1. Prohibited Conduct',
          content:
            'Users may not reverse engineer AI systems, conduct unauthorized scraping, bypass rate limits, or impersonate other candidates or recruiters.',
        },
        {
          heading: '2. System Integrity',
          content:
            'Any attempt to probe, scan, or breach platform security without written authorization is strictly prohibited and subject to account termination.',
        },
      ],
    };
  }
}
