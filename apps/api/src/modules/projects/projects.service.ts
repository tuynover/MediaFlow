import { Injectable, NotFoundException } from '@nestjs/common';
import { MediaProject, CreateProjectInput } from '@mediaflow/contracts';

// In-Memory Project Store for Baseline
const PROJECTS: MediaProject[] = [];

@Injectable()
export class ProjectsService {
  async createProject(workspaceId: string, userId: string, input: CreateProjectInput): Promise<MediaProject> {
    const project: MediaProject = {
      id: crypto.randomUUID(),
      workspaceId,
      createdBy: userId,
      name: input.name,
      status: 'draft',
      activeRunId: null,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    PROJECTS.push(project);
    return project;
  }

  async listProjects(workspaceId: string): Promise<MediaProject[]> {
    // Tenant Isolation: strictly filter by workspaceId
    return PROJECTS.filter((p) => p.workspaceId === workspaceId);
  }

  async getProjectById(workspaceId: string, projectId: string): Promise<MediaProject> {
    // Tenant Isolation: return 404 if project belongs to another tenant or does not exist
    const project = PROJECTS.find((p) => p.id === projectId && p.workspaceId === workspaceId);
    if (!project) {
      throw new NotFoundException({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        },
      });
    }
    return project;
  }
}
