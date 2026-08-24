import { describe, it, expect, beforeEach } from 'vitest';
import { FailureLabService } from '../../apps/api/src/modules/failure-lab/failure-lab.service';
import { MediaFlowOperatorCLI } from '../../apps/ops/src/cli';

describe('Failure Lab & Operator CLI Fault Tests (MF-701..MF-707)', () => {
  let failureLabService: FailureLabService;

  const WORKSPACE_ID = 'a0000000-0000-7000-a000-000000000001';
  const USER_ID = '11111111-1111-7111-a111-333333333333';

  beforeEach(() => {
    failureLabService = new FailureLabService();
  });

  it('should FAIL FAST when MEDIAFLOW_DEMO_MODE=true in production environment', () => {
    expect(() => {
      FailureLabService.validateDemoEnvironment('true', 'production');
    }).toThrow('SECURITY_VIOLATION: MEDIAFLOW_DEMO_MODE is forbidden in production environment!');
  });

  it('should allow demo fault configuration in non-production environment', () => {
    const fault = failureLabService.configureFault(WORKSPACE_ID, USER_ID, 'FL-02', 47, 1);
    expect(fault.scenario).toBe('FL-02');
    expect(fault.threshold).toBe(47);
    expect(fault.remainingUses).toBe(1);
    expect(fault.enabled).toBe(true);
  });

  it('should consume demo fault once and disable automatically when remainingUses reaches zero', () => {
    failureLabService.configureFault(WORKSPACE_ID, USER_ID, 'FL-03', 50, 1);

    const consumed1 = failureLabService.consumeFault(WORKSPACE_ID, 'FL-03');
    expect(consumed1).not.toBeNull();
    expect(consumed1?.scenario).toBe('FL-03');

    // Second consume fails because remainingUses is 0
    const consumed2 = failureLabService.consumeFault(WORKSPACE_ID, 'FL-03');
    expect(consumed2).toBeNull();
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
