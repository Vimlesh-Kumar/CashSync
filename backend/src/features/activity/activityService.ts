import { activityRepository, CreateActivityData } from './activityRepository';

// ─── Activity Service ─────────────────────────────────────────────────────────

export const activityService = {
    /** Log any action. Call this from other services after mutations. */
    log(data: CreateActivityData) {
        // fire-and-forget — never let activity logging break the main request
        return activityRepository.create(data).catch(() => null);
    },

    async getForUser(userId: string, limit?: number) {
        return activityRepository.findByUser(userId, limit);
    },

    async getForGroup(groupId: string, limit?: number) {
        return activityRepository.findByGroup(groupId, limit);
    },
};
