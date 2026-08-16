import { IsOptional, IsDateString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { OutcomeSnapshotPeriod } from '@prisma/client';

export class OutcomePeriodQueryDto {
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsEnum(OutcomeSnapshotPeriod)
  periodType?: OutcomeSnapshotPeriod;
}

export class OutcomePaginationQueryDto extends OutcomePeriodQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(12)
  months?: number = 6;
}
