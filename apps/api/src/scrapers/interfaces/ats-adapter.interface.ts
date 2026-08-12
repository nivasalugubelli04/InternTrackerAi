import type { Company, ParserType, WorkMode } from '@prisma/client';

export interface CollectedJob {
  externalJobId?: string | undefined;
  title: string;
  department?: string | undefined;
  employmentType?: string | undefined;
  experienceLevel?: string | undefined;
  location?: string | undefined;
  workMode?: WorkMode | undefined;
  stipend?: number | undefined;
  salary?: number | undefined;
  duration?: string | undefined;
  description?: string | undefined;
  requirements?: string[] | undefined;
  responsibilities?: string[] | undefined;
  benefits?: string[] | undefined;
  applicationUrl: string;
  postedDate?: Date | undefined;
  deadline?: Date | undefined;
  rawJson?: Record<string, any> | undefined;
}

export interface CollectedJobResult {
  jobs: CollectedJob[];
  htmlSnapshotUrl?: string | undefined;
  rawPayloads?: Record<string, any>[] | undefined;
  parserVersion: string;
}

export interface AtsAdapter {
  readonly name: string;
  readonly parserType: ParserType;
  supports(company: Company): boolean;
  scrape(company: Company): Promise<CollectedJobResult>;
}
