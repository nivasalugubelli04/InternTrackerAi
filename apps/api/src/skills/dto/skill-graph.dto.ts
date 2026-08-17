import { ApiProperty } from '@nestjs/swagger';
import { SkillCategory, SkillRelationType, RoleSkillRequirement } from '@prisma/client';
import { IsString, IsOptional, IsEnum, IsArray, IsNumber, Min, Max, IsInt } from 'class-validator';

export class CreateSkillDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: SkillCategory })
  @IsEnum(SkillCategory)
  category!: SkillCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];
}

export class UpdateSkillDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: SkillCategory, required: false })
  @IsOptional()
  @IsEnum(SkillCategory)
  category?: SkillCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateRelationshipDto {
  @ApiProperty()
  @IsString()
  fromSkillId!: string;

  @ApiProperty()
  @IsString()
  toSkillId!: string;

  @ApiProperty({ enum: SkillRelationType })
  @IsEnum(SkillRelationType)
  relationType!: SkillRelationType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1.0)
  weight?: number;
}

export class UpdateRelationshipDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1.0)
  weight!: number;
}

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class LinkRoleSkillDto {
  @ApiProperty({ enum: RoleSkillRequirement })
  @IsEnum(RoleSkillRequirement)
  requirement!: RoleSkillRequirement;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  importance?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1.0)
  weight?: number;
}

export class CreateCareerPathDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateCareerPathStepDto {
  @ApiProperty()
  @IsString()
  roleId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  stepNumber!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  skills!: string[];
}
