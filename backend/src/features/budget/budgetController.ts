import { BaseController } from '../../base/apiController';
import { budgetService } from './budgetService';
import type { CreateBudgetRequest } from './budgetSchema';

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
}

export const budgetController = new BudgetController();
