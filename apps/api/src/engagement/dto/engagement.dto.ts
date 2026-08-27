import { IsString, IsNotEmpty, IsOptional, IsObject, MaxLength } from 'class-validator';

export class RecordActionDto {
  @IsString()
  @IsNotEmpty()
  actionType!: 'OPENED' | 'CLICKED' | 'COMPLETED' | 'DISMISSED';

  @IsString()
  @IsNotEmpty()
  featureArea!: string;

  @IsOptional()
  @IsString()
  signalId?: string;

  @IsOptional()
  @IsString()
  notificationId?: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, any>;
}

export class CreateEngagementSignalDto {
  @IsString()
  @IsNotEmpty()
  signalType!: string;

  @IsOptional()
  @IsString()
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  recommendedAction!: string;

  @IsOptional()
  @IsString()
  targetRoute?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
