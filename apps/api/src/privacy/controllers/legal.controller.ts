import { Controller, Get } from '@nestjs/common';

import { LegalPolicyService } from '../services/legal-policy.service';

@Controller('v1/legal')
export class LegalController {
  constructor(private readonly legalService: LegalPolicyService) {}

  @Get('terms')
  getTerms() {
    return this.legalService.getTermsOfService();
  }

  @Get('privacy')
  getPrivacyPolicy() {
    return this.legalService.getPrivacyPolicy();
  }

  @Get('ai-transparency')
  getAiTransparency() {
    return this.legalService.getAiTransparencyPolicy();
  }

  @Get('acceptable-use')
  getAcceptableUse() {
    return this.legalService.getAcceptableUsePolicy();
  }
}
