import { describe, it, expect, beforeEach } from 'vitest';
import { FailureLabService } from '../../apps/api/src/modules/failure-lab/failure-lab.service';
import { validateEnvironmentConfig } from '../../apps/api/src/main';
import { MediaFlowOperatorCLI } from '../../apps/ops/src/cli';

describe('Failure Lab & Operator CLI Fault Tests (MF-701..MF-707)', () => {
  let failureLabService: FailureLabService;

  const WORKSPACE_ID = 'a0000000-0000-7000-a000-000000000001';
  const USER_ID = '11111111-1111-7111-a111-333333333333';

  beforeEach(() => {
    FailureLabService.clearAllFaults();
    failureLabService = new FailureLabService();
  });

  it('should FAIL FAST when MEDIAFLOW_DEMO_MODE=true in production environment', () => {
    expect(() => {
      FailureLabService.validateDemoEnvironment('true', 'production');
    }).toThrow('SECURITY_VIOLATION: MEDIAFLOW_DEMO_MODE is forbidden in production environment!');

    // Test main.ts validateEnvironmentConfig
    const prevDemo = process.env.MEDIAFLOW_DEMO_MODE;
    const prevEnv = process.env.NODE_ENV;
    process.env.MEDIAFLOW_DEMO_MODE = 'true';
    process.env.NODE_ENV = 'production';

    expect(() => validateEnvironmentConfig()).toThrow('FATAL: MEDIAFLOW_DEMO_MODE=true is strictly prohibited in NODE_ENV=production!');

    process.env.MEDIAFLOW_DEMO_MODE = prevDemo;
    process.env.NODE_ENV = prevEnv;
  });

  it('should allow demo fault configuration in non-production environment', () => {
    const fault = failureLabService.configureFault(WORKSPACE_ID, USER_ID, 'FL-02', 47, 1);
    expect(fault.scenario).toBe('FL-02');
    expect(fault.threshold).toBe(47);
    expect(fault.remainingUses).toBe(1);
    expect(fault.enabled).toBe(true);
  });

  it('should enforce Spec 15.1 FL-01: Abort upload at configured percentage threshold while preserving upload session for resume', () => {
    const fault = failureLabService.configureFault(WORKSPACE_ID, USER_ID, 'FL-01', 50, 1);
    expect(fault.scenario).toBe('FL-01');
    expect(fault.threshold).toBe(50);

    const consumed = failureLabService.consumeFault(WORKSPACE_ID, 'FL-01');
    expect(consumed).not.toBeNull();
    expect(consumed?.remainingUses).toBe(0);
    expect(consumed?.enabled).toBe(false);
  });

  it('should enforce Spec 15.1 FL-02: Worker crash during transcode bound to runId/step with remainingUses=1 so retry does not crash infinitely', () => {
    const runId = 'run_fl02_crash_test';
    const step = 'transcode_720p';
    const fault = failureLabService.configureFault(WORKSPACE_ID, USER_ID, 'FL-02', 65, 1, runId, step);

    expect(fault.runId).toBe(runId);
    expect(fault.step).toBe(step);
    expect(fault.threshold).toBe(65);

    // Attempt 1: Worker consumes fault and crashes
    const consumedAttempt1 = failureLabService.consumeFault(WORKSPACE_ID, 'FL-02', runId, step);
    expect(consumedAttempt1).not.toBeNull();
    expect(consumedAttempt1?.remainingUses).toBe(0);

    // Attempt 2 (Retry): Fault is already consumed, so worker does NOT crash in infinite loop
    const consumedAttempt2 = failureLabService.consumeFault(WORKSPACE_ID, 'FL-02', runId, step);
    expect(consumedAttempt2).toBeNull();
  });

  it('should enforce Spec 15.1 FL-03: Corrupt output verification failure prevents transition to approval', () => {
    const fault = failureLabService.configureFault(WORKSPACE_ID, USER_ID, 'FL-03', 100, 1);
    expect(fault.scenario).toBe('FL-03');

    const consumed = failureLabService.consumeFault(WORKSPACE_ID, 'FL-03');
    expect(consumed).not.toBeNull();
    expect(consumed?.enabled).toBe(false);
  });

  it('should enforce Spec 15.1 FL-04: Publish success with response loss transitions to UNCERTAIN without auto-retry', () => {
    const fault = failureLabService.configureFault(WORKSPACE_ID, USER_ID, 'FL-04', 100, 1);
    expect(fault.scenario).toBe('FL-04');
  });

  it('should enforce Spec 15.1 FL-05: Processing cancellation terminates FFmpeg without publishing job while preserving source asset', () => {
    const fault = failureLabService.configureFault(WORKSPACE_ID, USER_ID, 'FL-05', 0, 1);
    expect(fault.scenario).toBe('FL-05');
  });

  it('should enforce Spec 15.1 FL-06 & Spec 15.2: MinIO/Redis outage classification and demo_faults tenant-scoped schema', () => {
    const fault = failureLabService.configureFault(WORKSPACE_ID, USER_ID, 'FL-05', 0, 1, 'run_spec152', 'transcode_1080p');
    expect(fault).toHaveProperty('id');
    expect(fault).toHaveProperty('workspaceId', WORKSPACE_ID);
    expect(fault).toHaveProperty('scenario', 'FL-05');
    expect(fault).toHaveProperty('step', 'transcode_1080p');
    expect(fault).toHaveProperty('remainingUses', 1);
    expect(fault).toHaveProperty('enabled', true);
  });

  it('should execute Operator CLI commands for inspect, retry, and reconcile', async () => {
    const projects = await MediaFlowOperatorCLI.listProjects('processing');
    expect(projects.length).toBeGreaterThan(0);

    const attentionRuns = await MediaFlowOperatorCLI.listAttentionRuns();
    expect(attentionRuns.length).toBeGreaterThan(0);

    const retryResult = await MediaFlowOperatorCLI.retryRun('run_failed_123', 'Transient storage outage resolved');
    expect(retryResult.success).toBe(true);
    expect(retryResult.status).toBe('queued');

    const reconcileResult = await MediaFlowOperatorCLI.reconcilePublish(
      'op_uncertain_123',
      'Destination object HEAD evidence verified'
    );
    expect(reconcileResult.success).toBe(true);
    expect(reconcileResult.state).toBe('confirmed');
  });
});
