import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';

import { CAREER_CENTER_QUEUE } from '../../queues/queue.constants';

import { CareerEventsService } from './career-events.service';

describe('CareerEventsService', () => {
  let service: CareerEventsService;
  let queue: any;

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerEventsService,
        { provide: getQueueToken(CAREER_CENTER_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<CareerEventsService>(CareerEventsService);
    queue = module.get(getQueueToken(CAREER_CENTER_QUEUE));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should add job to BullMQ queue when publishing event', async () => {
    const event = {
      userId: 'user-123',
      eventType: 'NEW_OPPORTUNITY',
      source: 'Scraper',
      entityType: 'JobPosting',
      entityId: 'job-123',
    };

    await service.publish(event);
    expect(queue.add).toHaveBeenCalledWith(
      'PROCESS_EVENT',
      expect.objectContaining({
        jobType: 'PROCESS_EVENT',
        userId: 'user-123',
      }),
      expect.any(Object),
    );
  });
});
