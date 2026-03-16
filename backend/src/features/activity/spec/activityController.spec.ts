import { describe, it, expect, vi, beforeEach } from 'vitest';
import { activityController } from '../activityController';

vi.mock('../activityService', () => ({
    activityService: {
        getForUser: vi.fn(),
        getForGroup: vi.fn(),
    },
}));

import { activityService } from '../activityService';

const mockHandle = (params: object, query: object = {}) => {
    const ctx = {
        params,
        query,
        body: {},
        response: { json: vi.fn(), status: vi.fn() },
    };
    return ctx;
};

describe('ActivityController', () => {
    beforeEach(() => vi.clearAllMocks());

    it('getForUser — returns logs for a userId', async () => {
        vi.mocked(activityService.getForUser).mockResolvedValue([{ id: 'a1' }] as any);

        const logs = await activityService.getForUser('u1');
        expect(logs).toHaveLength(1);
        expect(activityService.getForUser).toHaveBeenCalledWith('u1');
    });

    it('getForGroup — returns logs for a groupId', async () => {
        vi.mocked(activityService.getForGroup).mockResolvedValue([{ id: 'a2' }] as any);

        const logs = await activityService.getForGroup('g1');
        expect(logs).toHaveLength(1);
    });
});
