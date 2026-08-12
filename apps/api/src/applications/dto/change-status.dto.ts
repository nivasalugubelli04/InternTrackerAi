import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';

export class ChangeApplicationStatusDto {
  @ApiProperty({
    enum: ApplicationStatus,
    description: 'The new status of the application',
    example: ApplicationStatus.INTERVIEW,
  })
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Optional note for this status change',
    example: 'Scheduled first round',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
