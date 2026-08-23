import { Injectable, Logger } from '@nestjs/common';
import { TrajectoryPhase, CareerMomentumState } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CareerIntelligenceService } from './career-intelligence.service';

@Injectable()
export class CareerSnapshotService {
  private readonly logger = new Logger(CareerSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intelligenceService: CareerIntelligenceService,
  ) {}

  /**
   * Take an immutable snapshot of the user's current career state.
   * Snapshots are append-only — never overwritten.
   */
  async takeSnapshot(userId: string) {
    this.logger.log(`Taking Career Profile Snapshot for user ${userId}`);

    const state = await this.intelligenceService.buildCareerState(userId);
    const trajectory = await this.intelligenceService.computeTrajectory(userId);

    // Build human-readable key signals
    const keySignals: string[] = [];
    if (state.targetRole) keySignals.push(`Target role: ${state.targetRole}`);
    if (state.skills.length > 0) keySignals.push(`${state.skills.length} skills recorded`);
    if (state.projects.length > 0) keySignals.push(`${state.projects.length} portfolio projects`);
    if (state.applicationCount > 0)
      keySignals.push(`${state.applicationCount} applications tracked`);
    if (state.networkingContactCount > 0)
      keySignals.push(`${state.networkingContactCount} professional contacts`);
    if (trajectory.primaryPathTitle)
      keySignals.push(`Primary path: ${trajectory.primaryPathTitle}`);

    const summary = this.buildSnapshotSummary(state, trajectory);

    const snapshot = await this.prisma.careerProfileSnapshot.create({
      data: {
        userId,
        snapshotJson: state as any,
        trajectoryPhase: trajectory.phase as TrajectoryPhase,
        momentum: trajectory.momentum as CareerMomentumState,
        summary,
        keySignals,
      },
    });

    // Emit event for Phase 38 Proactive Agent
    await this.prisma.careerEvent.create({
      data: {
        userId,
        eventType: 'CareerSnapshotTaken',
        source: 'CAREER_INTELLIGENCE',
        entityType: 'CareerProfileSnapshot',
        entityId: snapshot.id,
        importance: 'INFO',
        metadata: {
          trajectoryPhase: trajectory.phase,
          momentum: trajectory.momentum,
          primaryPath: trajectory.primaryPathTitle,
        },
      },
    });

    return snapshot;
  }

  /**
   * Returns the chronological history of career snapshots for evolution tracking.
   * Each snapshot is immutable — historical record preserved.
   */
  async getSnapshotHistory(userId: string) {
    const snapshots = await this.prisma.careerProfileSnapshot.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        trajectoryPhase: true,
        momentum: true,
        summary: true,
        keySignals: true,
        createdAt: true,
        // snapshotJson excluded by default for performance — fetch individually if needed
      },
    });

    return snapshots;
  }

  /**
   * Returns full detail of a specific snapshot (includes snapshotJson).
   */
  async getSnapshotById(userId: string, snapshotId: string) {
    const snapshot = await this.prisma.careerProfileSnapshot.findFirst({
      where: { id: snapshotId, userId },
    });

    if (!snapshot) {
      throw new Error('Snapshot not found or does not belong to this user.');
    }

    return snapshot;
  }

  private buildSnapshotSummary(
    state: ReturnType<CareerIntelligenceService['buildCareerState']> extends Promise<infer T>
      ? T
      : never,
    trajectory: { phase: string; momentum: string; primaryPathTitle: string | null },
  ): string {
    const parts: string[] = [];

    if (trajectory.primaryPathTitle) {
      parts.push(`Primary path: ${trajectory.primaryPathTitle}.`);
    }

    parts.push(`Trajectory: ${trajectory.phase}.`);
    parts.push(`Momentum: ${trajectory.momentum}.`);

    if (state.skills.length > 0) {
      parts.push(`${state.skills.length} skills recorded.`);
    }

    if (state.projects.length > 0) {
      parts.push(`${state.projects.length} projects in portfolio.`);
    }

    if (state.dataLimitations.length > 0) {
      parts.push('Note: profile data is incomplete.');
    }

    return parts.join(' ');
  }
}
