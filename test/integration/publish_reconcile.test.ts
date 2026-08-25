import { describe, it, expect, beforeEach } from 'vitest';
import { PublishService } from '../../apps/api/src/modules/publish/publish.service';

describe('Publish Operations & Uncertain Result Reconciliation (MF-601..MF-606)', () => {
  let service: PublishService;

  const WORKSPACE_ID = 'a0000000-0000-7000-a000-000000000001';
  const SOURCE_ASSET_ID = 'asset_src_720';

  beforeEach(() => {
    service = new PublishService();
  });

  it('should publish output to delivery bucket with confirmed state', async () => {
    const op = await service.triggerPublish(WORKSPACE_ID, 'run_publish_normal', SOURCE_ASSET_ID, '720p', 'success');

    expect(op.state).toBe('confirmed');
    expect(op.destinationBucket).toBe('mediaflow-delivery');
    expect(op.providerEvidence).toBeDefined();
    expect(op.providerEvidence?.sizeBytes).toBeGreaterThan(0);
  });

  it('should transition to UNCERTAIN state when response loss occurs (FL-04)', async () => {
    const op = await service.triggerPublish(WORKSPACE_ID, 'run_publish_uncertain', SOURCE_ASSET_ID, '720p', 'response_lost');

    expect(op.state).toBe('uncertain');
    expect(op.lastErrorCode).toBe('NETWORK_TIMEOUT');
    expect(op.confirmedAt).toBeNull();
  });

  it('should return idempotent publish operation on duplicate trigger with same key', async () => {
    const op1 = await service.triggerPublish(WORKSPACE_ID, 'run_publish_idempotent', SOURCE_ASSET_ID, '720p', 'success');
    const op2 = await service.triggerPublish(WORKSPACE_ID, 'run_publish_idempotent', SOURCE_ASSET_ID, '720p', 'success');

    expect(op1.id).toBe(op2.id);
    expect(op1.idempotencyKey).toBe(op2.idempotencyKey);
  });

  it('should allow operator to reconcile UNCERTAIN operation via HEAD evidence', async () => {
    // 1. Simulate FL-04 response loss -> state is uncertain
    const op = await service.triggerPublish(WORKSPACE_ID, 'run_publish_reconcile', SOURCE_ASSET_ID, '1080p', 'response_lost');
    expect(op.state).toBe('uncertain');

    // 2. Operator runs HEAD reconcile with evidence check
    const reconciled = await service.reconcileOperation(
      WORKSPACE_ID,
      op.id,
      'HEAD destination key verified object exists with valid checksum'
    );

    expect(reconciled.state).toBe('confirmed');
    expect(reconciled.confirmedAt).toBeDefined();
    expect(reconciled.lastErrorCode).toBeNull();
  });

  it('should enforce Spec 14: Mock publisher 3 outcomes, 409 Conflict on fingerprint mismatch, and reconcile HEAD states', async () => {
    // 1. Outcome 1: Copy failed before side effect
    const opFailed = await service.triggerPublish(WORKSPACE_ID, 'run_spec14_fail', SOURCE_ASSET_ID, '720p', 'failed_before_side_effect');
    expect(opFailed.state).toBe('failed');
    expect(opFailed.lastErrorCode).toBe('PRE_COPY_FAILURE');

    // 2. Outcome 3: Response lost -> state uncertain -> project needs_attention
    const opUncertain = await service.triggerPublish(WORKSPACE_ID, 'run_spec14_uncertain', SOURCE_ASSET_ID, '720p', 'response_lost');
    expect(opUncertain.state).toBe('uncertain');

    // 3. Same key with different request fingerprint -> 409 Conflict
    await expect(
      service.triggerPublish(WORKSPACE_ID, 'run_spec14_uncertain', SOURCE_ASSET_ID, '720p', 'success', 'different_checksum_hash_123')
    ).rejects.toThrow('Idempotency key reused with different request payload fingerprint');

    // 4. Reconcile missing -> state failed before allowing retry
    const opReconcileMissing = await service.triggerPublish(WORKSPACE_ID, 'run_spec14_reconcile_miss', SOURCE_ASSET_ID, '720p', 'response_lost');
    const reconciledMissing = await service.reconcileOperation(WORKSPACE_ID, opReconcileMissing.id, 'HEAD checked object missing', 'missing');
    expect(reconciledMissing.state).toBe('failed');

    // 5. Reconcile inconclusive -> state remains uncertain
    const opReconcileInconclusive = await service.triggerPublish(WORKSPACE_ID, 'run_spec14_reconcile_inc', SOURCE_ASSET_ID, '720p', 'response_lost');
    const reconciledInc = await service.reconcileOperation(WORKSPACE_ID, opReconcileInconclusive.id, 'Network timeout during HEAD check', 'inconclusive');
    expect(reconciledInc.state).toBe('uncertain');
  });
});
