import type { Company } from '@prisma/client';
import { ParserType } from '@prisma/client';

import { AshbyAdapter } from './adapters/ashby.adapter';
import { GenericHtmlAdapter } from './adapters/generic-html.adapter';
import { GreenhouseAdapter } from './adapters/greenhouse.adapter';
import { LeverAdapter } from './adapters/lever.adapter';
import { SmartRecruitersAdapter } from './adapters/smartrecruiters.adapter';
import { WorkdayAdapter } from './adapters/workday.adapter';
import { ScraperManager } from './scraper.manager';

describe('ScraperManager', () => {
  let manager: ScraperManager;

  const mockCompany = (parserType: ParserType, careerPageUrl?: string): Company =>
    ({
      id: 'comp-uuid',
      name: 'Test Company',
      slug: 'test-company',
      parserType,
      careerPageUrl: careerPageUrl || null,
      logoUrl: null,
      website: null,
      industry: null,
      description: null,
      headquarters: null,
      companySize: null,
      foundedYear: null,
      linkedinUrl: null,
      isActive: true,
      lastCheckedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as Company;

  beforeEach(() => {
    const greenhouse = new GreenhouseAdapter();
    const lever = new LeverAdapter();
    const ashby = new AshbyAdapter();
    const smartRecruiters = new SmartRecruitersAdapter();
    const workday = new WorkdayAdapter();
    const generic = new GenericHtmlAdapter();

    manager = new ScraperManager(greenhouse, lever, ashby, smartRecruiters, workday, generic);
  });

  it('should return GreenhouseAdapter when company parserType is GREENHOUSE', () => {
    const company = mockCompany(ParserType.GREENHOUSE);
    const adapter = manager.getAdapterForCompany(company);
    expect(adapter.parserType).toBe(ParserType.GREENHOUSE);
  });

  it('should return LeverAdapter when company career URL contains lever.co', () => {
    const company = mockCompany(ParserType.UNASSIGNED, 'https://jobs.lever.co/stripe');
    const adapter = manager.getAdapterForCompany(company);
    expect(adapter.parserType).toBe(ParserType.LEVER);
  });

  it('should fallback to GenericHtmlAdapter for unassigned custom career page URL', () => {
    const company = mockCompany(ParserType.UNASSIGNED, 'https://example.com/careers');
    const adapter = manager.getAdapterForCompany(company);
    expect(adapter.parserType).toBe(ParserType.GENERIC_HTML);
  });
});
