import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { PlacementAnalyticsService } from './analytics/placement-analytics.service';
import { AnalyticsController } from './controllers/analytics.controller';
import { OrganizationsController } from './controllers/organizations.controller';
import { OrganizationRolesGuard } from './guards/organization-roles.guard';
import { MembersService } from './services/members.service';
import { OrganizationsService } from './services/organizations.service';
import { StudentImportService } from './services/student-import.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationsController, AnalyticsController],
  providers: [
    OrganizationsService,
    MembersService,
    StudentImportService,
    PlacementAnalyticsService,
    OrganizationRolesGuard,
  ],
  exports: [OrganizationsService, MembersService],
})
export class OrganizationsModule {}
