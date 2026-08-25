import { describe, it, expect, beforeEach } from 'vitest';
import { UploadsService } from '../../apps/api/src/modules/uploads/uploads.service';

describe('Multipart Upload Session Integration Tests (AS-01)', () => {
  let uploadsService: UploadsService;

  const WORKSPACE_ID = 'a0000000-0000-7000-a000-000000000001';
  const PROJECT_ID = 'p1111111-1111-7111-a111-111111111111';

  beforeEach(() => {
    uploadsService = new UploadsService();
  });

  it('should initiate multipart upload session', async () => {
    const session = await uploadsService.initiateUpload(
      WORKSPACE_ID,
      PROJECT_ID,
      'master-video.mp4',
      100 * 1024 * 1024, // 100MB
      'video/mp4'
    );

    expect(session.id).toBeDefined();
    expect(session.workspaceId).toBe(WORKSPACE_ID);
    expect(session.status).toBe('initiated');
    expect(session.partSizeBytes).toBe(16777216); // 16MB
  });

  it('should sign part URL and transition session status to uploading', async () => {
    const session = await uploadsService.initiateUpload(
      WORKSPACE_ID,
      PROJECT_ID,
      'video-cut.mov',
      50 * 1024 * 1024,
      'video/quicktime'
    );

    const { url } = await uploadsService.signPartUrl(WORKSPACE_ID, session.id, 1);
    expect(url).toContain('partNumber=1');

    const updated = await uploadsService.getSession(WORKSPACE_ID, session.id);
    expect(updated.status).toBe('uploading');
  });

  it('should report parts and complete multipart upload session idempotently', async () => {
    const session = await uploadsService.initiateUpload(
      WORKSPACE_ID,
      PROJECT_ID,
      'final-edit.mp4',
      32 * 1024 * 1024,
      'video/mp4'
    );

    await uploadsService.reportPart(WORKSPACE_ID, session.id, 1, 'etag_part_1', 16777216);
    await uploadsService.reportPart(WORKSPACE_ID, session.id, 2, 'etag_part_2', 15204352);

    const result = await uploadsService.completeUpload(WORKSPACE_ID, session.id, [
      { partNumber: 1, etag: 'etag_part_1' },
      { partNumber: 2, etag: 'etag_part_2' },
    ]);

    expect(result.session.status).toBe('completed');
    expect(result.session.completedAt).toBeDefined();

    // Idempotent second call returns same result
    const secondCall = await uploadsService.completeUpload(WORKSPACE_ID, session.id, [
      { partNumber: 1, etag: 'etag_part_1' },
      { partNumber: 2, etag: 'etag_part_2' },
    ]);
    expect(secondCall.session.status).toBe('completed');
  });

  it('should abort multipart upload session', async () => {
    const session = await uploadsService.initiateUpload(
      WORKSPACE_ID,
      PROJECT_ID,
      'cancel-me.mp4',
      20 * 1024 * 1024,
      'video/mp4'
    );

    await uploadsService.abortUpload(WORKSPACE_ID, session.id);
    const updated = await uploadsService.getSession(WORKSPACE_ID, session.id);
    expect(updated.status).toBe('aborted');
  });

  it('should enforce Spec 11.2: API does not proxy binary files and only returns presigned URLs', async () => {
    const session = await uploadsService.initiateUpload(
      WORKSPACE_ID,
      PROJECT_ID,
      'no-proxy.mp4',
      10 * 1024 * 1024,
      'video/mp4'
    );

    const signRes = await uploadsService.signPartUrl(WORKSPACE_ID, session.id, 1);
    expect(signRes.url).toBeDefined();
    expect(typeof signRes.url).toBe('string');
    expect(signRes.url).not.toContain('binary-proxy');
  });

  it('should enforce Spec 11.3: Periodic cleanup job for expired upload sessions', async () => {
    const session = await uploadsService.initiateUpload(
      WORKSPACE_ID,
      PROJECT_ID,
      'expired-upload.mp4',
      15 * 1024 * 1024,
      'video/mp4'
    );

    // Manually set expiresAt to past date
    session.expiresAt = new Date(Date.now() - 1000).toISOString();

    const cleanupResult = await uploadsService.cleanupExpiredUploads(WORKSPACE_ID);
    expect(cleanupResult.expiredCount).toBe(1);
    expect(cleanupResult.expiredUploadIds).toContain(session.id);

    const updated = await uploadsService.getSession(WORKSPACE_ID, session.id);
    expect(updated.status).toBe('expired');
  });
});
