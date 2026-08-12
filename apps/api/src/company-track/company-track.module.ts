import { Module } from '@nestjs/common';

import { CompanyTrackController } from './company-track.controller';
import { CompanyTrackService } from './company-track.service';

@Module({
  controllers: [CompanyTrackController],
  providers: [CompanyTrackService],
})
export class CompanyTrackModule {}
