import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsUUID()
  jobId?: string;

  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  isPinned?: boolean;
}

export class SaveMemoryDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  memoryType?: string;
}

export class ConfirmProposalDto {
  @IsOptional()
  @IsString()
  customNotes?: string;
}
