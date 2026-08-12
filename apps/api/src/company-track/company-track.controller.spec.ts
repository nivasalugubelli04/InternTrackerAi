import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { CompanyTrackController } from './company-track.controller';
import { CompanyTrackService } from './company-track.service';

describe('CompanyTrackController', () => {
  let controller: CompanyTrackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyTrackController],
      providers: [
        {
          provide: CompanyTrackService,
          useValue: {
            trackCompany: jest.fn(),
            untrackCompany: jest.fn(),
            getUserTrackedCompanies: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CompanyTrackController>(CompanyTrackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
