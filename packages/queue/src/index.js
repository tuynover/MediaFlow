"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxDispatcher = void 0;
class OutboxDispatcher {
    dispatchedKeys = new Set();
    async dispatchOutbox(events) {
        const dispatched = [];
        for (const ev of events) {
            if (!this.dispatchedKeys.has(ev.dedupeKey)) {
                this.dispatchedKeys.add(ev.dedupeKey);
                dispatched.push(ev.dedupeKey);
            }
        }
        return { dispatchedCount: dispatched.length, keys: dispatched };
    }
    isDispatched(dedupeKey) {
        return this.dispatchedKeys.has(dedupeKey);
    }
}
exports.OutboxDispatcher = OutboxDispatcher;
//# sourceMappingURL=index.js.map