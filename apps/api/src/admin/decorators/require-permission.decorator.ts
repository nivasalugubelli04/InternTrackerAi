import { SetMetadata } from '@nestjs/common';

import { AdminPermission } from '../enums/admin-permission.enum';

export const REQUIRE_PERMISSION_KEY = 'REQUIRE_PERMISSION_KEY';

/**
 * Decorator to enforce granular admin permissions on administrative endpoints.
 */
export const RequirePermission = (...permissions: AdminPermission[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissions);
