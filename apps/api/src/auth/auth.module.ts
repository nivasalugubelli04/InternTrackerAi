import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import type { AppConfig } from '../config/configuration';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * AuthModule wires together all authentication concerns.
 *
 * Architectural Decision:
 *  - JwtModule is configured async so it reads secrets from ConfigService
 *    rather than hardcoded values. The default options use the access token
 *    secret; the refresh strategy overrides this at the strategy level.
 *  - PassportModule default strategy is 'jwt' (access token).
 *  - JwtAuthGuard and JwtRefreshGuard are exported so AppModule can register
 *    JwtAuthGuard as a global guard via APP_GUARD.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        secret: configService.get('jwt', { infer: true }).accessSecret,
        signOptions: {
          expiresIn: configService.get('jwt', { infer: true }).accessExpiresIn,
        },
      }),
    }),
    UsersModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, JwtAuthGuard, JwtRefreshGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
