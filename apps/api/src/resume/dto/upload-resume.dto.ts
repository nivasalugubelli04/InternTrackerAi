import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsInt, Min, Max, IsUrl, MaxLength, IsIn } from 'class-validator';

export class UploadResumeDto {
  @ApiProperty({ example: 'john_doe_resume.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'https://storage.example.com/resumes/uuid.pdf' })
  @IsUrl({}, { message: 'fileUrl must be a valid URL' })
  @MaxLength(1000)
  fileUrl!: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes (max 5MB = 5242880)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024)
  fileSize!: number;

  @ApiProperty({
    example: 'application/pdf',
    description:
      'application/pdf or application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])
  mimeType!: string;
}
