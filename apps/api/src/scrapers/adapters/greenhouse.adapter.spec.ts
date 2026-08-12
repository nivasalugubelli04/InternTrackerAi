import type { Company } from '@prisma/client';
import { ParserType } from '@prisma/client';

import { GreenhouseAdapter } from './greenhouse.adapter';

describe('GreenhouseAdapter', () => {
  let adapter: GreenhouseAdapter;

  beforeEach(() => {
    adapter = new GreenhouseAdapter();
  });

  it('should identify supported company correctly', () => {
    const greenhouseCompany = {
      parserType: ParserType.GREENHOUSE,
      careerPageUrl: 'https://boards.greenhouse.io/airbnb',
    } as Company;

    const otherCompany = {
      parserType: ParserType.UNASSIGNED,
      careerPageUrl: 'https://careers.google.com',
    } as Company;

    expect(adapter.supports(greenhouseCompany)).toBe(true);
    expect(adapter.supports(otherCompany)).toBe(false);
  });

  it('should parse raw Greenhouse jobs payload', async () => {
    const mockJobsResponse = {
      jobs: [
        {
          id: 12345,
          title: 'Software Engineering Intern - Summer 2026',
          location: { name: 'San Francisco, CA' },
          departments: [{ name: 'Engineering' }],
          content: '<p>Join our summer internship program!</p>',
          absolute_url: 'https://boards.greenhouse.io/test/jobs/12345',
          updated_at: '2026-05-01T10:00:00Z',
        },
      ],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockJobsResponse,
    } as Response);

    const company = {
      id: 'comp-uuid',
      slug: 'test-company',
      careerPageUrl: 'https://boards.greenhouse.io/test-company',
    } as Company;

    const result = await adapter.scrape(company);

    expect(result.jobs.length).toBe(1);
    const job = result.jobs[0]!;
    expect(job.title).toBe('Software Engineering Intern - Summer 2026');
    expect(job.externalJobId).toBe('12345');
    expect(job.department).toBe('Engineering');
    expect(job.location).toBe('San Francisco, CA');
  });
});
