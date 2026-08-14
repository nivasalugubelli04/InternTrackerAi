import { Body, Controller, Get, Patch, Request } from '@nestjs/common';
import { PrivacyService, UpdateDiscoverabilityDto } from '../services/privacy.service';

@Controller('api/v1/privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('recruiter-visibility')
  getDiscoverabilitySettings(@Request() req: any) {
    return this.privacyService.getDiscoverabilitySettings(req.user.id);
  }

  @Patch('recruiter-visibility')
  updateDiscoverabilitySettings(@Request() req: any, @Body() dto: UpdateDiscoverabilityDto) {
    return this.privacyService.updateDiscoverabilitySettings(req.user.id, dto);
  }

  @Get('contact-permissions')
  getContactPermissions(@Request() req: any) {
    return this.privacyService.getContactPermissions(req.user.id);
  }

  @Patch('contact-permissions')
  updateContactPermissions(
    @Request() req: any,
    @Body() body: { contactPermitted: boolean },
  ) {
    return this.privacyService.updateContactPermissions(req.user.id, body.contactPermitted);
  }
}
