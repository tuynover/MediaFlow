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
    const op = await service.triggerPublish(WORKSPACE_ID, 'run_publish_normal', SOURCE_ASSET_ID, '720p', false);

    expect(op.state).toBe('confirmed');
    expect(op.destinationBucket).toBe('mediaflow-delivery');
    expect(op.providerEvidence).toBeDefined();
    expect(op.providerEvidence?.sizeBytes).toBeGreaterThan(0);
  });

  it('should transition to UNCERTAIN state when response loss occurs (FL-04)', async () => {
    const op = await service.triggerPublish(WORKSPACE_ID, 'run_publish_uncertain', SOURCE_ASSET_ID, '720p', true);

    expect(op.state).toBe('uncertain');
    expect(op.lastErrorCode).toBe('NETWORK_TIMEOUT');
    expect(op.confirmedAt).toBeNull();
  });

  it('should return idempotent publish operation on duplicate trigger with same key', async () => {
    const op1 = await service.triggerPublish(WORKSPACE_ID, 'run_publish_idempotent', SOURCE_ASSET_ID, '720p', false);
    const op2 = await service.triggerPublish(WORKSPACE_ID, 'run_publish_idempotent', SOURCE_ASSET_ID, '720p', false);

    expect(op1.id).toBe(op2.id);
    expect(op1.idempotencyKey).toBe(op2.idempotencyKey);
  });

  it('should allow operator to reconcile UNCERTAIN operation via HEAD evidence', async () => {
    // 1. Simulate FL-04 response loss -> state is uncertain
    const op = await service.triggerPublish(WORKSPACE_ID, 'run_publish_reconcile', SOURCE_ASSET_ID, '1080p', true);
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

  it('should enforce Spec 13.2 delivery checks: size, sha256, assetId, runId, requestId, etag, and HEAD evidence verification', async () => {
    const op = await service.triggerPublish(WORKSPACE_ID, 'run_delivery_spec132', SOURCE_ASSET_ID, '720p', false);

    expect(op.state).toBe('confirmed');
    expect(op.providerEvidence).toBeDefined();
    expect(op.providerEvidence?.headVerified).toBe(true);
    expect(op.providerEvidence?.sizeBytes).toBeGreaterThan(0);
    expect(op.providerEvidence?.sha256).toBeDefined();
    expect(op.providerEvidence?.sourceAssetId).toBe(SOURCE_ASSET_ID);
    expect(op.providerEvidence?.runId).toBe('run_delivery_spec132');
    expect(op.providerEvidence?.etag).toBeDefined();
    expect(op.providerEvidence?.requestId).toBeDefined();
  });
});
