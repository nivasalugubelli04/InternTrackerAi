import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  CandidateDiscoveryService,
  CandidateSearchFilters,
} from '../services/candidate-discovery.service';
import { VerifiedOrgGuard } from '../guards/verified-org.guard';

@Controller('api/v1/recruiter/candidates')
@UseGuards(VerifiedOrgGuard)
export class CandidateDiscoveryController {
  constructor(private readonly discoveryService: CandidateDiscoveryService) {}

  @Get()
  searchCandidates(@Request() req: any, @Query() query: any) {
    const filters: CandidateSearchFilters = {
      keyword: query.keyword,
      skills: query.skills ? (Array.isArray(query.skills) ? query.skills : [query.skills]) : undefined,
      location: query.location,
      workMode: query.workMode,
      graduationYear: query.graduationYear ? parseInt(query.graduationYear) : undefined,
      degree: query.degree,
      branch: query.branch,
      experienceLevel: query.experienceLevel,
      careerInterests: query.careerInterests
        ? Array.isArray(query.careerInterests)
          ? query.careerInterests
          : [query.careerInterests]
        : undefined,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    };

    return this.discoveryService.searchCandidates(
      req.recruiterProfile.recruiterOrgId,
      req.user.id,
      filters,
    );
  }

  @Get(':id')
  getCandidateProfile(@Request() req: any, @Param('id') candidateId: string) {
    return this.discoveryService.getCandidateProfile(
      candidateId,
      req.recruiterProfile.recruiterOrgId,
      req.user.id,
    );
  }
}
