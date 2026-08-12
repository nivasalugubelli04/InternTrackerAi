import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CompaniesService } from './companies.service';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Search and browse companies' })
  findAll(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('industry') industry?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const params: any = {};
    if (q) params.q = q;
    if (category) params.category = category;
    if (industry) params.industry = industry;
    if (page) params.page = page;
    if (limit) params.limit = limit;

    return this.companiesService.findAll(params);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all company categories' })
  getCategories() {
    return this.companiesService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }
}
