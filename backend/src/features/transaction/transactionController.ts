import { BaseController } from '../../base/apiController';
import { transactionService } from './transactionService';
import type {
  AddSplitsRequest,
  CreateCategoryRuleRequest,
  CreateTransactionRequest,
  StatsQuery,
  UpdateTransactionRequest,
} from './transactionSchema';

class TransactionController extends BaseController {
  constructor() {
    super('transaction');
  }

  getAll = this.handle(
    'getAll',
    async (ctx) => {
      const query = ctx.query as {
        userId?: string;
        limit?: string;
        offset?: string;
        category?: string;
        type?: string;
        source?: string;
        reviewState?: string;
        q?: string;
        from?: string;
        to?: string;
      };

      const result = await transactionService.getAll({
        userId: query.userId,
        category: query.category,
        type: query.type,
        source: query.source,
        reviewState: query.reviewState,
        q: query.q,
        from: query.from,
        to: query.to,
        limit: query.limit ? Number.parseInt(query.limit, 10) : undefined,
        offset: query.offset ? Number.parseInt(query.offset, 10) : undefined,
      });

      return this.ok(result);
    },
    'Failed to fetch transactions.',
  );

  create = this.handle(
    'create',
    async (ctx) => {
      const transaction = await transactionService.create(ctx.body as CreateTransactionRequest);
      const status = (transaction as { deduplicated?: boolean }).deduplicated ? 200 : 201;
      return this.ok(transaction, status);
    },
    'Failed to create transaction.',
  );

  update = this.handle(
    'update',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const transaction = await transactionService.update(id, ctx.body as UpdateTransactionRequest);
      return this.ok(transaction);
    },
    'Failed to update transaction.',
  );

  ingestSms = this.handle(
    'ingestSms',
    async (ctx) => {
      const { rawSms, authorId } = ctx.body as { rawSms: string; authorId: string };
      const transaction = await transactionService.ingestSms(rawSms, authorId);
      const status = (transaction as { deduplicated?: boolean }).deduplicated ? 200 : 201;
      return this.ok(transaction, status);
    },
    'Failed to ingest SMS.',
  );

  addSplits = this.handle(
    'addSplits',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const result = await transactionService.addSplits(id, ctx.body as AddSplitsRequest);
      return this.ok(result);
    },
    'Failed to add splits.',
  );

  settleSplit = this.handle(
    'settleSplit',
    async (ctx) => {
      const { splitId } = ctx.params as { splitId: string };
      const result = await transactionService.settleSplit(splitId);
      return this.ok(result);
    },
    'Failed to settle split.',
  );

  getDebtSummary = this.handle(
    'getDebtSummary',
    async (ctx) => {
      const { userId } = ctx.params as { userId: string };
      const result = await transactionService.getDebtSummary(userId);
      return this.ok(result);
    },
    'Failed to fetch debt summary.',
  );

  getFriendBalances = this.handle(
    'getFriendBalances',
    async (ctx) => {
      const { userId } = ctx.params as { userId: string };
      const result = await transactionService.getFriendBalances(userId);
      return this.ok(result);
    },
    'Failed to fetch friend balances.',
  );

  getCategoryRules = this.handle(
    'getCategoryRules',
    async (ctx) => {
      const { userId } = ctx.params as { userId: string };
      const rules = await transactionService.getCategoryRules(userId);
      return this.ok(rules);
    },
    'Failed to fetch category rules.',
  );

  createCategoryRule = this.handle(
    'createCategoryRule',
    async (ctx) => {
      const rule = await transactionService.createCategoryRule(ctx.body as CreateCategoryRuleRequest);
      return this.created(rule);
    },
    'Failed to create category rule.',
  );

  deleteCategoryRule = this.handle(
    'deleteCategoryRule',
    async (ctx) => {
      const { ruleId } = ctx.params as { ruleId: string };
      await transactionService.deleteCategoryRule(ruleId);
      return this.ok({ success: true });
    },
    'Failed to delete category rule.',
  );

  getStats = this.handle(
    'getStats',
    async (ctx) => {
      const result = await transactionService.getStats(ctx.query as StatsQuery);
      return this.ok(result);
    },
    'Failed to fetch stats.',
  );

  export = this.handle(
    'export',
    async (ctx) => {
      const { userId, format } = ctx.query as { userId: string; format?: string };
      const { transactions } = await transactionService.getAll({ userId, limit: 10000 });

      if (format === 'csv') {
        const headers = ['id', 'date', 'title', 'amount', 'currency', 'type', 'category', 'source', 'note'];
        const rows = (transactions as any[]).map((t: any) =>
          headers.map((h) => {
            const v = t[h] ?? '';
            return typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v);
          }).join(',')
        );
        const csv = [headers.join(','), ...rows].join('\n');
        ctx.response.setHeader('Content-Type', 'text/csv');
        ctx.response.setHeader('Content-Disposition', 'attachment; filename="cashsync-export.csv"');
        ctx.response.send(csv);
        return;
      }

      // Default: JSON
      ctx.response.setHeader('Content-Type', 'application/json');
      ctx.response.setHeader('Content-Disposition', 'attachment; filename="cashsync-backup.json"');
      ctx.response.json(transactions);
      return;
    },
    'Failed to export transactions.',
  );

  getLiveRates = this.handle(
    'getLiveRates',
    async (_ctx) => {
      const { getLiveRates } = await import('../../lib/currency');
      const rates = await getLiveRates();
      return this.ok({ rates, updatedAt: new Date().toISOString() });
    },
    'Failed to fetch live exchange rates.',
  );
}

export const transactionController = new TransactionController();

