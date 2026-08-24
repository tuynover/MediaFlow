import { Controller, Post, Get, Patch, Param, Body, Query, Req, BadRequestException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectSchema } from '@mediaflow/contracts';
import { z } from 'zod';

const UpdateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(160, 'Project name is too long'),
});

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
  async listProjects(
    @Req() request: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    return this.projectsService.listProjects(workspaceId, {
      status,
      search,
      cursor,
      limit: isNaN(parsedLimit) ? 20 : parsedLimit,
    });
  }

  @Get(':projectId')
  async getProject(@Req() request: any, @Param('projectId') projectId: string) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    return this.projectsService.getProjectById(workspaceId, projectId);
  }

  @Patch(':projectId')
  async updateProject(@Req() request: any, @Param('projectId') projectId: string, @Body() body: any) {
    const workspaceId = request.headers['x-workspace-id'] || 'a0000000-0000-7000-a000-000000000001';
    const parseResult = UpdateProjectSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update payload',
          details: parseResult.error.flatten(),
        },
      });
    }

    return this.projectsService.updateProjectName(workspaceId, projectId, parseResult.data.name);
  }
}
