"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxDispatcher = exports.JOB_NAMES = exports.QUEUE_NAMES = void 0;
exports.createRedisConnection = createRedisConnection;
exports.createBullMQQueue = createBullMQQueue;
exports.createBullMQWorker = createBullMQWorker;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
exports.QUEUE_NAMES = {
    MEDIA_PROCESSING: 'media-processing',
    MEDIA_PUBLISHING: 'media-publishing',
    MAINTENANCE: 'maintenance',
};
exports.JOB_NAMES = {
    PROCESS_MEDIA: 'process-media',
    PUBLISH_MEDIA: 'publish-media',
    CLEANUP_EXPIRED_UPLOADS: 'cleanup-expired-uploads',
    CLEANUP_ABANDONED_ASSETS: 'cleanup-abandoned-assets',
    DISPATCH_OUTBOX: 'dispatch-outbox',
};
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
function createRedisConnection(url) {
    const connectionUrl = url || process.env.REDIS_URL || 'redis://localhost:6379';
    return new ioredis_1.default(connectionUrl, { maxRetriesPerRequest: null });
}
function createBullMQQueue(queueName, connectionUrl) {
    const connection = createRedisConnection(connectionUrl);
    return new bullmq_1.Queue(queueName, { connection });
}
function createBullMQWorker(queueName, processor, concurrency = 2, connectionUrl) {
    const connection = createRedisConnection(connectionUrl);
    return new bullmq_1.Worker(queueName, processor, { concurrency, connection });
}
//# sourceMappingURL=index.js.map