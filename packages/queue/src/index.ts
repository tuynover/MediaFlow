import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

export interface QueueJobPayload {
  schemaVersion: number;
  workspaceId: string;
  runId: string;
}

export const QUEUE_NAMES = {
  MEDIA_PROCESSING: 'media-processing',
  MEDIA_PUBLISHING: 'media-publishing',
  MAINTENANCE: 'maintenance',
} as const;

export const JOB_NAMES = {
  PROCESS_MEDIA: 'process-media',
  PUBLISH_MEDIA: 'publish-media',
  CLEANUP_EXPIRED_UPLOADS: 'cleanup-expired-uploads',
  CLEANUP_ABANDONED_ASSETS: 'cleanup-abandoned-assets',
  DISPATCH_OUTBOX: 'dispatch-outbox',
} as const;

export class OutboxDispatcher {
  private dispatchedKeys = new Set<string>();

  async dispatchOutbox(events: { id: string; topic: string; dedupeKey: string; payload: any }[]) {
    const dispatched: string[] = [];
    for (const ev of events) {
      if (!this.dispatchedKeys.has(ev.dedupeKey)) {
        this.dispatchedKeys.add(ev.dedupeKey);
        dispatched.push(ev.dedupeKey);
      }
    }
    return { dispatchedCount: dispatched.length, keys: dispatched };
  }

  isDispatched(dedupeKey: string): boolean {
    return this.dispatchedKeys.has(dedupeKey);
  }
}

export function createRedisConnection(url?: string) {
  const connectionUrl = url || process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(connectionUrl, { maxRetriesPerRequest: null });
}

export function createBullMQQueue(queueName: string, connectionUrl?: string) {
  const connection = createRedisConnection(connectionUrl);
  return new Queue(queueName, { connection });
}

export function createBullMQWorker(
  queueName: string,
  processor: (job: Job<QueueJobPayload>) => Promise<any>,
  concurrency = 2,
  connectionUrl?: string
) {
  const connection = createRedisConnection(connectionUrl);
  return new Worker(queueName, processor, { concurrency, connection });
}
