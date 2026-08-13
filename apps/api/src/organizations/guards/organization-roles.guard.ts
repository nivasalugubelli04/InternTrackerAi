import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationRole } from '@prisma/client';

export const ORG_ROLES_KEY = 'org_roles';

/**
 * Decorator to enforce Organization Roles on a route.
 */
export const OrgRoles = (...roles: OrganizationRole[]) => (
  target: any,
  _propertyKey?: string,
  descriptor?: PropertyDescriptor
) => {
  if (descriptor) {
    Reflect.defineMetadata(ORG_ROLES_KEY, roles, descriptor.value);
    return descriptor;
  }
  Reflect.defineMetadata(ORG_ROLES_KEY, roles, target);
  return target;
};

@Injectable()
export class OrganizationRolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(ORG_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No specific org roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = request.params.orgId || request.body.organizationId || request.query.organizationId;

    if (!user || !orgId) {
      throw new ForbiddenException('Missing user or organization context');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('You are not an active member of this organization');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
    }

    // Attach membership to request for downstream use
    request.orgMembership = membership;

    return true;
  }
}
