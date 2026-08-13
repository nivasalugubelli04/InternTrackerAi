import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';

import { ResumeBuilderController } from './resume-builder.controller';
import { ResumeBuilderService } from './resume-builder.service';

describe('ResumeBuilderController', () => {
  let controller: ResumeBuilderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
      controllers: [ResumeBuilderController],
      providers: [
        {
          provide: ResumeBuilderService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ResumeBuilderController>(ResumeBuilderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
