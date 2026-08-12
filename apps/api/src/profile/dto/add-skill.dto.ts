import { ApiProperty } from '@nestjs/swagger';
import { ProficiencyLevel } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class AddSkillDto {
  @ApiProperty({ example: 'uuid-of-skill' })
  @IsString()
  @IsNotEmpty()
  skillId!: string;

  @ApiProperty({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] })
  @IsEnum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])
  proficiency!: ProficiencyLevel;
}
