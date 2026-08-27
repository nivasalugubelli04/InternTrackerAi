import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export enum ConsentType {
  TERMS = 'TERMS',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  OPTIONAL_ANALYTICS = 'OPTIONAL_ANALYTICS',
  PRODUCT_UPDATES = 'PRODUCT_UPDATES',
  AI_DATA_PROCESSING = 'AI_DATA_PROCESSING',
}

export class RecordConsentDto {
  @IsEnum(ConsentType)
  @IsNotEmpty()
  consentType!: ConsentType;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsBoolean()
  isGranted!: boolean;
}

export class UpdatePrivacyPreferencesDto {
  @IsOptional()
  @IsBoolean()
  optionalAnalytics?: boolean;

  @IsOptional()
  @IsBoolean()
  productUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  aiDataProcessing?: boolean;
}

export class RequestAccountDeletionDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsString()
  @IsNotEmpty()
  confirmation!: string; // e.g. "DELETE MY ACCOUNT"
}

export enum SupportCategory {
  ACCOUNT = 'ACCOUNT',
  TECHNICAL = 'TECHNICAL',
  BILLING = 'BILLING',
  SUBSCRIPTION = 'SUBSCRIPTION',
  AI_QUALITY = 'AI_QUALITY',
  PRIVACY_DATA = 'PRIVACY_DATA',
  SECURITY_REPORT = 'SECURITY_REPORT',
  FEATURE_QUESTION = 'FEATURE_QUESTION',
  OTHER = 'OTHER',
}

export enum SupportPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateSupportTicketDto {
  @IsEnum(SupportCategory)
  @IsNotEmpty()
  category!: SupportCategory;

  @IsOptional()
  @IsEnum(SupportPriority)
  priority?: SupportPriority;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class AddTicketMessageDto {
  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class UpdateTicketStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsOptional()
  @IsString()
  resolutionSummary?: string;
}
