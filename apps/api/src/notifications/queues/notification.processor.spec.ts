/**
 * Phase 6 — NotificationProcessor Unit Tests
 */

import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import {
  EMAIL_QUEUE,
  PUSH_QUEUE,
  SMS_QUEUE,
  JOB_SEND_EMAIL,
  JOB_SEND_PUSH,
  JOB_SEND_SMS,
} from '../constants/notification.constants';
import { NotificationChannel, NotificationPriority } from '../enums/notification.enums';
import type { NotificationJobData } from '../interfaces/notification-decision.interface';
import { DeliveryTrackerService } from '../services/delivery-tracker.service';

import { NotificationProcessor } from './notification.processor';

const mockEmailQueue = { add: jest.fn() };
const mockPushQueue = { add: jest.fn() };
const mockSmsQueue = { add: jest.fn() };
const mockTracker = {
  trackQueued: jest.fn().mockResolvedValue(undefined),
};

const makeJob = (channel: NotificationChannel): { data: NotificationJobData } => ({
  data: {
    notificationId: 'notif-uuid-1',
    userId: 'user-uuid-1',
    channel,
    priority: NotificationPriority.HIGH,
    title: 'Test',
    message: 'Test message',
    recipient: 'test@example.com',
  },
});

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: getQueueToken(EMAIL_QUEUE), useValue: mockEmailQueue },
        { provide: getQueueToken(PUSH_QUEUE), useValue: mockPushQueue },
        { provide: getQueueToken(SMS_QUEUE), useValue: mockSmsQueue },
        { provide: DeliveryTrackerService, useValue: mockTracker },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
  });

  it('routes EMAIL jobs to the email queue', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await processor.process(makeJob(NotificationChannel.EMAIL) as any);
    expect(mockEmailQueue.add).toHaveBeenCalledWith(
      JOB_SEND_EMAIL,
      expect.objectContaining({ channel: NotificationChannel.EMAIL }),
      expect.any(Object),
    );
    expect(mockTracker.trackQueued).toHaveBeenCalledWith('notif-uuid-1');
  });

  it('routes PUSH jobs to the push queue', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await processor.process(makeJob(NotificationChannel.PUSH) as any);
    expect(mockPushQueue.add).toHaveBeenCalledWith(
      JOB_SEND_PUSH,
      expect.objectContaining({ channel: NotificationChannel.PUSH }),
      expect.any(Object),
    );
  });

  it('routes SMS jobs to the sms queue', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await processor.process(makeJob(NotificationChannel.SMS) as any);
    expect(mockSmsQueue.add).toHaveBeenCalledWith(
      JOB_SEND_SMS,
      expect.objectContaining({ channel: NotificationChannel.SMS }),
      expect.any(Object),
    );
  });
});
