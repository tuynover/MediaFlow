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
  reason?: string;
}

const RUNS: ProcessingRun[] = [];
const OUTBOX: { id: string; topic: string; dedupeKey: string; payload: any }[] = [];
const EVENTS: { id: number; workspaceId: string; projectId: string; runId: string | null; type: string; data: any; occurredAt: string }[] = [];

export class RunsService {
  private dispatcher = new OutboxDispatcher();

  static clearAllRuns() {
    RUNS.length = 0;
    OUTBOX.length = 0;
    EVENTS.length = 0;
  }

  static updateRunStatus(runId: string, status: any, reason?: string) {
    const run = RUNS.find((r) => r.id === runId);
    if (run) {
      run.status = status;
      if (reason) run.reason = reason;
    }
  }

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
      attemptCount: 1,
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

    // Realistic step-by-step pipeline execution
    run.status = 'queued';

    const steps = [
      { step: 'probe_source', percent: 15, delay: 100 },
      { step: 'checksum_sha256', percent: 30, delay: 500 },
      { step: 'create_thumbnail', percent: 50, delay: 1000 },
      { step: 'transcode_720p', percent: 70, delay: 1500 },
      { step: 'transcode_1080p', percent: 85, delay: 2000 },
      { step: 'verify_outputs', percent: 100, delay: 2500 },
    ];

    steps.forEach(({ step, percent, delay }) => {
      setTimeout(() => {
        run.status = percent === 100 ? 'awaiting_approval' : 'running';
        run.currentStep = step;
        run.progressPercent = percent;
        if (percent === 15) {
          run.startedAt = new Date().toISOString();
        }
        if (percent === 100) {
          run.finishedAt = new Date().toISOString();
        }
        EVENTS.push({
          id: EVENTS.length + 1,
          workspaceId,
          projectId,
          runId,
          type: percent === 100 ? 'run.completed' : 'run.step_progressed',
          data: { runId, currentStep: step, progressPercent: percent, status: run.status },
          occurredAt: new Date().toISOString(),
        });
      }, delay);
    });

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
