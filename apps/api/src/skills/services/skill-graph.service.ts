import { Injectable, BadRequestException } from '@nestjs/common';
import { SkillRelationship, SkillRelationType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SkillGraphService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all relationships starting from or ending at a specific skill.
   */
  async getRelationships(skillId: string) {
    return this.prisma.skillRelationship.findMany({
      where: {
        OR: [{ fromSkillId: skillId }, { toSkillId: skillId }],
      },
      include: {
        fromSkill: true,
        toSkill: true,
      },
    });
  }

  /**
   * Adds or updates a relationship in the skill graph.
   * Performs circular reference checks if adding PRECEDES relationship.
   */
  async addRelationship(
    fromSkillId: string,
    toSkillId: string,
    relationType: SkillRelationType,
    weight = 1.0,
  ): Promise<SkillRelationship> {
    if (fromSkillId === toSkillId) {
      throw new BadRequestException('A skill cannot have a relationship with itself.');
    }

    // Circular relationship check
    if (relationType === SkillRelationType.PRECEDES) {
      const hasCircle = await this.checkCircularPrecedence(toSkillId, fromSkillId);
      if (hasCircle) {
        throw new BadRequestException(
          `Circular dependency detected: target skill already precedes source skill.`,
        );
      }
    }

    return this.prisma.skillRelationship.upsert({
      where: {
        fromSkillId_toSkillId_relationType: {
          fromSkillId,
          toSkillId,
          relationType,
        },
      },
      update: { weight },
      create: {
        fromSkillId,
        toSkillId,
        relationType,
        weight,
      },
    });
  }

  /**
   * Removes a relationship from the graph.
   */
  async removeRelationship(
    fromSkillId: string,
    toSkillId: string,
    relationType: SkillRelationType,
  ): Promise<void> {
    await this.prisma.skillRelationship.deleteMany({
      where: {
        fromSkillId,
        toSkillId,
        relationType,
      },
    });
  }

  /**
   * Deep traversal to check if a precedence circle is created.
   * Returns true if toId eventually leads to fromId via PRECEDES edges.
   */
  private async checkCircularPrecedence(
    currentId: string,
    targetId: string,
    visited = new Set<string>(),
  ): Promise<boolean> {
    if (currentId === targetId) return true;
    if (visited.has(currentId)) return false;

    visited.add(currentId);

    // Find all skills that 'currentId' PRECEDES
    const outbound = await this.prisma.skillRelationship.findMany({
      where: {
        fromSkillId: currentId,
        relationType: SkillRelationType.PRECEDES,
      },
    });

    for (const rel of outbound) {
      if (await this.checkCircularPrecedence(rel.toSkillId, targetId, visited)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Traversal algorithm to find shortest connection path between two skills.
   * Breadth-First-Search (BFS) over all relationship edges.
   */
  async findPath(startId: string, endId: string): Promise<string[] | null> {
    if (startId === endId) return [startId];

    const queue: { current: string; path: string[] }[] = [{ current: startId, path: [startId] }];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const nextItem = queue.shift();
      if (!nextItem) continue;
      const { current, path } = nextItem;

      // Find all adjacent nodes (both from and to directions since graph is semi-directed)
      const adjRels = await this.prisma.skillRelationship.findMany({
        where: {
          OR: [{ fromSkillId: current }, { toSkillId: current }],
        },
      });

      for (const rel of adjRels) {
        const neighbor = rel.fromSkillId === current ? rel.toSkillId : rel.fromSkillId;
        if (neighbor === endId) {
          return [...path, endId];
        }

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ current: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return null;
  }
}
