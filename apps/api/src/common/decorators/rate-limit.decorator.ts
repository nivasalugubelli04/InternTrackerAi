import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_PROFILE_KEY = 'rateLimitProfile';

/**
 * Assigns a specific named throttler profile to a route.
 * @param profile The name of the throttler profile to use (e.g. 'login', 'ai_chat')
 */
export const RateLimitProfile = (profile: string) => SetMetadata(RATE_LIMIT_PROFILE_KEY, profile);
