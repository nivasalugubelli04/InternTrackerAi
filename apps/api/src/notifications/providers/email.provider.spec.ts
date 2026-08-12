/**
 * Phase 6 — EmailProvider Unit Tests
 */

import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { NotificationChannel } from '../enums/notification.enums';
import type { NotificationPayload } from '../interfaces/notification-provider.interface';

import { EmailProvider } from './email.provider';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: '<test-msg-id@mailtrap.io>',
    }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'notifications') {
      return {
        sendgridApiKey: 'not-sendgrid-key',
        sendgridFrom: 'noreply@interntracker.ai',
      };
    }
    if (key === 'email') {
      return {
        host: 'smtp.mailtrap.io',
        port: 587,
        secure: false,
        user: 'test',
        password: 'test',
        from: 'noreply@interntracker.ai',
        frontendUrl: 'http://localhost:8081',
      };
    }
    return undefined;
  }),
};

const makePayload = (): NotificationPayload => ({
  notificationId: 'notif-1',
  userId: 'user-1',
  recipient: 'student@example.com',
  title: '🎯 New Internship Match',
  message: 'You have a 95% match! Check it out.',
  channel: NotificationChannel.EMAIL,
  actionUrl: 'https://interntracker.ai/jobs/123',
});

describe('EmailProvider', () => {
  let provider: EmailProvider;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailProvider, { provide: ConfigService, useValue: mockConfig }],
    }).compile();

    provider = module.get<EmailProvider>(EmailProvider);
  });

  it('should have channel = EMAIL', () => {
    expect(provider.channel).toBe(NotificationChannel.EMAIL);
  });

  it('should have providerName = sendgrid', () => {
    expect(provider.providerName).toBe('sendgrid');
  });

  it('returns success result when mail is sent', async () => {
    const result = await provider.send(makePayload());
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('returns failure result gracefully on transporter error', async () => {
    const nodemailer = await import('nodemailer');
    const mockTransport = {
      sendMail: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      verify: jest.fn().mockResolvedValue(true),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValueOnce(mockTransport);

    // Re-create provider with failing transport
    const failModule: TestingModule = await Test.createTestingModule({
      providers: [EmailProvider, { provide: ConfigService, useValue: mockConfig }],
    }).compile();

    const failProvider = failModule.get<EmailProvider>(EmailProvider);
    const result = await failProvider.send(makePayload());
    expect(result.success).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('healthCheck returns true when transporter connects', async () => {
    const healthy = await provider.healthCheck();
    expect(healthy).toBe(true);
  });
});
