import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalsService } from '../../apps/api/src/modules/approvals/approvals.service';

describe('Verification & Reviewer Approval Integration Tests (MF-501..MF-506)', () => {
  let service: ApprovalsService;

  const WORKSPACE_ID = 'a0000000-0000-7000-a000-000000000001';
  const RUN_ID = 'run_approval_test_123';
  const REVIEWER_ID = '11111111-1111-7111-a111-222222222222';

  beforeEach(() => {
    service = new ApprovalsService();
  });

  it('should run verification engine and pass for valid H.264 output', () => {
    const outputMeta = {
      videoCodec: 'h264',
      sizeBytes: 15 * 1024 * 1024,
    };

    const verification = service.verifyProcessedOutput(WORKSPACE_ID, RUN_ID, outputMeta);
    expect(verification.status).toBe('passed');
    expect(verification.checks.length).toBe(3);
    expect(verification.checks.every((c) => c.status === 'passed')).toBe(true);
  });

  it('should fail verification for corrupted / invalid output', () => {
    const corruptMeta = {
      videoCodec: 'unknown_codec',
      sizeBytes: 0,
    };

    const verification = service.verifyProcessedOutput(WORKSPACE_ID, RUN_ID, corruptMeta);
    expect(verification.status).toBe('failed');
  });

  it('should allow reviewer to approve run and return idempotent record on duplicate approve', async () => {
    const approval1 = await service.approveRun(WORKSPACE_ID, RUN_ID, REVIEWER_ID, 'Ready for broadcast');
    expect(approval1.decision).toBe('approved');

    // Duplicate approve call returns same decision record idempotently
    const approval2 = await service.approveRun(WORKSPACE_ID, RUN_ID, REVIEWER_ID, 'Ready for broadcast');
    expect(approval2.id).toBe(approval1.id);
  });

  it('should throw 409 Conflict when decision conflicts with existing decision', async () => {
    const runIdConflict = 'run_conflict_999';
    await service.approveRun(WORKSPACE_ID, runIdConflict, REVIEWER_ID, 'Approved first');

    await expect(
      service.rejectRun(WORKSPACE_ID, runIdConflict, REVIEWER_ID, 'The title card uses the previous logo.')
    ).rejects.toThrow('Run has already been decided with a different decision');
  });

  it('should validate rejection reason length (between 10 and 1000 chars)', async () => {
    const runIdReject = 'run_reject_123';

    // Too short (< 10 chars)
    await expect(service.rejectRun(WORKSPACE_ID, runIdReject, REVIEWER_ID, 'Short')).rejects.toThrow(
      'Rejection reason must be between 10 and 1000 characters'
    );

    // Valid length (>= 10 chars)
    const validReject = await service.rejectRun(
      WORKSPACE_ID,
      runIdReject,
      REVIEWER_ID,
      'The audio volume in scene 2 is clipping and needs adjustment.'
    );
    expect(validReject.decision).toBe('rejected');
  });
});
