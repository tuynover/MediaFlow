import { MediaProject, CreateProjectInput } from '@mediaflow/contracts';

export class NotFoundException extends Error {
  constructor(public errorResponse: any) {
    super(errorResponse?.error?.message || 'Not Found');
    this.name = 'NotFoundException';
  }
}

// In-Memory Project Store for Baseline
const PROJECTS: MediaProject[] = [];

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

  async listProjects(
    workspaceId: string,
    query?: { status?: string; search?: string; cursor?: string; limit?: number }
  ): Promise<{ projects: MediaProject[]; nextCursor: string | null }> {
    // Tenant Isolation: strictly filter by workspaceId
    let filtered = PROJECTS.filter((p) => p.workspaceId === workspaceId);

    if (query?.status) {
      filtered = filtered.filter((p) => p.status === query.status);
    }

    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchLower));
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limit = query?.limit || 20;
    let startIndex = 0;

    if (query?.cursor) {
      const cursorIndex = filtered.findIndex((p) => p.id === query.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginated = filtered.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + limit < filtered.length ? paginated[paginated.length - 1]?.id || null : null;

    return { projects: paginated, nextCursor };
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

  static clearAllProjects() {
    PROJECTS.length = 0;
  }

  static updateProjectStatus(projectId: string, status: any) {
    const project = PROJECTS.find((p) => p.id === projectId);
    if (project) {
      project.status = status;
      project.updatedAt = new Date().toISOString();
      project.version += 1;
    }
  }

  async updateProjectName(workspaceId: string, projectId: string, newName: string): Promise<MediaProject> {
    const project = await this.getProjectById(workspaceId, projectId);
    project.name = newName;
    project.updatedAt = new Date().toISOString();
    project.version += 1;
    return project;
  }
}
