import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { AdminPermission, ROLE_PERMISSIONS } from '../enums/admin-permission.enum';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<AdminPermission[] | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException('Admin authentication and role required');
    }

    // Super admin bypasses granular check
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const grantedPermissions = ROLE_PERMISSIONS[user.role] || [];
    const hasPermission = requiredPermissions.every((perm) => grantedPermissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
        requiredPermissions,
        userRole: user.role,
      });
    }

    return true;
  }
}
