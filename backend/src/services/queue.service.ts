/**
 * Redis queue placeholder.
 * Production setup can use BullMQ + ioredis with this service boundary.
 */
export const queueService = {
    enqueueParsingJob(payload: Record<string, unknown>) {
        // Planned integration point for Redis-backed queue push.
        return { queued: true, payload };
    },
};
