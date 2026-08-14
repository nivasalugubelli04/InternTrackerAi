import { Injectable, Logger } from '@nestjs/common';
import { JobPostingStatus, WorkMode } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface LocationDetailItem {
  locationName: string;
  opportunityCount: number;
  marketSharePercentage: number;
  workModeBreakdown: {
    remoteRatio: number;
    hybridRatio: number;
    onsiteRatio: number;
  };
  topSkills: { skill: string; count: number }[];
  topRoles: { role: string; count: number }[];
  hasSufficientData: boolean;
}

export interface LocationIntelligenceResponse {
  topLocations: LocationDetailItem[];
  workModeSummary: {
    totalRemote: number;
    totalHybrid: number;
    totalOnsite: number;
    remotePercentage: number;
    hybridPercentage: number;
    onsitePercentage: number;
  };
  totalOpportunities: number;
  calculatedAt: string;
}

@Injectable()
export class LocationIntelligenceService {
  private readonly logger = new Logger(LocationIntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns comprehensive geographic and work-mode distribution analysis.
   */
  async getLocationIntelligence(): Promise<LocationIntelligenceResponse> {
    this.logger.debug('Calculating location intelligence metrics');
    const now = new Date();

    const activeJobs = await this.prisma.jobPosting.findMany({
      where: { status: JobPostingStatus.ACTIVE },
      select: {
        id: true,
        title: true,
        location: true,
        workMode: true,
        requirements: true,
      },
    });

    const totalJobs = activeJobs.length;
    let totalRemote = 0;
    let totalHybrid = 0;
    let totalOnsite = 0;

    interface LocationAccumulator {
      count: number;
      remoteCount: number;
      hybridCount: number;
      onsiteCount: number;
      skills: Map<string, number>;
      roles: Map<string, number>;
    }

    const locMap = new Map<string, LocationAccumulator>();

    for (const job of activeJobs) {
      // Determine work mode
      const isExplicitRemote = Boolean(
        job.workMode === WorkMode.REMOTE ||
        (job.location && job.location.toLowerCase().includes('remote')),
      );

      const isExplicitHybrid = Boolean(
        job.workMode === WorkMode.HYBRID ||
        (job.location && job.location.toLowerCase().includes('hybrid')),
      );

      if (isExplicitRemote) {
        totalRemote++;
      } else if (isExplicitHybrid) {
        totalHybrid++;
      } else {
        totalOnsite++;
      }

      // Parse canonical city/location
      const locName = this.normalizeLocationName(job.location, isExplicitRemote);

      let acc = locMap.get(locName);
      if (!acc) {
        acc = {
          count: 0,
          remoteCount: 0,
          hybridCount: 0,
          onsiteCount: 0,
          skills: new Map(),
          roles: new Map(),
        };
        locMap.set(locName, acc);
      }

      acc.count++;

      if (isExplicitRemote) acc.remoteCount++;
      else if (isExplicitHybrid) acc.hybridCount++;
      else acc.onsiteCount++;

      const role = this.normalizeRole(job.title);
      acc.roles.set(role, (acc.roles.get(role) ?? 0) + 1);

      for (const req of job.requirements) {
        const clean = req.trim();
        if (clean.length > 1) {
          acc.skills.set(clean, (acc.skills.get(clean) ?? 0) + 1);
        }
      }
    }

    const topLocations: LocationDetailItem[] = Array.from(locMap.entries())
      .map(([locName, acc]) => {
        const total = acc.count;
        return {
          locationName: locName,
          opportunityCount: total,
          marketSharePercentage: totalJobs > 0 ? Math.round((total / totalJobs) * 1000) / 10 : 0,
          workModeBreakdown: {
            remoteRatio: total > 0 ? Math.round((acc.remoteCount / total) * 100) / 100 : 0,
            hybridRatio: total > 0 ? Math.round((acc.hybridCount / total) * 100) / 100 : 0,
            onsiteRatio: total > 0 ? Math.round((acc.onsiteCount / total) * 100) / 100 : 0,
          },
          topSkills: Array.from(acc.skills.entries())
            .map(([skill, count]) => ({ skill, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8),
          topRoles: Array.from(acc.roles.entries())
            .map(([role, count]) => ({ role, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
          hasSufficientData: total >= 3,
        };
      })
      .sort((a, b) => b.opportunityCount - a.opportunityCount)
      .slice(0, 15);

    return {
      topLocations,
      workModeSummary: {
        totalRemote,
        totalHybrid,
        totalOnsite,
        remotePercentage: totalJobs > 0 ? Math.round((totalRemote / totalJobs) * 1000) / 10 : 0,
        hybridPercentage: totalJobs > 0 ? Math.round((totalHybrid / totalJobs) * 1000) / 10 : 0,
        onsitePercentage: totalJobs > 0 ? Math.round((totalOnsite / totalJobs) * 1000) / 10 : 0,
      },
      totalOpportunities: totalJobs,
      calculatedAt: now.toISOString(),
    };
  }

  private normalizeLocationName(loc: string | null, isRemote: boolean): string {
    if (isRemote || !loc) return 'Remote';
    const lower = loc.toLowerCase();
    if (lower.includes('bengaluru') || lower.includes('bangalore')) return 'Bengaluru';
    if (lower.includes('hyderabad')) return 'Hyderabad';
    if (lower.includes('pune')) return 'Pune';
    if (lower.includes('mumbai')) return 'Mumbai';
    if (
      lower.includes('delhi') ||
      lower.includes('noida') ||
      lower.includes('gurugram') ||
      lower.includes('gurgaon')
    )
      return 'Delhi NCR';
    if (lower.includes('chennai')) return 'Chennai';
    if (lower.includes('kolkata')) return 'Kolkata';
    if (lower.includes('ahmedabad')) return 'Ahmedabad';
    return loc.split(',')[0]?.trim() ?? 'Other';
  }

  private normalizeRole(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('front')) return 'Frontend';
    if (lower.includes('back')) return 'Backend';
    if (lower.includes('full')) return 'Full Stack';
    if (lower.includes('data')) return 'Data Science';
    if (lower.includes('ai') || lower.includes('ml')) return 'AI / ML';
    if (lower.includes('devops') || lower.includes('cloud')) return 'DevOps & Cloud';
    if (lower.includes('mobile')) return 'Mobile';
    return 'Software Engineering';
  }
}
