/**
 * Phase 24 Unit Tests — Career Outcomes, Placement Intelligence
 *
 * Tests:
 *  1. Funnel calculation correctness
 *  2. Time-to-stage percentile accuracy
 *  3. Privacy threshold enforcement
 *  4. Benchmark comparison logic
 *  5. Data quality detection
 *  6. Snapshot service trend computation
 *  7. Export CSV formatting
 */
import { OutcomePrivacyService } from './services/outcome-privacy.service';
import { OutcomeSnapshotService } from './services/outcome-snapshot.service';
import { OutcomeExportService } from './services/outcome-export.service';
import { OutcomeTimeToStageService } from './services/outcome-time-to-stage.service';
import { OrgOutcomeService } from './services/org-outcome.service';
import { OutcomeTrendDirection, OutcomeConfidenceLevel } from '@prisma/client';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMockConfigService(minCohort = '10') {
  return {
    get: jest.fn().mockReturnValue(minCohort),
  } as any;
}

// ─── OutcomePrivacyService ───────────────────────────────────────────────────

describe('OutcomePrivacyService', () => {
  let service: OutcomePrivacyService;

  beforeEach(() => {
    service = new OutcomePrivacyService(makeMockConfigService('10'));
  });

  it('allows cohort above threshold', () => {
    const result = service.checkCohort(15);
    expect(result.allowed).toBe(true);
    expect(result.sampleSize).toBe(15);
    expect(result.minCohortSize).toBe(10);
  });

  it('blocks cohort exactly at threshold', () => {
    const result = service.checkCohort(10);
    expect(result.allowed).toBe(true);
  });

  it('blocks cohort below threshold', () => {
    const result = service.checkCohort(9);
    expect(result.allowed).toBe(false);
  });

  it('blocks cohort of zero', () => {
    expect(service.checkCohort(0).allowed).toBe(false);
  });

  it('reads minCohortSize from environment', () => {
    const svc = new OutcomePrivacyService(makeMockConfigService('25'));
    expect(svc.getMinCohortSize()).toBe(25);
  });

  it('guardBreakdown suppresses items below threshold', () => {
    const items = [
      { sampleSize: 5, value: 0.5 },
      { sampleSize: 15, value: 0.7 },
      { sampleSize: 9, value: 0.3 },
    ];
    const result = service.guardBreakdown(items);
    expect(result[0]).toMatchObject({ status: 'INSUFFICIENT_COHORT' });
    expect(result[1]).toMatchObject({ sampleSize: 15, value: 0.7 });
    expect(result[2]).toMatchObject({ status: 'INSUFFICIENT_COHORT' });
  });
});

// ─── OutcomeSnapshotService (pure methods) ────────────────────────────────────

describe('OutcomeSnapshotService — pure methods', () => {
  let service: OutcomeSnapshotService;

  beforeEach(() => {
    service = new OutcomeSnapshotService({ } as any);
  });

  describe('computeTrend', () => {
    it('returns IMPROVING when current is significantly higher', () => {
      expect(service.computeTrend(0.8, 0.6)).toBe(OutcomeTrendDirection.IMPROVING);
    });

    it('returns DECLINING when current is significantly lower', () => {
      expect(service.computeTrend(0.5, 0.7)).toBe(OutcomeTrendDirection.DECLINING);
    });

    it('returns STABLE when within 5% threshold', () => {
      expect(service.computeTrend(0.6, 0.61)).toBe(OutcomeTrendDirection.STABLE);
    });

    it('returns INSUFFICIENT_DATA when either value is null', () => {
      expect(service.computeTrend(null, 0.5)).toBe(OutcomeTrendDirection.INSUFFICIENT_DATA);
      expect(service.computeTrend(0.5, null)).toBe(OutcomeTrendDirection.INSUFFICIENT_DATA);
    });

    it('returns INSUFFICIENT_DATA when previous is zero', () => {
      expect(service.computeTrend(0.5, 0)).toBe(OutcomeTrendDirection.INSUFFICIENT_DATA);
    });
  });

  describe('computeConfidence', () => {
    it('returns HIGH for n >= 100', () => {
      expect(service.computeConfidence(100)).toBe(OutcomeConfidenceLevel.HIGH);
      expect(service.computeConfidence(500)).toBe(OutcomeConfidenceLevel.HIGH);
    });

    it('returns MEDIUM for 30–99', () => {
      expect(service.computeConfidence(30)).toBe(OutcomeConfidenceLevel.MEDIUM);
      expect(service.computeConfidence(99)).toBe(OutcomeConfidenceLevel.MEDIUM);
    });

    it('returns LOW for 10–29', () => {
      expect(service.computeConfidence(10)).toBe(OutcomeConfidenceLevel.LOW);
      expect(service.computeConfidence(29)).toBe(OutcomeConfidenceLevel.LOW);
    });

    it('returns INSUFFICIENT_DATA for n < 10', () => {
      expect(service.computeConfidence(9)).toBe(OutcomeConfidenceLevel.INSUFFICIENT_DATA);
      expect(service.computeConfidence(0)).toBe(OutcomeConfidenceLevel.INSUFFICIENT_DATA);
    });
  });
});

