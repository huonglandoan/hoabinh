import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ProgressService } from './progress.service';

@Controller('projects/:projectId/progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  async getProgressInfo(@Param('projectId') projectId: string) {
    return this.progressService.getProgressInfo(projectId);
  }

  @Post('plan')
  async savePlan(@Param('projectId') projectId: string, @Body() body: { planData: any }) {
    return this.progressService.savePlan(projectId, body.planData);
  }

  @Post('update')
  async updateProgress(
    @Param('projectId') projectId: string,
    @Body() body: { siteLog: any; todayStr?: string },
  ) {
    return this.progressService.updateProgress(projectId, body.siteLog, body.todayStr);
  }
}
