import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { FastifyRequest } from 'fastify';

import { RateLimitProfile } from '../common/decorators/rate-limit.decorator';

import type { AuthResponse, AuthTokens } from './auth.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtRefreshPayload } from './strategies/jwt-refresh.strategy';
import { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Registration ─────────────────────────────────────────────────────────────
  @Public()
  @RateLimitProfile('register')
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Registration successful — verification email sent' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  register(@Body() dto: RegisterDto): Promise<{ message: string }> {
    return this.authService.register(dto);
  }

  // ── Login ─────────────────────────────────────────────────────────────────────
  @Public()
  @RateLimitProfile('login')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful — returns access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked' })
  login(@Body() dto: LoginDto, @Req() req: FastifyRequest): Promise<AuthResponse> {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip;
    const ua = req.headers['user-agent'] ?? '';
    return this.authService.login(dto, ip, ua);
  }

  // ── Refresh ───────────────────────────────────────────────────────────────────
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token — get new access + refresh token pair' })
  @ApiBearerAuth('refresh-token')
  @ApiResponse({ status: 200, description: 'New token pair issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(@CurrentUser() user: JwtRefreshPayload, @Req() req: FastifyRequest): Promise<AuthTokens> {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.ip;
    const ua = req.headers['user-agent'] ?? '';
    return this.authService.refresh(user.sub, user.refreshToken, ip, ua);
  }

  // ── Logout ────────────────────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — revoke the refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  logout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    return this.authService.logout(user.sub, dto.refreshToken);
  }

  // ── Verify Email ──────────────────────────────────────────────────────────────
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token from email' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    return this.authService.verifyEmail(dto.token);
  }

  // ── Resend Verification Email ──────────────────────────────────────────────────
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend verification email to current user' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  resendVerification(@CurrentUser() user: JwtPayload): Promise<{ message: string }> {
    return this.authService.resendVerificationEmail(user.sub);
  }

  // ── Forgot Password ───────────────────────────────────────────────────────────
  @Public()
  @RateLimitProfile('forgot_password')
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent (always returns success to prevent enumeration)',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  // ── Reset Password ────────────────────────────────────────────────────────────
  @Public()
  @RateLimitProfile('forgot_password')
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  // ── Change Password ───────────────────────────────────────────────────────────
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiResponse({ status: 200, description: 'Password changed — all sessions revoked' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user.sub, dto);
  }

  // ── Current User ──────────────────────────────────────────────────────────────
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  getMe(@CurrentUser() user: JwtPayload): Promise<Omit<User, 'passwordHash'>> {
    return this.authService.getMe(user.sub);
  }
}
