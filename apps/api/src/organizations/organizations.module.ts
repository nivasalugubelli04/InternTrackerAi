import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsController } from './controllers/organizations.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { OrganizationsService } from './services/organizations.service';
import { MembersService } from './services/members.service';
import { StudentImportService } from './services/student-import.service';
import { PlacementAnalyticsService } from './analytics/placement-analytics.service';
import { OrganizationRolesGuard } from './guards/organization-roles.guard';

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
