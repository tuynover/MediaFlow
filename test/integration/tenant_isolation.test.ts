import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectsService } from '../../apps/api/src/modules/projects/projects.service';

describe('Tenant Isolation Integration Tests (AS-06)', () => {
  let projectsService: ProjectsService;

  const ACME_WORKSPACE_ID = 'a0000000-0000-7000-a000-000000000001';
  const ACME_USER_ID = '11111111-1111-7111-a111-111111111111';

  const BETA_WORKSPACE_ID = 'b0000000-0000-7000-b000-000000000002';
  const BETA_USER_ID = '22222222-2222-7222-b222-111111111111';

  beforeEach(() => {
    projectsService = new ProjectsService();
  });

  it('should allow Acme user to create and view Acme projects', async () => {
    const project = await projectsService.createProject(ACME_WORKSPACE_ID, ACME_USER_ID, {
      name: 'Acme Commercial Cut 1',
    });

    expect(project.workspaceId).toBe(ACME_WORKSPACE_ID);

    const acmeList = await projectsService.listProjects(ACME_WORKSPACE_ID);
    expect(acmeList.projects.some((p) => p.id === project.id)).toBe(true);
  });

  it('should NOT allow Beta user to see Acme projects in project list', async () => {
    const acmeProject = await projectsService.createProject(ACME_WORKSPACE_ID, ACME_USER_ID, {
      name: 'Acme Secret Campaign',
    });

    const betaList = await projectsService.listProjects(BETA_WORKSPACE_ID);
    expect(betaList.projects.some((p) => p.id === acmeProject.id)).toBe(false);
  });

  it('should return 404 NOT FOUND when Beta user tries to get Acme project by ID', async () => {
    const acmeProject = await projectsService.createProject(ACME_WORKSPACE_ID, ACME_USER_ID, {
      name: 'Acme Private Video',
    });

    await expect(projectsService.getProjectById(BETA_WORKSPACE_ID, acmeProject.id)).rejects.toThrow(
      'Project not found'
    );
  });

  it('should return 404 NOT FOUND when Beta user tries to update Acme project name', async () => {
    const acmeProject = await projectsService.createProject(ACME_WORKSPACE_ID, ACME_USER_ID, {
      name: 'Acme Master Edit',
    });

    await expect(
      projectsService.updateProjectName(BETA_WORKSPACE_ID, acmeProject.id, 'Hacked Name')
    ).rejects.toThrow('Project not found');
  });
});
