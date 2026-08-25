import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
export interface QueueJobPayload {
    schemaVersion: number;
    workspaceId: string;
    runId: string;
}
export declare const QUEUE_NAMES: {
    readonly MEDIA_PROCESSING: "media-processing";
    readonly MEDIA_PUBLISHING: "media-publishing";
    readonly MAINTENANCE: "maintenance";
};
export declare const JOB_NAMES: {
    readonly PROCESS_MEDIA: "process-media";
    readonly PUBLISH_MEDIA: "publish-media";
    readonly CLEANUP_EXPIRED_UPLOADS: "cleanup-expired-uploads";
    readonly CLEANUP_ABANDONED_ASSETS: "cleanup-abandoned-assets";
    readonly DISPATCH_OUTBOX: "dispatch-outbox";
};
export declare class OutboxDispatcher {
    private dispatchedKeys;
    dispatchOutbox(events: {
        id: string;
        topic: string;
        dedupeKey: string;
        payload: any;
    }[]): Promise<{
        dispatchedCount: number;
        keys: string[];
    }>;
    isDispatched(dedupeKey: string): boolean;
}
export declare function createRedisConnection(url?: string): Redis;
export declare function createBullMQQueue(queueName: string, connectionUrl?: string): Queue<any, any, string, any, any, string>;
export declare function createBullMQWorker(queueName: string, processor: (job: Job<QueueJobPayload>) => Promise<any>, concurrency?: number, connectionUrl?: string): Worker<QueueJobPayload, any, string>;
//# sourceMappingURL=index.d.ts.map