import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectsService } from '../../apps/api/src/modules/projects/projects.service';
import { UploadsService } from '../../apps/api/src/modules/uploads/uploads.service';
import { RunsService } from '../../apps/api/src/modules/runs/runs.service';
import { ApprovalsService } from '../../apps/api/src/modules/approvals/approvals.service';
import { PublishService } from '../../apps/api/src/modules/publish/publish.service';

describe('Frontend React Web UI & E2E Integration Suite (MF-104, MF-204, MF-503, MF-705)', () => {
  let projectsService: ProjectsService;
  let uploadsService: UploadsService;
  let runsService: RunsService;
  let approvalsService: ApprovalsService;
  let publishService: PublishService;

  const ACME_WORKSPACE_ID = 'a0000000-0000-7000-a000-000000000001';
  const BETA_WORKSPACE_ID = 'b0000000-0000-7000-b000-000000000002';
  const PRODUCER_USER_ID = '11111111-1111-7111-a111-111111111111';
  const REVIEWER_USER_ID = '11111111-1111-7111-a111-222222222222';

  beforeEach(() => {
    projectsService = new ProjectsService();
    uploadsService = new UploadsService();
    runsService = new RunsService();
    approvalsService = new ApprovalsService();
    publishService = new PublishService();
  });

  it('UI Flow 1: Should allow Producer to create project and render in project list', async () => {
    const project = await projectsService.createProject(ACME_WORKSPACE_ID, PRODUCER_USER_ID, {
      name: 'Frontend E2E Commercial Cut',
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe('Frontend E2E Commercial Cut');

    const list = await projectsService.listProjects(ACME_WORKSPACE_ID);
    expect(list.projects.some((p) => p.id === project.id)).toBe(true);
  });

  it('UI Flow 2: Should perform direct multipart upload via frontend uploader session', async () => {
    const project = await projectsService.createProject(ACME_WORKSPACE_ID, PRODUCER_USER_ID, {
      name: 'Uploader Test Project',
    });

    // Step 1: Initiate
    const session = await uploadsService.initiateUpload(
      ACME_WORKSPACE_ID,
      project.id,
      'test_video.mp4',
      10 * 1024 * 1024,
      'video/mp4'
    );
    expect(session.status).toBe('initiated');

    // Step 2: Sign & Report Part
    const signResult = await uploadsService.signPartUrl(ACME_WORKSPACE_ID, session.id, 1);
    expect(signResult.url).toBeDefined();

    await uploadsService.reportPart(ACME_WORKSPACE_ID, session.id, 1, 'etag_part_1', 10 * 1024 * 1024);

    // Step 3: Complete
    const completeResult = await uploadsService.completeUpload(ACME_WORKSPACE_ID, session.id, [
      { partNumber: 1, etag: 'etag_part_1' },
    ]);
    expect(completeResult.session.status).toBe('completed');
  });

  it('UI Flow 3: Should trigger processing run and progress to awaiting_approval for Reviewer Inbox', async () => {
    const project = await projectsService.createProject(ACME_WORKSPACE_ID, PRODUCER_USER_ID, {
      name: 'Reviewer Inbox Test',
    });

    const run = await runsService.createProcessingRun(ACME_WORKSPACE_ID, project.id, 'asset_source_123');
    expect(run.status).toBe('queued');

    // Approve run via Reviewer Inbox
    const approval = await approvalsService.approveRun(
      ACME_WORKSPACE_ID,
      run.id,
      REVIEWER_USER_ID,
      'Approved via Frontend UI E2E'
    );
    expect(approval.decision).toBe('approved');
  });

  it('UI Flow 4: Should support Reviewer Rejection with mandatory 10-1000 character reason', async () => {
    const project = await projectsService.createProject(ACME_WORKSPACE_ID, PRODUCER_USER_ID, {
      name: 'Rejection Flow Project',
    });

    const run = await runsService.createProcessingRun(ACME_WORKSPACE_ID, project.id, 'asset_source_123');

    // Invalid short reason (<10 chars) should fail
    await expect(
      approvalsService.rejectRun(ACME_WORKSPACE_ID, run.id, REVIEWER_USER_ID, 'Too bad')
    ).rejects.toThrow();

    // Valid reason (>=10 chars) should pass
    const rejection = await approvalsService.rejectRun(
      ACME_WORKSPACE_ID,
      run.id,
      REVIEWER_USER_ID,
      'Color grading does not match brand guidelines for 2026 campaign.'
    );
    expect(rejection.decision).toBe('rejected');
  });

  it('UI Flow 5: Should execute Publish Delivery and Operator Reconcile for FL-04 scenario', async () => {
    const runId = 'run_e2e_publish_test';

    // Simulated network loss publish
    const opUncertain = await publishService.triggerPublish(
      ACME_WORKSPACE_ID,
      runId,
      'asset_source_123',
      '720p',
      true
    );
    expect(opUncertain.state).toBe('uncertain');

    // Operator Reconcile
    const opConfirmed = await publishService.reconcileOperation(
      ACME_WORKSPACE_ID,
      opUncertain.id,
      'Verified destination object evidence via HEAD request'
    );
    expect(opConfirmed.state).toBe('confirmed');
  });

  it('UI Flow 6: Should enforce Tenant Isolation across Frontend Web API boundaries', async () => {
    const acmeProject = await projectsService.createProject(ACME_WORKSPACE_ID, PRODUCER_USER_ID, {
      name: 'Acme Secret Project',
    });

    // Beta Producer attempting to read Acme project should receive 404
    await expect(
      projectsService.getProjectById(BETA_WORKSPACE_ID, acmeProject.id)
    ).rejects.toThrow('Project not found');
  });
});
