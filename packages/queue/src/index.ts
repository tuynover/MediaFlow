export interface QueueJobPayload {
  schemaVersion: number;
  workspaceId: string;
  runId: string;
}

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
