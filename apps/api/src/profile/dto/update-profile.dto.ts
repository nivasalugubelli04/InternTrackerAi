import { PartialType } from '@nestjs/swagger';

import { CreateProfileDto } from './create-profile.dto';

/**
 * UpdateProfileDto — every field is optional (PATCH semantics).
 * Inherits all validators from CreateProfileDto.
 */
export class UpdateProfileDto extends PartialType(CreateProfileDto) {}
