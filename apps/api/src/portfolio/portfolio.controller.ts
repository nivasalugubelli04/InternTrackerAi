import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { PortfolioService } from './portfolio.service';
import { EvidenceGraphService } from './services/evidence-graph.service';
import { PortfolioIntelligenceService } from './services/portfolio-intelligence.service';
import { ProjectAnalysisService } from './services/project-analysis.service';

export class GenerateCaseStudyDto {
  @IsString()
  projectId!: string;
}

export class GenerateVariantsDto {
  @IsString()
  @IsOptional()
  style?: string;
}

@Controller('v1/portfolio')
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly intelligenceService: PortfolioIntelligenceService,
    private readonly evidenceGraphService: EvidenceGraphService,
    private readonly projectAnalysisService: ProjectAnalysisService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getPortfolio(@Req() req: Request) {
    return this.portfolioService.getPortfolio((req.user as any).id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async updatePortfolio(@Req() req: Request, @Body() data: any) {
    return this.portfolioService.updatePortfolio((req.user as any).id, data);
  }

  @Post('publish')
  @UseGuards(JwtAuthGuard)
  async publishPortfolio(@Req() req: Request, @Body('username') username: string) {
    return this.portfolioService.publishPortfolio((req.user as any).id, username);
  }

  @Post('unpublish')
  @UseGuards(JwtAuthGuard)
  async unpublishPortfolio(@Req() req: Request) {
    return this.portfolioService.unpublishPortfolio((req.user as any).id);
  }

  @Get('public/:username')
  async getPublicPortfolio(@Param('username') username: string) {
    return this.portfolioService.getPublicPortfolio(username);
  }

  @Post('optimize')
  @UseGuards(JwtAuthGuard)
  async optimizePortfolio(@Req() req: Request) {
    return this.portfolioService.optimizePortfolio((req.user as any).id);
  }

  // ── Phase 39 APIs ─────────────────────────────────────────────────────────

  @Get('intelligence')
  @UseGuards(JwtAuthGuard)
  async getIntelligence(@Req() req: Request) {
    return this.intelligenceService.getPortfolioIntelligence((req.user as any).id);
  }

  @Get('evidence')
  @UseGuards(JwtAuthGuard)
  async getEvidence(@Req() req: Request) {
    return this.evidenceGraphService.getEvidenceGraph((req.user as any).id);
  }

  @Get('evidence-map')
  @UseGuards(JwtAuthGuard)
  async getEvidenceMap(@Req() req: Request) {
    const graph = await this.evidenceGraphService.getEvidenceGraph((req.user as any).id);
    // Format into simplified visual map topology
    return {
      userId: (req.user as any).id,
      nodes: graph.map((g) => ({
        skillName: g.skillName,
        category: g.category,
        confidence: g.confidenceScore,
        strength: g.strengthLevel,
        evidenceCount: g.nodes.length,
      })),
    };
  }

  @Post('projects/:id/analyze')
  @UseGuards(JwtAuthGuard)
  async analyzeProject(@Req() req: Request, @Param('id') id: string) {
    return this.projectAnalysisService.analyzeProject((req.user as any).id, id);
  }

  @Post('case-study/generate')
  @UseGuards(JwtAuthGuard)
  async generateCaseStudy(@Req() req: Request, @Body() dto: GenerateCaseStudyDto) {
    return this.projectAnalysisService.generateProjectCaseStudy(
      (req.user as any).id,
      dto.projectId,
    );
  }

  @Post('headline/generate')
  @UseGuards(JwtAuthGuard)
  async generateHeadline(@Req() req: Request, @Body() dto: GenerateVariantsDto) {
    const userId = (req.user as any).id;
    const style = dto.style || 'PROFESSIONAL';
    const intelligence = await this.intelligenceService.getPortfolioIntelligence(userId);
    const role = intelligence.alignment.targetRole || 'Software Engineer';
    const stack = intelligence.alignment.strong.slice(0, 3).join(', ') || 'Modern Stack';

    // Return variants based on actual portfolio metadata
    if (style === 'TECHNICAL') {
      return {
        variant: `${role} | Specializing in ${stack} System Implementations`,
        bio: `Driven developer focusing on scalable ${stack} system design. Demonstrated multiple portfolio validation projects.`,
      };
    } else if (style === 'STARTUP') {
      return {
        variant: `${role} | Building high impact ${stack} products from 0 to 1`,
        bio: `Agile technologist passionate about product deployment and quick feature integrations utilizing ${stack}.`,
      };
    }

    return {
      variant: `${role} | Proven Expertise in ${stack} Architectures`,
      bio: `Dedicated developer offering verified project evidence in ${stack} systems alignment.`,
    };
  }

  @Post('about/generate')
  @UseGuards(JwtAuthGuard)
  async generateAbout(@Req() req: Request, @Body() dto: GenerateVariantsDto) {
    const userId = (req.user as any).id;
    const style = dto.style || 'PROFESSIONAL';
    const intelligence = await this.intelligenceService.getPortfolioIntelligence(userId);
    const role = intelligence.alignment.targetRole || 'Software Engineer';
    const strongSkills = intelligence.alignment.strong.join(', ') || 'Technical Core';

    if (style === 'TECHNICAL') {
      return {
        summary: `Result-driven developer showcasing evidence-validated skills in ${strongSkills}. Competency confirmed by multiple practical system builds.`,
      };
    }

    return {
      summary: `Aspiring ${role} with demonstrated capability in ${strongSkills}. Experienced in building high-quality project code bases.`,
    };
  }
}
