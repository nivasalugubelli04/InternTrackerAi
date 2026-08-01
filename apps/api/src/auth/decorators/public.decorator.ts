import { SetMetadata } from '@nestjs/common';

/**
 * @Public decorator marks a route as publicly accessible — JwtAuthGuard
 * will skip authentication when this metadata key is present.
 *
 * Usage:
 *   @Public()
 *   @Post('login')
 *   login(...) { ... }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator => SetMetadata(IS_PUBLIC_KEY, true);
