import { ExecutionContext, Injectable } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerOptions,
  ThrottlerGetTrackerFunction,
  ThrottlerGenerateKeyFunction,
} from '@nestjs/throttler';

import { RATE_LIMIT_PROFILE_KEY } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected override async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: ThrottlerOptions,
    getTracker: ThrottlerGetTrackerFunction,
    generateKey: ThrottlerGenerateKeyFunction,
  ): Promise<boolean> {
    // Determine the profile specified on the route
    const profile = this.reflector.getAllAndOverride<string>(RATE_LIMIT_PROFILE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // ThrottlerGuard in v5 loops over all registered throttlers and calls handleRequest for each.
    // If a specific profile is requested, we should skip (return true) for any throttler that is not that profile.
    if (profile) {
      if (throttler.name !== profile) {
        return true; // Skip
      }
    } else {
      // If no profile is requested, only apply the 'default' throttler.
      if (throttler.name !== 'default') {
        return true; // Skip
      }
    }

    return super.handleRequest(context, limit, ttl, throttler, getTracker, generateKey);
  }
}
