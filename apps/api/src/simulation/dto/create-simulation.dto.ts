import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

import {
  TimeAllocation,
  TimeHorizon,
  SimulationVariables,
  ScenarioType,
} from '../interfaces/simulation.interfaces';

export class CreateSimulationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  timeHorizon?: TimeHorizon;

  @IsString()
  @IsOptional()
  targetPathTitle?: string;

  @IsObject()
  @IsOptional()
  customVariables?: SimulationVariables;

  @IsObject()
  @IsOptional()
  customTimeAllocation?: Partial<TimeAllocation>;
}

export class AddScenarioDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  scenarioType?: ScenarioType;

  @IsObject()
  variables!: SimulationVariables;

  @IsObject()
  @IsOptional()
  timeAllocation?: Partial<TimeAllocation>;

  @IsArray()
  @IsOptional()
  assumptions?: string[];
}
