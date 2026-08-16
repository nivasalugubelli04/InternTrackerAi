import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RecruiterGuard } from '../guards/recruiter.guard';
import { VerifiedOrgGuard } from '../guards/verified-org.guard';
import { HiringAnalyticsService } from '../services/hiring-analytics.service';
import { CreateOfferDto, OfferService } from '../services/offer.service';

@Controller('api/v1/recruiter')
@UseGuards(RecruiterGuard)
export class RecruiterOfferController {
  constructor(
    private readonly offerService: OfferService,
    private readonly analyticsService: HiringAnalyticsService,
  ) {}

  @Post('offers')
  createOffer(@Request() req: any, @Body() dto: CreateOfferDto) {
    return this.offerService.createOffer(
      req.user.id,
      req.recruiterProfile.recruiterOrgId,
      dto,
    );
  }

  @Get('offers')
  listOffers(@Request() req: any) {
    return this.offerService.listOffers(req.recruiterProfile.recruiterOrgId);
  }

  @Get('offers/:id')
  getOffer(@Request() req: any, @Param('id') id: string) {
    return this.offerService.getOffer(id, req.recruiterProfile.recruiterOrgId);
  }

  @Post('offers/:id/send')
  @UseGuards(VerifiedOrgGuard)
  sendOffer(@Request() req: any, @Param('id') id: string) {
    return this.offerService.sendOffer(
      id,
      req.recruiterProfile.recruiterOrgId,
      req.user.id,
    );
  }

  @Post('offers/:id/withdraw')
  withdrawOffer(@Request() req: any, @Param('id') id: string) {
    return this.offerService.withdrawOffer(
      id,
      req.recruiterProfile.recruiterOrgId,
      req.user.id,
    );
  }

  @Get('analytics/hiring')
  getHiringAnalytics(@Request() req: any) {
    return this.analyticsService.getRecruiterHiringAnalytics(
      req.recruiterProfile.recruiterOrgId,
    );
  }
}
