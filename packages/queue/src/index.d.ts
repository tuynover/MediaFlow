export interface QueueJobPayload {
    schemaVersion: number;
    workspaceId: string;
    runId: string;
}
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
//# sourceMappingURL=index.d.ts.map