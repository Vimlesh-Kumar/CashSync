import { BaseController } from '../../base/apiController';
import { recurringService } from './recurringService';
import type { CreateRecurringBillRequest, UpdateRecurringBillRequest } from './recurringSchema';

class RecurringController extends BaseController {
    constructor() {
        super('recurring');
    }

    list = this.handle(
        'list',
        async (ctx) => {
            const { userId } = ctx.query as { userId: string };
            const bills = await recurringService.list(userId);
            return this.ok(bills);
        },
        'Failed to fetch recurring bills.',
    );

    create = this.handle(
        'create',
        async (ctx) => {
            const bill = await recurringService.create(ctx.body as CreateRecurringBillRequest);
            return this.created(bill);
        },
        'Failed to create recurring bill.',
    );

    update = this.handle(
        'update',
        async (ctx) => {
            const { id } = ctx.params as { id: string };
            const bill = await recurringService.update(id, ctx.body as UpdateRecurringBillRequest);
            return this.ok(bill);
        },
        'Failed to update recurring bill.',
    );

    delete = this.handle(
        'delete',
        async (ctx) => {
            const { id } = ctx.params as { id: string };
            const result = await recurringService.delete(id);
            return this.ok(result);
        },
        'Failed to delete recurring bill.',
    );

    processDue = this.handle(
        'processDue',
        async (_ctx) => {
            const result = await recurringService.processDue();
            return this.ok(result);
        },
        'Failed to process due recurring bills.',
    );
}

export const recurringController = new RecurringController();
