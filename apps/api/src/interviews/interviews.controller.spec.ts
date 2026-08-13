import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';

import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

describe('InterviewsController', () => {
  let controller: InterviewsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
      controllers: [InterviewsController],
      providers: [
        {
          provide: InterviewsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<InterviewsController>(InterviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
