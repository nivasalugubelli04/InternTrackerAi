import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleSkillRequirement, Role } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoleTaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all roles in the system.
   */
  async getRoles(): Promise<Role[]> {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Retrieves a single role including its parent and child roles.
   */
  async getRoleDetails(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        parent: true,
        children: true,
        roleSkills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found.`);
    }

    return role;
  }

  /**
   * Computes the flat list of all required and preferred skills for a role,
   * incorporating skills from parent roles in the hierarchy (inheritance).
   */
  async getInheritedSkills(roleId: string) {
    const skillsMap = new Map<
      string,
      {
        skillId: string;
        name: string;
        requirement: RoleSkillRequirement;
        importance: string;
        weight: number;
        sourceRoleName: string;
      }
    >();

    let currentRoleId: string | null = roleId;

    while (currentRoleId) {
      const roleRecord = (await this.prisma.role.findUnique({
        where: { id: currentRoleId },
        include: {
          roleSkills: {
            include: {
              skill: true,
            },
          },
        },
      })) as any;

      if (!roleRecord) break;

      for (const rs of roleRecord.roleSkills) {
        // Child definitions override parent definitions if duplicate
        if (!skillsMap.has(rs.skillId)) {
          skillsMap.set(rs.skillId, {
            skillId: rs.skillId,
            name: rs.skill.name,
            requirement: rs.requirement,
            importance: rs.importance,
            weight: rs.weight,
            sourceRoleName: roleRecord.name,
          });
        }
      }

      currentRoleId = roleRecord.parentId;
    }

    return Array.from(skillsMap.values());
  }

  /**
   * Links a skill to a role with importance, requirement type, and weight.
   */
  async linkRoleSkill(
    roleId: string,
    skillId: string,
    params: {
      requirement?: RoleSkillRequirement;
      importance?: string;
      weight?: number;
    },
  ) {
    return this.prisma.roleSkill.upsert({
      where: {
        roleId_skillId: {
          roleId,
          skillId,
        },
      },
      update: params,
      create: {
        roleId,
        skillId,
        requirement: params.requirement || RoleSkillRequirement.REQUIRED,
        importance: params.importance || 'MEDIUM',
        weight: params.weight !== undefined ? params.weight : 1.0,
      },
    });
  }

  /**
   * Unlinks a skill from a role.
   */
  async unlinkRoleSkill(roleId: string, skillId: string): Promise<void> {
    await this.prisma.roleSkill.deleteMany({
      where: {
        roleId,
        skillId,
      },
    });
  }
}
