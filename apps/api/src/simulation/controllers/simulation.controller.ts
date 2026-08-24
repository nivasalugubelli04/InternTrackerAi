import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AddScenarioDto, CreateSimulationDto } from '../dto/create-simulation.dto';
import { SimulationService } from '../services/simulation.service';

@Controller('simulations')
@UseGuards(JwtAuthGuard)
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  /**
   * POST /simulations
   * Run a new career simulation session with baseline snapshot & scenario comparison.
   */
  @Post()
  async createSimulation(@CurrentUser('id') userId: string, @Body() dto: CreateSimulationDto) {
    return this.simulationService.createAndRunSimulation(userId, dto);
  }

  /**
   * GET /simulations
   * List all historical simulations for the user.
   */
  @Get()
  async getUserSimulations(@CurrentUser('id') userId: string) {
    return this.simulationService.getUserSimulations(userId);
  }

  /**
   * GET /simulations/:id
   * Get complete details of a specific simulation session.
   */
  @Get(':id')
  async getSimulationById(@CurrentUser('id') userId: string, @Param('id') simulationId: string) {
    return this.simulationService.getSimulationById(userId, simulationId);
  }

  /**
   * POST /simulations/:id/scenarios
   * Add a custom scenario to an existing simulation.
   */
  @Post(':id/scenarios')
  async addScenario(
    @CurrentUser('id') userId: string,
    @Param('id') simulationId: string,
    @Body() dto: AddScenarioDto,
  ) {
    return this.simulationService.addScenario(userId, simulationId, dto);
  }

  /**
   * POST /simulations/:id/activate/:scenarioId
   * Converts a simulated scenario into an active Phase 45 Career Sprint.
   */
  @Post(':id/activate/:scenarioId')
  async activateScenario(
    @CurrentUser('id') userId: string,
    @Param('scenarioId') scenarioId: string,
  ) {
    return this.simulationService.activateScenario(userId, scenarioId);
  }

  /**
   * DELETE /simulations/:id
   * Delete a simulation session.
   */
  @Delete(':id')
  async deleteSimulation(@CurrentUser('id') userId: string, @Param('id') simulationId: string) {
    return this.simulationService.deleteSimulation(userId, simulationId);
  }
}
