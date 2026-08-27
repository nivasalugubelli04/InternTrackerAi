import { SetMetadata } from '@nestjs/common';

import { BillingFeatureKey } from '../interfaces/billing.interfaces';

export const REQUIRE_ENTITLEMENT_KEY = 'REQUIRE_ENTITLEMENT_KEY';
export const REQUIRE_USAGE_AMOUNT_KEY = 'REQUIRE_USAGE_AMOUNT_KEY';

/**
 * Decorator to enforce plan entitlement or feature availability on NestJS controller endpoints.
 */
export const RequireEntitlement = (feature: BillingFeatureKey | string) =>
  SetMetadata(REQUIRE_ENTITLEMENT_KEY, feature);

/**
 * Decorator to enforce quota check and auto-increment consumption on endpoint invocation.
 */
export const RequireUsage = (feature: BillingFeatureKey | string, amount: number = 1) => {
  return (target: any, key: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    SetMetadata(REQUIRE_ENTITLEMENT_KEY, feature)(target, key, descriptor);
    SetMetadata(REQUIRE_USAGE_AMOUNT_KEY, amount)(target, key, descriptor);
  };
};