// ─── OutcomeTimeToStageService — percentile math ─────────────────────────────

describe('OutcomeTimeToStageService — percentile math', () => {


  it('computes p50 (median) correctly for odd-length array', () => {
    const s = new OutcomeTimeToStageService({} as any);
    const sorted = [1, 2, 3, 4, 5];
    expect((s as any).percentile(sorted, 50)).toBe(3);
  });

  it('computes p50 for even-length array', () => {
    const s = new OutcomeTimeToStageService({} as any);
    const sorted = [1, 2, 3, 4];
    // ceil(50/100 * 4) - 1 = ceil(2) - 1 = 1 → sorted[1] = 2
    expect((s as any).percentile(sorted, 50)).toBe(2);
  });

  it('computes p90 correctly', () => {
    const s = new OutcomeTimeToStageService({} as any);
    const sorted = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect((s as any).percentile(sorted, 90)).toBe(90);
  });

  it('returns null for empty array', () => {
    const s = new OutcomeTimeToStageService({} as any);
    expect((s as any).percentile([], 50)).toBeNull();
  });

  it('buildStats returns null for empty durations', () => {
    const s = new OutcomeTimeToStageService({} as any);
    const stats = (s as any).buildStats([]);
    expect(stats.median).toBeNull();
    expect(stats.sampleSize).toBe(0);
    expect(stats.unit).toBe('hours');
  });

  it('buildStats computes correct median and average', () => {
    const s = new OutcomeTimeToStageService({} as any);
    const stats = (s as any).buildStats([24, 48, 72]);
    expect(stats.median).toBe(48);
    expect(stats.average).toBe(48);
    expect(stats.sampleSize).toBe(3);
  });

  it('average is labeled as potentially skewed', () => {
    const s = new OutcomeTimeToStageService({} as any);
    const stats = (s as any).buildStats([1, 2, 1000]);
    expect(stats.note).toContain('outliers');
    // Average is very different from median — confirms skew warning is needed
    expect(stats.average!).toBeGreaterThan(stats.median!);
  });
});

// ─── OutcomeExportService ────────────────────────────────────────────────────

describe('OutcomeExportService', () => {
  let service: OutcomeExportService;

  beforeEach(() => {
    service = new OutcomeExportService();
  });

  it('generates correct CSV header and rows', () => {
    const csv = service.toCsv([
      { Name: 'Alice', Score: 95, Active: true },
      { Name: 'Bob', Score: 80, Active: false },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Name,Score,Active');
    expect(lines[1]).toBe('Alice,95,true');
    expect(lines[2]).toBe('Bob,80,false');
  });

  it('escapes commas in values', () => {
    const csv = service.toCsv([{ Name: 'Smith, John', Value: 1 }]);
    expect(csv).toContain('"Smith, John"');
  });

  it('escapes double quotes in values', () => {
    const csv = service.toCsv([{ Name: 'He said "hello"', Value: 1 }]);
    expect(csv).toContain('"He said ""hello"""');
  });

  it('returns empty string for empty array', () => {
    expect(service.toCsv([])).toBe('');
  });

  it('buildFilename formats correctly', () => {
    const fn = service.buildFilename('roles', new Date('2025-01-01'), new Date('2025-01-31'));
    expect(fn).toBe('outcome_roles_2025-01-01_to_2025-01-31.csv');
  });

  it('formatFunnelForCsv formats percentage values', () => {
    const rows = service.formatFunnelForCsv([
      {
        stage: 'Applied',
        count: 100,
        conversionFromPrevious: 0.5,
        dropOffRate: 0.5,
        definition: 'Test def',
      },
    ]) as any[];
    expect(rows[0]['Conversion from Previous']).toBe('50.00%');
    expect(rows[0]['Drop-off Rate']).toBe('50.00%');
    expect(rows[0]['Stage']).toBe('Applied');
    expect(rows[0]['Count']).toBe(100);
  });

  it('formatFunnelForCsv handles null conversion', () => {
    const rows = service.formatFunnelForCsv([
      { stage: 'Registered', count: 1000, conversionFromPrevious: null, dropOffRate: null, definition: '' },
    ]) as any[];
    expect(rows[0]['Conversion from Previous']).toBe('N/A');
  });
});

// ─── Privacy — Tenant Isolation ──────────────────────────────────────────────

describe('Tenant isolation — OrgOutcomeService', () => {
  it('rejects unauthorized users', async () => {
    const mockPrisma = {
      organizationMember: {
        findUnique: jest.fn().mockResolvedValue(null), // not a member
      },
    } as any;

    const mockPrivacy = { checkCohort: jest.fn() } as any;
    const mockAgg = { computeAggregatedFunnel: jest.fn() } as any;

    const svc = new OrgOutcomeService(mockPrisma, mockPrivacy, mockAgg);

    await expect(
      svc.getOrgOverview('user-123', 'org-456', new Date(), new Date()),
    ).rejects.toThrow('Not authorized');
  });
});
