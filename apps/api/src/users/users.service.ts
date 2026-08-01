import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/**
 * UsersService handles all User entity persistence operations.
 *
 * Architectural Decision:
 *  - UsersService owns the User table; no other service queries users directly.
 *  - All password-related fields are returned by default — callers must
 *    strip sensitive fields before sending to clients (AuthService does this).
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, loginAttempts: 0, lockedUntil: null },
    });
  }

  async markEmailVerified(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
  }

  async incrementLoginAttempts(
    userId: string,
    maxAttempts: number,
    lockoutMinutes: number,
  ): Promise<User> {
    const user = await this.findByIdOrThrow(userId);
    const newAttempts = user.loginAttempts + 1;
    const lockedUntil =
      newAttempts >= maxAttempts ? new Date(Date.now() + lockoutMinutes * 60 * 1000) : null;

    return this.prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: newAttempts, lockedUntil },
    });
  }

  async resetLoginAttempts(userId: string, lastLoginAt: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: 0, lockedUntil: null, lastLoginAt },
    });
  }

  /** Returns user without sensitive fields for API responses */
  sanitize(user: User): Omit<User, 'passwordHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...safe } = user;
    return safe;
  }
}
