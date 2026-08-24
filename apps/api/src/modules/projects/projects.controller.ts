import { Controller, Post, Get, Param, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { ProjectsService } from './projects.service';
import { CreateProjectSchema } from '@mediaflow/contracts';

@Controller('api/v1/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async createProject(@Req() request: any, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const userId = request.headers['x-user-id'] || '11111111-1111-7111-a111-111111111111';

    const parseResult = CreateProjectSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project data',
          details: parseResult.error.flatten(),
        },
      });
    }

    return this.projectsService.createProject(workspaceId, userId, parseResult.data);
  }

  @Get()
  async listProjects(@Req() request: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const projects = await this.projectsService.listProjects(workspaceId);
    return { projects };
  }

  @Get(':projectId')
  async getProject(@Req() request: any, @Param('projectId') projectId: string) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    return this.projectsService.getProjectById(workspaceId, projectId);
  }
}
