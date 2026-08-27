import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  REQUIRE_ENTITLEMENT_KEY,
  REQUIRE_USAGE_AMOUNT_KEY,
} from '../decorators/require-entitlement.decorator';
import { EntitlementService } from '../services/entitlement.service';

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementService: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string | undefined>(REQUIRE_ENTITLEMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!feature) {
      return true; // No entitlement restriction on this endpoint
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('User authentication required for entitlement evaluation');
    }

    const amount =
      this.reflector.getAllAndOverride<number | undefined>(REQUIRE_USAGE_AMOUNT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 1;

    const evaluation = await this.entitlementService.evaluateEntitlement(userId, feature, amount);

    if (!evaluation.allowed) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'ENTITLEMENT_LIMIT_REACHED',
        feature,
        currentUsage: evaluation.currentUsage,
        limit: evaluation.limit,
        message: evaluation.reason || `Plan entitlement limit reached for ${feature}`,
        upgradeRoute: '/billing/pricing',
      });
    }

    // Attach evaluation & soft warning to request headers/object for optional response injection
    request.entitlementEvaluation = evaluation;

    return true;
  }
}
