import { Injectable } from '@nestjs/common';
import { RecruiterDiscoverabilityLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpdateDiscoverabilityDto {
  discoverabilityLevel?: RecruiterDiscoverabilityLevel;
  resumeVisible?: boolean;
  contactPermitted?: boolean;
  profileVisible?: boolean;
  specificCompanyIds?: string[];
}

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create a candidate's recruiter discoverability settings.
   * Default is PRIVATE — candidates must explicitly opt in.
   */
  async getDiscoverabilitySettings(userId: string) {
    let settings = await this.prisma.recruiterDiscoverabilitySettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.recruiterDiscoverabilitySettings.create({
        data: {
          userId,
          discoverabilityLevel: RecruiterDiscoverabilityLevel.PRIVATE,
          resumeVisible: false,
          contactPermitted: false,
          profileVisible: false,
          specificCompanyIds: [],
        },
      });
    }

    return settings;
  }

  /** Update candidate's recruiter discoverability preferences. */
  async updateDiscoverabilitySettings(userId: string, dto: UpdateDiscoverabilityDto) {
    await this.getDiscoverabilitySettings(userId); // ensure record exists

    return this.prisma.recruiterDiscoverabilitySettings.update({
      where: { userId },
      data: {
        ...(dto.discoverabilityLevel !== undefined && { discoverabilityLevel: dto.discoverabilityLevel }),
        ...(dto.resumeVisible !== undefined && { resumeVisible: dto.resumeVisible }),
        ...(dto.contactPermitted !== undefined && { contactPermitted: dto.contactPermitted }),
        ...(dto.profileVisible !== undefined && { profileVisible: dto.profileVisible }),
        ...(dto.specificCompanyIds !== undefined && { specificCompanyIds: dto.specificCompanyIds }),
      },
    });
  }

  /** Get contact permission state (simplified view). */
  async getContactPermissions(userId: string) {
    const settings = await this.getDiscoverabilitySettings(userId);
    return {
      contactPermitted: settings.contactPermitted,
      discoverabilityLevel: settings.discoverabilityLevel,
    };
  }

  /** Update contact permission specifically. */
  async updateContactPermissions(userId: string, contactPermitted: boolean) {
    await this.getDiscoverabilitySettings(userId);
    return this.prisma.recruiterDiscoverabilitySettings.update({
      where: { userId },
      data: { contactPermitted },
    });
  }
}
