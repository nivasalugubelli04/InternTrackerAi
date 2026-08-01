import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

import { AuthService } from './auth.service';

// ── Mock factories ──────────────────────────────────────────────────────────
const mockUser = {
  id: 'uuid-123',
  email: 'test@example.com',
  passwordHash: '$2b$10$hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER' as const,
  isEmailVerified: true,
  isActive: true,
  loginAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrismaService = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  emailVerificationToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
};

const mockUsersService = {
  findByEmail: jest.fn(),
  findByIdOrThrow: jest.fn(),
  create: jest.fn(),
  sanitize: jest.fn((user) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...rest } = user;
    return rest;
  }),
  incrementLoginAttempts: jest.fn(),
  resetLoginAttempts: jest.fn(),
  updatePassword: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

const mockEmailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config = {
      security: { bcryptRounds: 1, maxLoginAttempts: 5, lockoutDurationMinutes: 15 },
      jwt: {
        accessSecret: 'test-secret',
        refreshSecret: 'test-refresh-secret',
        accessExpiresIn: '15m',
        refreshExpiresIn: '7d',
      },
    };
    return config[key as keyof typeof config];
  }),
};

// ── Test Suite ──────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── Register ─────────────────────────────────────────────────────────────
  describe('register', () => {
    it('should register a new user and send verification email', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);
      mockPrismaService.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.emailVerificationToken.create.mockResolvedValue({});

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.message).toContain('Registration successful');
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.create.mockRejectedValue(
        new ConflictException('An account with this email already exists'),
      );

      await expect(
        service.register({ email: 'existing@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('should return tokens and user on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 1);
      const userWithHash = { ...mockUser, passwordHash };

      mockUsersService.findByEmail.mockResolvedValue(userWithHash);
      mockUsersService.resetLoginAttempts.mockResolvedValue(userWithHash);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'test@example.com', password: 'password123' });

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 1);
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash });
      mockUsersService.incrementLoginAttempts.mockResolvedValue({});

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // locked for 10 more minutes
      };
      mockUsersService.findByEmail.mockResolvedValue(lockedUser);

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for inactive account', async () => {
      const passwordHash = await bcrypt.hash('password123', 1);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash,
        isActive: false,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('uuid-123', 'raw-refresh-token');

      expect(result.message).toContain('Logged out');
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalled();
    });
  });

  // ── Verify Email ──────────────────────────────────────────────────────────
  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const record = {
        id: 'token-id',
        userId: 'uuid-123',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
      };
      mockPrismaService.emailVerificationToken.findUnique.mockResolvedValue(record);
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.verifyEmail('valid-token');
      expect(result.message).toContain('verified');
    });
  });

  // ── Forgot Password ───────────────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('should always return success (prevent email enumeration)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const result = await service.forgotPassword({ email: 'nobody@example.com' });
      expect(result.message).toContain('If that email exists');
    });
  });
});
