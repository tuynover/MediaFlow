import { assertProjectStateTransition } from '@mediaflow/domain';
import { OutboxDispatcher } from '@mediaflow/queue';

export class NotFoundException extends Error {
  constructor(public errorResponse: any) {
    super(errorResponse?.error?.message || 'Not Found');
    this.name = 'NotFoundException';
  }
}

export interface ProcessingRun {
  id: string;
  workspaceId: string;
  projectId: string;
  sourceAssetId: string;
  sequence: number;
  status: 'queued' | 'running' | 'awaiting_approval' | 'approved' | 'rejected' | 'publishing' | 'succeeded' | 'failed' | 'needs_attention' | 'cancelling' | 'cancelled';
  queueJobId: string;
  attemptCount: number;
  progressPercent: number;
  currentStep: string | null;
  cancelRequestedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

const RUNS: ProcessingRun[] = [];
const OUTBOX: { id: string; topic: string; dedupeKey: string; payload: any }[] = [];
const EVENTS: { id: number; workspaceId: string; projectId: string; runId: string | null; type: string; data: any; occurredAt: string }[] = [];

export class RunsService {
  private dispatcher = new OutboxDispatcher();

  async createProcessingRun(workspaceId: string, projectId: string, sourceAssetId: string): Promise<ProcessingRun> {
    const runId = crypto.randomUUID();
    const queueJobId = `process:${runId}`;
    const dedupeKey = `outbox:${queueJobId}`;

    const run: ProcessingRun = {
      id: runId,
      workspaceId,
      projectId,
      sourceAssetId,
      sequence: RUNS.length + 1,
      status: 'queued',
      queueJobId,
      attemptCount: 0,
      progressPercent: 0,
      currentStep: 'probe_source',
      cancelRequestedAt: null,
      startedAt: null,
      finishedAt: null,
      createdAt: new Date().toISOString(),
    };

    // Transactional Outbox Pattern: Atomic commit of Run + Outbox Event + Project Event
    RUNS.push(run);
    OUTBOX.push({
      id: crypto.randomUUID(),
      topic: 'media-processing',
      dedupeKey,
      payload: { schemaVersion: 1, workspaceId, runId },
    });

    const eventId = EVENTS.length + 1;
    EVENTS.push({
      id: eventId,
      workspaceId,
      projectId,
      runId,
      type: 'run.queued',
      data: { runId, status: 'queued' },
      occurredAt: new Date().toISOString(),
    });

    // Outbox Dispatcher enqueues with deterministic jobId
    await this.dispatcher.dispatchOutbox(OUTBOX);

    return run;
  }

  async cancelProcessingRun(workspaceId: string, projectId: string, runId: string, reason: string) {
    const run = RUNS.find((r) => r.id === runId && r.workspaceId === workspaceId);
    if (!run) {
      throw new NotFoundException({ error: { code: 'RUN_NOT_FOUND', message: 'Processing run not found' } });
    }

    run.cancelRequestedAt = new Date().toISOString();
    run.status = 'cancelling';

    EVENTS.push({
      id: EVENTS.length + 1,
      workspaceId,
      projectId,
      runId,
      type: 'run.cancellation_requested',
      data: { runId, reason },
      occurredAt: new Date().toISOString(),
    });

    return { success: true, run };
  }

  async getRuns(workspaceId: string): Promise<ProcessingRun[]> {
    return RUNS.filter((r) => r.workspaceId === workspaceId);
  }

  async getEvents(workspaceId: string, projectId: string, lastEventId?: number) {
    let filtered = EVENTS.filter((e) => e.workspaceId === workspaceId && e.projectId === projectId);
    if (lastEventId) {
      filtered = filtered.filter((e) => e.id > lastEventId);
    }
    return filtered;
  }
}
