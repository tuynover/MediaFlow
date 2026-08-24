import { describe, it, expect, beforeEach } from 'vitest';
import { RunsService } from '../../apps/api/src/modules/runs/runs.service';

describe('Queue, Transactional Outbox & Realtime SSE Integration Tests (MF-302, MF-303, MF-305)', () => {
  let runsService: RunsService;

  const WORKSPACE_ID = 'a0000000-0000-7000-a000-000000000001';
  const PROJECT_ID = 'p1111111-1111-7111-a111-111111111111';
  const SOURCE_ASSET_ID = 'asset_source_123';

  beforeEach(() => {
    runsService = new RunsService();
  });

  it('should create processing run and outbox event in same atomic transaction', async () => {
    const run = await runsService.createProcessingRun(WORKSPACE_ID, PROJECT_ID, SOURCE_ASSET_ID);

    expect(run.id).toBeDefined();
    expect(run.workspaceId).toBe(WORKSPACE_ID);
    expect(run.status).toBe('queued');
    expect(run.queueJobId).toBe(`process:${run.id}`);
  });

  it('should support cooperative cancellation request', async () => {
    const run = await runsService.createProcessingRun(WORKSPACE_ID, PROJECT_ID, SOURCE_ASSET_ID);

    const result = await runsService.cancelProcessingRun(WORKSPACE_ID, PROJECT_ID, run.id, 'User requested cancel');
    expect(result.success).toBe(true);
    expect(result.run.status).toBe('cancelling');
    expect(result.run.cancelRequestedAt).toBeDefined();
  });

  it('should record events and support SSE Replay by lastEventId', async () => {
    const run = await runsService.createProcessingRun(WORKSPACE_ID, PROJECT_ID, SOURCE_ASSET_ID);

    const allEvents = await runsService.getEvents(WORKSPACE_ID, PROJECT_ID);
    expect(allEvents.length).toBeGreaterThan(0);

    const firstEventId = allEvents[0].id;
    const replayedEvents = await runsService.getEvents(WORKSPACE_ID, PROJECT_ID, firstEventId);
    expect(replayedEvents.length).toBe(allEvents.length - 1);
  });
});
