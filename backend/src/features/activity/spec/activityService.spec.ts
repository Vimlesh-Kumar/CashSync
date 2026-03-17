import { describe, it, expect, vi, beforeEach } from 'vitest';
import { activityService } from '../activityService';
import { activityRepository } from '../activityRepository';

vi.mock('../activityRepository', () => ({
    activityRepository: {
        create: vi.fn(),
        findByUser: vi.fn(),
        findByGroup: vi.fn(),
    },
}));

describe('ActivityService', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('log', () => {
        it('should call repository.create and return the log', async () => {
            const mockLog = { id: 'a1', action: 'CREATE_TRANSACTION' };
            vi.mocked(activityRepository.create).mockResolvedValue(mockLog as any);

            await activityService.log({ userId: 'u1', action: 'CREATE_TRANSACTION', metadata: { title: 'Test' } });
            expect(activityRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'u1', action: 'CREATE_TRANSACTION' })
            );
        });

        it('should NOT throw if repository.create fails (fire-and-forget)', async () => {
            vi.mocked(activityRepository.create).mockRejectedValue(new Error('DB down'));
            await expect(activityService.log({ userId: 'u1', action: 'TEST' })).resolves.toBeNull();
        });
    });

    describe('getForUser', () => {
        it('should return activity logs for a user', async () => {
            const logs = [{ id: 'a1', action: 'CREATE_TRANSACTION', userId: 'u1' }];
            vi.mocked(activityRepository.findByUser).mockResolvedValue(logs as any);

            const result = await activityService.getForUser('u1');
            expect(result).toEqual(logs);
            expect(activityRepository.findByUser).toHaveBeenCalledWith('u1', undefined);
        });

        it('should pass limit if provided', async () => {
            vi.mocked(activityRepository.findByUser).mockResolvedValue([]);
            await activityService.getForUser('u1', 10);
            expect(activityRepository.findByUser).toHaveBeenCalledWith('u1', 10);
        });
    });

    describe('getForGroup', () => {
        it('should return activity logs for a group', async () => {
            const logs = [{ id: 'a2', action: 'ADD_MEMBER', groupId: 'g1' }];
            vi.mocked(activityRepository.findByGroup).mockResolvedValue(logs as any);

            const result = await activityService.getForGroup('g1');
            expect(result).toEqual(logs);
            expect(activityRepository.findByGroup).toHaveBeenCalledWith('g1', undefined);
        });
    });
});
