import { BaseController } from '../../base/apiController';
import { activityService } from './activityService';

class ActivityController extends BaseController {
    constructor() {
        super('activity');
    }

    getForUser = this.handle(
        'getForUser',
        async (ctx) => {
            const { userId } = ctx.params as { userId: string };
            const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined;
            const logs = await activityService.getForUser(userId, limit);
            return this.ok(logs);
        },
        'Failed to fetch activity log.',
    );

    getForGroup = this.handle(
        'getForGroup',
        async (ctx) => {
            const { groupId } = ctx.params as { groupId: string };
            const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined;
            const logs = await activityService.getForGroup(groupId, limit);
            return this.ok(logs);
        },
        'Failed to fetch group activity log.',
    );
}

export const activityController = new ActivityController();
