import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ProjectService, Project } from './project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll(): Promise<Project[]> {
    return this.projectService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Project> {
    return this.projectService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: { name: string; location: string; startDate: string; endDate: string; clientName?: string; contractorName?: string },
  ): Promise<Project> {
    return this.projectService.create(dto);
  }
}
