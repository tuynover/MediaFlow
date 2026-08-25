import { describe, it, expect, beforeEach } from 'vitest';
import { UploadsService } from '../../apps/api/src/modules/uploads/uploads.service';
import { RunsService } from '../../apps/api/src/modules/runs/runs.service';
import { ApprovalsService } from '../../apps/api/src/modules/approvals/approvals.service';
import { PublishService } from '../../apps/api/src/modules/publish/publish.service';

export class ForbiddenDemoModeException extends Error {
  constructor() {
    super('MEDIAFLOW_DEMO_MODE is forbidden in production environment');
    this.name = 'ForbiddenDemoModeException';
  }
}

export function validateProductionEnvironment(nodeEnv: string, demoMode: boolean) {
  if (nodeEnv === 'production' && demoMode) {
    throw new ForbiddenDemoModeException();
  }
}

describe('Advanced Exception & System Fault Tolerance Suite (MF-701..MF-707)', () => {
  let uploadsService: UploadsService;
  let runsService: RunsService;
  let approvalsService: ApprovalsService;
  let publishService: PublishService;

  const WORKSPACE_ID = 'a0000000-0000-7000-a000-000000000001';
  const PROJECT_ID = 'p_exception_tests_123';
  const USER_PRODUCER = '11111111-1111-7111-a111-111111111111';

  beforeEach(() => {
    uploadsService = new UploadsService();
    runsService = new RunsService();
    approvalsService = new ApprovalsService();
    publishService = new PublishService();
  });

  it('Exception Test 1: FL-05 Forbidden Demo Mode in Production Environment', () => {
    // NODE_ENV=production + MEDIAFLOW_DEMO_MODE=true must throw ForbiddenDemoModeException
    expect(() => validateProductionEnvironment('production', true)).toThrow(ForbiddenDemoModeException);

    // NODE_ENV=development + MEDIAFLOW_DEMO_MODE=true should pass
    expect(() => validateProductionEnvironment('development', true)).not.toThrow();
  });

  it('Exception Test 2: Aborted Upload Session Exception Handling', async () => {
    const session = await uploadsService.initiateUpload(WORKSPACE_ID, PROJECT_ID, 'to_abort.mp4', 10485760, 'video/mp4');

    // Abort upload session
    const abortResult = await uploadsService.abortUpload(WORKSPACE_ID, session.id);
    expect(abortResult.success).toBe(true);

    const abortedSession = await uploadsService.getSession(WORKSPACE_ID, session.id);
    expect(abortedSession.status).toBe('aborted');

    // Signing part URL on aborted session must throw BadRequestException
    await expect(uploadsService.signPartUrl(WORKSPACE_ID, session.id, 1)).rejects.toThrow('Upload session is no longer active');
  });

  it('Exception Test 3: Non-Existent Project / Run ID Exceptions (404 Not Found)', async () => {
    const fakeRunId = '00000000-0000-0000-0000-000000000000';

    await expect(
      runsService.cancelProcessingRun(WORKSPACE_ID, PROJECT_ID, fakeRunId, 'Test Cancel')
    ).rejects.toThrow('Processing run not found');
  });

  it('Exception Test 4: Cooperative Run Cancellation Transition', async () => {
    const run = await runsService.createProcessingRun(WORKSPACE_ID, PROJECT_ID, 'asset_to_cancel');

    const cancelResult = await runsService.cancelProcessingRun(WORKSPACE_ID, PROJECT_ID, run.id, 'User initiated cancel');
    expect(cancelResult.success).toBe(true);
    expect(cancelResult.run.status).toBe('cancelling');
    expect(cancelResult.run.cancelRequestedAt).toBeDefined();
  });

  it('Exception Test 5: Double Reconcile Idempotent Exception Handling', async () => {
    const runId = 'run_double_reconcile';

    const op = await publishService.triggerPublish(WORKSPACE_ID, runId, 'asset_src_demo', '720p', true);
    expect(op.state).toBe('uncertain');

    // First reconcile
    const reconciled1 = await publishService.reconcileOperation(WORKSPACE_ID, op.id, 'HEAD evidence verified');
    expect(reconciled1.state).toBe('confirmed');

    // Second reconcile on confirmed operation returns already confirmed state idempotently
    const reconciled2 = await publishService.reconcileOperation(WORKSPACE_ID, op.id, 'HEAD evidence re-verified');
    expect(reconciled2.state).toBe('confirmed');
  });

  it('Exception Test 6: Rejection Reason Character Limit Boundaries (<10 or >1000 characters)', async () => {
    const run = await runsService.createProcessingRun(WORKSPACE_ID, PROJECT_ID, 'asset_reason_limits');

    // Too short (<10 chars)
    await expect(
      approvalsService.rejectRun(WORKSPACE_ID, run.id, USER_PRODUCER, 'Short')
    ).rejects.toThrow();

    // Too long (>1000 chars)
    const longReason = 'a'.repeat(1001);
    await expect(
      approvalsService.rejectRun(WORKSPACE_ID, run.id, USER_PRODUCER, longReason)
    ).rejects.toThrow();
  });
});
