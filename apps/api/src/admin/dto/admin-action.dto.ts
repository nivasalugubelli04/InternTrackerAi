import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserNoteDto {
  @IsString()
  @IsNotEmpty()
  noteText!: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class SuspendUserDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class RestoreUserDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
