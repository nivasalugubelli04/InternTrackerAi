import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AppConfig } from '../../config/configuration';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
  isBeta?: boolean;
  iat?: number;
  exp?: number;
}

/**
 * JWT Access Token Strategy.
 *
 * Architectural Decision:
 *  - Extracts the Bearer token from the Authorization header.
 *  - Validates the token signature against JWT_ACCESS_SECRET.
 *  - Returns a typed JwtPayload that is attached to request.user.
 *  - Throws UnauthorizedException if token is expired or invalid.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService<AppConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt', { infer: true }).accessSecret,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return payload;
  }
}
