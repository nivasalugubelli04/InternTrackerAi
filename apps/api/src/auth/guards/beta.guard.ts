import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class BetaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false; // Expecting JwtAuthGuard to run before this
    }

    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return true; // Admins bypass beta guard
    }

    if (!user.isBeta) {
      throw new ForbiddenException('You do not have active beta access for this platform.');
    }

    return true;
  }
}
