import { BaseController } from '../../base/apiController';
import { budgetService } from './budgetService';
import type { CreateBudgetRequest, UpdateBudgetRequest } from './budgetSchema';

class BudgetController extends BaseController {
  constructor() {
    super('budget');
  }

  create = this.handle(
    'create',
    async (ctx) => {
      const budget = await budgetService.create(ctx.body as CreateBudgetRequest);
      return this.created(budget);
    },
    'Failed to create budget.',
  );

  list = this.handle(
    'list',
    async (ctx) => {
      const { userId } = ctx.params as { userId: string };
      const { month } = ctx.query as { month?: string };
      const budgets = await budgetService.list(userId, month);
      return this.ok(budgets);
    },
    'Failed to fetch budgets.',
  );

  update = this.handle(
    'update',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const budget = await budgetService.update(id, ctx.body as UpdateBudgetRequest);
      return this.ok(budget);
    },
    'Failed to update budget.',
  );
}

export const budgetController = new BudgetController();
