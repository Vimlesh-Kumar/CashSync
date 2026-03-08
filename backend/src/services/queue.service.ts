/**
 * Redis queue placeholder.
 * Production setup can use BullMQ + ioredis with this service boundary.
 */
export const queueService = {
    enqueueParsingJob(payload: Record<string, unknown>) {
        // TODO: push payload to Redis-backed queue.
        return { queued: true, payload };
    },
};
