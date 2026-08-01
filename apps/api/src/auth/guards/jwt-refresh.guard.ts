import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtRefreshGuard — used exclusively on the /auth/refresh endpoint.
 * Validates the refresh token using the 'jwt-refresh' strategy.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
