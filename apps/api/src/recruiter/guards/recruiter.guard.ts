import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Ensures the authenticated user has a non-suspended RecruiterProfile. */
@Injectable()
export class RecruiterGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;
    if (!userId) throw new UnauthorizedException('Authentication required');

    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new ForbiddenException({
        code: 'RECRUITER_PROFILE_REQUIRED',
        message: 'A recruiter profile is required to access this resource',
      });
    }

    if (profile.isSuspended) {
      throw new ForbiddenException({
        code: 'RECRUITER_SUSPENDED',
        message: 'Your recruiter account has been suspended',
      });
    }

    // Attach profile to request for downstream use
    req.recruiterProfile = profile;
    return true;
  }
}
