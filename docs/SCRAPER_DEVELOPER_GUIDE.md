# Internship Collection Engine – Developer Guide

The Internship Collection Engine is a high-throughput, plugin-based monitoring system built on NestJS, Prisma, BullMQ, Playwright, and Cheerio. It is responsible for discovering, normalizing, deduplicating, and persisting internship postings across thousands of companies.

---

## 🏛 System Architecture

```mermaid
flowchart TD
    Scheduler[ScrapeSchedulerService] -->|Push Jobs| Queue[BullMQ ScrapeQueue]
    Queue -->|Process Job| Worker[ScrapeProcessor]
    Worker -->|Select Adapter| Manager[ScraperManager]

    subgraph ATS Adapters
        Manager --> GH[GreenhouseAdapter]
        Manager --> LV[LeverAdapter]
        Manager --> AB[AshbyAdapter]
        Manager --> SR[SmartRecruitersAdapter]
        Manager --> WD[WorkdayAdapter]
        Manager --> HTML[GenericHtmlAdapter]
    end

    GH & LV & AB & SR & WD & HTML -->|Raw Jobs Payload| Normalizer[NormalizerService]
    Normalizer -->|Normalized DTO + SHA-256 Hash| Dedup[DeduplicationService]

    Dedup -->|Upsert| DB[(PostgreSQL Database)]
    Worker -->|Telemetry| Health[HealthMonitoringService]
    Health -->|Update Status| DB
```

---

## 🔄 Execution Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Admin API / Cron
    participant Queue as BullMQ ScrapeQueue
    participant Processor as ScrapeProcessor
    participant Manager as ScraperManager
    participant Adapter as ATS Adapter
    participant Normalizer as NormalizerService
    participant Dedup as DeduplicationService
    participant DB as PostgreSQL DB

    Admin->>Queue: Push Job { companyId }
    Queue->>Processor: Pick job from queue
    Processor->>DB: Start ScrapeJob (RUNNING)
    Processor->>Manager: getAdapterForCompany(company)
    Manager-->>Processor: Returns matching AtsAdapter
    Processor->>Adapter: scrape(company)
    Adapter-->>Processor: Returns { jobs, rawPayloads, parserVersion }

    loop For each job
        Processor->>Normalizer: normalize(companyId, job, parserType)
        Normalizer-->>Processor: Return NormalizedJobData (with SHA-256 hash)
    end

    Processor->>Dedup: processJobPostings(companyId, normalizedJobs)
    Dedup->>DB: Check & Upsert JobPosting by SHA-256 Hash / External ID
    Dedup->>DB: Save RawJobPosting snapshot
    Processor->>DB: Update ScrapeJob (COMPLETED/FAILED)
    Processor->>DB: Update ParserHealth metrics
```

---

## 🛠 How to Add a New ATS Adapter

The system is designed with the **Open-Closed Principle (SOLID)**. Adding support for a new ATS provider (e.g. `Workable`, `Teamtailor`, or `BambooHR`) requires zero changes to existing adapters or core workers.

### Step 1: Add new `ParserType` in Prisma Schema

Edit `apps/api/prisma/schema.prisma`:

```prisma
enum ParserType {
  GREENHOUSE
  LEVER
  WORKDAY
  ASHBY
  SMARTRECRUITERS
  GENERIC_HTML
  WORKABLE // <--- New parser type
  CUSTOM
  UNASSIGNED
}
```

Then run: `npm --workspace=apps/api run prisma:generate`

### Step 2: Implement the `AtsAdapter` interface

Create a new file `apps/api/src/scrapers/adapters/workable.adapter.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Company, ParserType } from '@prisma/client';
import { BaseAtsAdapter } from './base.adapter';
import { CollectedJob, CollectedJobResult } from '../interfaces/ats-adapter.interface';

@Injectable()
export class WorkableAdapter extends BaseAtsAdapter {
  readonly name = 'WorkableAdapter';
  readonly parserType = ParserType.WORKABLE;

  supports(company: Company): boolean {
    if (company.parserType === ParserType.WORKABLE) return true;
    return !!(company.careerPageUrl && company.careerPageUrl.includes('workable.com'));
  }

  async scrape(company: Company): Promise<CollectedJobResult> {
    const boardToken = this.extractBoardToken(company.careerPageUrl, company.slug);
    const apiUrl = `https://apply.workable.com/api/v3/accounts/${boardToken}/jobs`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 100 }),
    });

    if (!response.ok) {
      throw new Error(`Workable API request failed: ${response.status}`);
    }

    const data = await response.json();
    const rawJobs = data.results || [];

    const jobs: CollectedJob[] = rawJobs.map((rawJob) => ({
      externalJobId: String(rawJob.shortcode),
      title: this.cleanText(rawJob.title) || 'Untitled Position',
      department: this.cleanText(rawJob.department),
      location: this.cleanText(rawJob.location?.city),
      workMode: this.inferWorkMode(`${rawJob.title} ${rawJob.telecommute}`),
      experienceLevel: this.inferExperienceLevel(rawJob.title),
      applicationUrl: `https://apply.workable.com/${boardToken}/j/${rawJob.shortcode}`,
      postedDate: rawJob.published ? new Date(rawJob.published) : undefined,
      rawJson: rawJob,
    }));

    return {
      jobs,
      rawPayloads: rawJobs,
      parserVersion: '1.0.0',
    };
  }
}
```

### Step 3: Register in `ScraperManager` & `ScrapersModule`

1. Inject your new adapter into `ScraperManager` constructor and add it to `this.adapters`.
2. Add your new adapter to the `providers` array in `apps/api/src/scrapers/scrapers.module.ts`.

---

## 🔑 Deduplication Hashing Strategy

To prevent duplicate job records when companies re-post or update listings, every normalized job posting generates a stable SHA-256 hash:

$$\text{hash} = \text{SHA256}(\text{companyId} : \text{externalJobId} : \text{title} : \text{location} : \text{canonicalUrl})$$

If the hash already exists in PostgreSQL, the engine updates `updatedAt` and ensures `status = ACTIVE` without creating a duplicate record.

---

## 📊 Health Monitoring Metrics

Every scrape execution records metrics in two tables:

- `ScrapeJob`: Historical record of individual execution runs (duration, jobs found, jobs added, jobs updated, error message).
- `ParserHealth`: Moving-average success rates and average runtime per company parser.
