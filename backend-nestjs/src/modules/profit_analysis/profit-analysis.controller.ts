import { Controller, Get, Post, Param } from '@nestjs/common';
import { ProfitAnalysisService } from './profit-analysis.service';

@Controller('projects/:projectId/profit')
export class ProfitAnalysisController {
  constructor(private readonly profitService: ProfitAnalysisService) {}

  @Get()
  async getProfitAnalysis(@Param('projectId') projectId: string) {
    return this.profitService.getProfitAnalysis(projectId);
  }

  @Post('run')
  async runAnalysis(@Param('projectId') projectId: string) {
    return this.profitService.runAnalysis(projectId);
  }
}
