/**
 * OutcomeExportService
 *
 * CSV export for admin and authorized organization users.
 * PDF generation is not available in the current infrastructure.
 *
 * Privacy Rules:
 *  - Only aggregate metrics are exported — no individual user records.
 *  - Organization exports only include users with consentGiven = true.
 *  - Admin export authorization verified by role guard in controller.
 *  - Minimum cohort threshold enforced before export.
 */
import { Injectable } from '@nestjs/common';

export interface CsvRow {
  [key: string]: string | number | boolean | null;
}

@Injectable()
export class OutcomeExportService {
  /**
   * Convert an array of objects to CSV string.
   */
  toCsv(rows: CsvRow[]): string {
    if (rows.length === 0) return '';

    const firstRow = rows[0];
    if (!firstRow) return '';

    const headers = Object.keys(firstRow);
    const headerLine = headers.join(',');
    const dataLines = rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          // Escape commas and quotes
          return str.includes(',') || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(','),
    );

    return [headerLine, ...dataLines].join('\n');
  }

  /**
   * Build a filename for a CSV export.
   */
  buildFilename(type: string, periodStart: Date, periodEnd: Date): string {
    const start = periodStart.toISOString().split('T')[0];
    const end = periodEnd.toISOString().split('T')[0];
    return `outcome_${type}_${start}_to_${end}.csv`;
  }

  /**
   * Format funnel rows for CSV export.
   */
  formatFunnelForCsv(
    stages: Array<{
      stage: string;
      count: number;
      conversionFromPrevious: number | null;
      dropOffRate: number | null;
      definition: string;
    }>,
  ): CsvRow[] {
    return stages.map((s) => ({
      Stage: s.stage,
      Count: s.count,
      'Conversion from Previous': s.conversionFromPrevious !== null
        ? `${(s.conversionFromPrevious * 100).toFixed(2)}%` : 'N/A',
      'Drop-off Rate': s.dropOffRate !== null
        ? `${(s.dropOffRate * 100).toFixed(2)}%` : 'N/A',
      Definition: s.definition,
    }));
  }

  /**
   * Format role outcomes for CSV.
   */
  formatRoleOutcomesForCsv(rows: any[]): CsvRow[] {
    return rows.map((r) => ({
      Role: r['role'] as string,
      Applications: r['applications'] as number,
      Interviews: r['interviews'] as number,
      Offers: r['offers'] as number,
      Hires: r['hires'] as number,
      'Interview Conversion': `${(((r['interviewConversionRate'] as number) ?? 0) * 100).toFixed(2)}%`,
      'Offer Conversion': `${(((r['offerConversionRate'] as number) ?? 0) * 100).toFixed(2)}%`,
      'Hire Rate': `${(((r['hireRate'] as number) ?? 0) * 100).toFixed(2)}%`,
      'Sample Size': r['sampleSize'] as number,
      Confidence: r['confidence'] as string,
    }));
  }

  /**
   * Format skill outcomes for CSV.
   */
  formatSkillOutcomesForCsv(rows: any[]): CsvRow[] {
    return rows.map((r) => ({
      Skill: r['skillName'] as string,
      Category: r['skillCategory'] as string,
      'Users with Skill': r['usersWithSkill'] as number,
      Applications: r['applications'] as number,
      Interviews: r['interviews'] as number,
      Offers: r['offers'] as number,
      'Interview Conversion': `${(((r['interviewConversionRate'] as number) ?? 0) * 100).toFixed(2)}%`,
      'Offer Conversion': `${(((r['offerConversionRate'] as number) ?? 0) * 100).toFixed(2)}%`,
      'Sample Size': r['sampleSize'] as number,
      Confidence: r['confidence'] as string,
      Note: r['observationNote'] as string,
    }));
  }

  /**
   * Format org department outcomes for CSV.
   */
  formatDepartmentOutcomesForCsv(rows: any[]): CsvRow[] {
    return rows.map((r) => {
      if (r['belowCohortThreshold']) {
        return {
          Department: r['department'] as string,
          'Student Count': r['studentCount'] as number,
          Note: 'Insufficient cohort size — data suppressed for privacy.',
        };
      }
      return {
        Department: r['department'] as string,
        'Student Count': r['studentCount'] as number,
        'Profile Completion': `${(((r['profileCompletionRate'] as number) ?? 0) * 100).toFixed(1)}%`,
        Applications: r['applications'] as number,
        Interviews: r['interviews'] as number,
        Offers: r['offers'] as number,
        Hires: r['hires'] as number,
        'Placement Rate': `${(((r['placementRate'] as number) ?? 0) * 100).toFixed(2)}%`,
        'Sample Size': r['sampleSize'] as number,
      };
    });
  }
}
