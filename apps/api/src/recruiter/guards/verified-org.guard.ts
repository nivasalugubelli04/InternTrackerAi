import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RecruiterOrgVerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Ensures the authenticated recruiter belongs to a VERIFIED recruiter organization. */
@Injectable()
export class VerifiedOrgGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;
    if (!userId) throw new UnauthorizedException('Authentication required');

    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
      include: { recruiterOrg: true },
    });

    if (!profile) {
      throw new ForbiddenException({
        code: 'RECRUITER_PROFILE_REQUIRED',
        message: 'A recruiter profile is required',
      });
    }

    if (profile.isSuspended) {
      throw new ForbiddenException({
        code: 'RECRUITER_SUSPENDED',
        message: 'Your recruiter account has been suspended',
      });
    }

    if (profile.recruiterOrg.verificationStatus !== RecruiterOrgVerificationStatus.VERIFIED) {
      throw new ForbiddenException({
        code: 'ORG_NOT_VERIFIED',
        message:
          'Your organization must be verified by platform admins before accessing this feature',
      });
    }

    req.recruiterProfile = profile;
    return true;
  }
}
