import { createHash, randomBytes } from 'crypto';

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import type { AppConfig } from '../config/configuration';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: Omit<User, 'passwordHash'>;
}

/**
 * AuthService — core authentication orchestration.
 *
 * Architectural Decisions:
 *  - Token hashing: raw tokens are hashed (SHA-256) before DB storage.
 *    The raw token is given to the client once; the hash is what we check.
 *  - Refresh token rotation: on every /refresh call, the old token is
 *    revoked and a new token pair is issued. Reuse of a revoked token
 *    triggers a security event.
 *  - Account lockout: after maxLoginAttempts failed logins, the account
 *    is locked for lockoutDurationMinutes. This complements rate limiting.
 *  - Email tokens expire in 24h (verification) or 1h (password reset).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ message: string }> {
    if (!dto.invitationCode) {
      throw new BadRequestException('A valid beta invitation code is required for registration.');
    }

    const invitation = await this.prisma.betaInvitation.findUnique({
      where: { code: dto.invitationCode.toUpperCase() },
    });

    if (!invitation || !invitation.isActive || (invitation.expiresAt && invitation.expiresAt < new Date())) {
      throw new BadRequestException('Invalid or expired beta invitation code.');
    }

    if (invitation.usedCount >= invitation.maxUses) {
      throw new BadRequestException('This beta invitation code has reached its maximum usage limit.');
    }

    const { bcryptRounds } = this.configService.get('security', { infer: true });
    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      ...(dto.firstName ? { firstName: dto.firstName } : {}),
      ...(dto.lastName ? { lastName: dto.lastName } : {}),
    });

    // Create beta access and update invitation
    await this.prisma.$transaction([
      this.prisma.betaAccess.create({
        data: {
          userId: user.id,
          invitationId: invitation.id,
          cohort: invitation.cohort,
        },
      }),
      this.prisma.betaInvitation.update({
        where: { id: invitation.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    // Send verification email (non-blocking)
    const token = await this.createEmailVerificationToken(user.id);
    void this.emailService.sendVerificationEmail(user.email, token, user.firstName ?? undefined);

    this.logger.log({ userId: user.id }, 'New user registered');
    return { message: 'Registration successful. Please check your email to verify your account.' };
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const { maxLoginAttempts, lockoutDurationMinutes } = this.configService.get('security', {
      infer: true,
    });

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Constant-time comparison to prevent email enumeration
      await bcrypt.compare(dto.password, '$2b$10$invalidhashtopreventenumeration');
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
      );
    }

    // Check if account is active
    if (!user.isActive) {
      throw new ForbiddenException('Account has been deactivated. Contact support.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.usersService.incrementLoginAttempts(
        userId(user),
        maxLoginAttempts,
        lockoutDurationMinutes,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset login attempts on success
    await this.usersService.resetLoginAttempts(user.id, new Date());

    const tokens = await this.generateTokens(user, ipAddress, userAgent);
    this.logger.log({ userId: user.id }, 'User logged in');

    return { ...tokens, user: this.usersService.sanitize(user) };
  }

  // ── Refresh ─────────────────────────────────────────────────────────────────
  async refresh(
    userId: string,
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.userId !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.isRevoked) {
      // Token reuse detected — revoke ALL tokens for this user (security incident)
      await this.revokeAllUserTokens(userId);
      this.logger.warn({ userId }, 'Refresh token reuse detected — all tokens revoked');
      throw new UnauthorizedException('Refresh token has been reused. Please log in again.');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired. Please log in again.');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    return this.generateTokens(storedToken.user, ipAddress, userAgent);
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  async logout(userId: string, rawRefreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, userId },
      data: { isRevoked: true },
    });
    this.logger.log({ userId }, 'User logged out');
    return { message: 'Logged out successfully' };
  }

  // ── Verify Email ─────────────────────────────────────────────────────────────
  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt !== null) {
      throw new BadRequestException('Invalid or already used verification token');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired. Request a new one.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      }),
    ]);

    this.logger.log({ userId: record.userId }, 'Email verified');
    return { message: 'Email verified successfully. You can now log in.' };
  }

  // ── Forgot Password ──────────────────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const token = await this.createPasswordResetToken(user.id);
    void this.emailService.sendPasswordResetEmail(user.email, token, user.firstName ?? undefined);

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  // ── Reset Password ───────────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt !== null) {
      throw new BadRequestException('Invalid or already used reset token');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired. Request a new one.');
    }

    const { bcryptRounds } = this.configService.get('security', { infer: true });
    const passwordHash = await bcrypt.hash(dto.newPassword, bcryptRounds);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, loginAttempts: 0, lockedUntil: null },
      }),
    ]);

    // Revoke all refresh tokens on password reset (security best practice)
    await this.revokeAllUserTokens(record.userId);

    this.logger.log({ userId: record.userId }, 'Password reset');
    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  // ── Change Password ──────────────────────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByIdOrThrow(userId);
    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const { bcryptRounds } = this.configService.get('security', { infer: true });
    const passwordHash = await bcrypt.hash(dto.newPassword, bcryptRounds);
    await this.usersService.updatePassword(userId, passwordHash);

    // Revoke all refresh tokens on password change
    await this.revokeAllUserTokens(userId);

    this.logger.log({ userId }, 'Password changed');
    return { message: 'Password changed successfully. Please log in again.' };
  }

  // ── Current User ─────────────────────────────────────────────────────────────
  async getMe(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.findByIdOrThrow(userId);
    return this.usersService.sanitize(user);
  }

  // ── Resend Verification Email ─────────────────────────────────────────────────
  async resendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findByIdOrThrow(userId);
    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const token = await this.createEmailVerificationToken(user.id);
    void this.emailService.sendVerificationEmail(user.email, token, user.firstName ?? undefined);
    return { message: 'Verification email resent. Please check your inbox.' };
  }

  // ── Private Helpers ──────────────────────────────────────────────────────────

  private async generateTokens(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const betaAccess = await this.prisma.betaAccess.findUnique({
      where: { userId: user.id },
    });

    const isBeta = betaAccess && !betaAccess.isRevoked ? true : false;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isBeta,
    };
    const jwtConfig = this.configService.get('jwt', { infer: true });

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConfig.accessSecret,
      expiresIn: jwtConfig.accessExpiresIn,
    });

    const rawRefreshToken = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = this.parseExpiry(jwtConfig.refreshExpiresIn);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private async createEmailVerificationToken(userId: string): Promise<string> {
    // Invalidate any existing tokens
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await this.prisma.emailVerificationToken.create({
      data: { tokenHash, userId, expiresAt },
    });

    return rawToken;
  }

  private async createPasswordResetToken(userId: string): Promise<string> {
    // Invalidate any existing tokens
    await this.prisma.passwordResetToken.deleteMany({ where: { userId } });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await this.prisma.passwordResetToken.create({
      data: { tokenHash, userId, expiresAt },
    });

    return rawToken;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  private parseExpiry(expiry: string): Date {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const ms =
      unit === 'd'
        ? value * 24 * 60 * 60 * 1000
        : unit === 'h'
          ? value * 60 * 60 * 1000
          : unit === 'm'
            ? value * 60 * 1000
            : value * 1000;
    return new Date(Date.now() + ms);
  }
}

// Helper to safely access user.id in login method
function userId(user: User): string {
  return user.id;
}
