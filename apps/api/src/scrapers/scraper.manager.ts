import { Injectable } from '@nestjs/common';
import type { Company } from '@prisma/client';
import { ParserType } from '@prisma/client';

import { AshbyAdapter } from './adapters/ashby.adapter';
import { GenericHtmlAdapter } from './adapters/generic-html.adapter';
import { GreenhouseAdapter } from './adapters/greenhouse.adapter';
import { LeverAdapter } from './adapters/lever.adapter';
import { SmartRecruitersAdapter } from './adapters/smartrecruiters.adapter';
import { WorkdayAdapter } from './adapters/workday.adapter';
import type { AtsAdapter } from './interfaces/ats-adapter.interface';

@Injectable()
export class ScraperManager {
  private readonly adapters: AtsAdapter[];

  constructor(
    greenhouseAdapter: GreenhouseAdapter,
    leverAdapter: LeverAdapter,
    ashbyAdapter: AshbyAdapter,
    smartRecruitersAdapter: SmartRecruitersAdapter,
    workdayAdapter: WorkdayAdapter,
    private readonly genericHtmlAdapter: GenericHtmlAdapter,
  ) {
    this.adapters = [
      greenhouseAdapter,
      leverAdapter,
      ashbyAdapter,
      smartRecruitersAdapter,
      workdayAdapter,
      genericHtmlAdapter,
    ];
  }

  /**
   * Find the matching adapter for a company.
   */
  getAdapterForCompany(company: Company): AtsAdapter {
    // 1. Exact match by parserType if specified
    if (
      company.parserType &&
      company.parserType !== ParserType.UNASSIGNED &&
      company.parserType !== ParserType.CUSTOM
    ) {
      const match = this.adapters.find((adapter) => adapter.parserType === company.parserType);
      if (match) return match;
    }

    // 2. Dynamic check via adapter.supports(company)
    for (const adapter of this.adapters) {
      if (adapter.parserType !== ParserType.GENERIC_HTML && adapter.supports(company)) {
        return adapter;
      }
    }

    // 3. Default to Generic HTML adapter
    return this.genericHtmlAdapter;
  }
}
