import { ParserType, WorkMode } from '@prisma/client';

import { NormalizerService } from './normalizer.service';

describe('NormalizerService', () => {
  let service: NormalizerService;

  beforeEach(() => {
    service = new NormalizerService();
  });

  it('should normalize job title, location, workMode, and experienceLevel', () => {
    const rawJob = {
      title: ' Software Engineering Intern  ',
      location: ' San Francisco, CA (Remote) ',
      applicationUrl: 'https://careers.example.com/job/123?utm_source=test',
    };

    const normalized = service.normalize('company-uuid-123', rawJob, ParserType.GREENHOUSE);

    expect(normalized.title).toBe('Software Engineering Intern');
    expect(normalized.location).toBe('San Francisco, CA (Remote)');
    expect(normalized.workMode).toBe(WorkMode.REMOTE);
    expect(normalized.experienceLevel).toBe('Internship');
    expect(normalized.applicationUrl).toBe('https://careers.example.com/job/123');
    expect(normalized.source).toBe(ParserType.GREENHOUSE);
    expect(normalized.hash).toBeDefined();
    expect(normalized.hash.length).toBe(64); // SHA-256 length
  });

  it('should generate consistent SHA-256 hash for identical normalized job fields', () => {
    const hash1 = service.generateStableHash(
      'comp-1',
      'Backend Engineer Intern',
      'New York',
      'https://example.com/job/1',
    );
    const hash2 = service.generateStableHash(
      'comp-1',
      'Backend Engineer Intern',
      'New York',
      'https://example.com/job/1',
    );

    expect(hash1).toBe(hash2);
  });
});
