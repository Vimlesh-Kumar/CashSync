import { Router } from 'express';
import { ZodSchema } from 'zod';
import { transactionController } from './transactionController';
import {
    addSplitsSchema,
    createCategoryRuleSchema,
    createTransactionSchema,
    ingestSmsSchema,
    statsQuerySchema,
    updateTransactionSchema,
} from './transactionSchema';

// ─── Reusable Zod Middleware ──────────────────────────────────────────────────

function validateBody(schema: ZodSchema) {
    return (req: any, res: any, next: any) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.issues.map((e: any) => e.message);
            return res.status(400).json({ error: errors[0], details: errors });
        }
        req.body = result.data;
        next();
    };
}

function validateQuery(schema: ZodSchema) {
    return (req: any, res: any, next: any) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            const errors = result.error.issues.map((e: any) => e.message);
            return res.status(400).json({ error: errors[0], details: errors });
        }
        next();
    };
}

// ─── Transaction API Router ───────────────────────────────────────────────────
// Owns all route definitions & Zod validation for the transaction feature.

const router = Router();

// ── Transactions CRUD ─────────────────────────────────────────────────────────

/** GET /api/transactions */
router.get('/', transactionController.getAll);

/** POST /api/transactions */
router.post('/', validateBody(createTransactionSchema), transactionController.create);

/** PATCH /api/transactions/:id */
router.patch('/:id', validateBody(updateTransactionSchema), transactionController.update);

// ── SMS Ingestion ─────────────────────────────────────────────────────────────

/** POST /api/transactions/sms */
router.post('/sms', validateBody(ingestSmsSchema), transactionController.ingestSms);

// ── Splits ────────────────────────────────────────────────────────────────────

/** POST /api/transactions/:id/splits */
router.post('/:id/splits', validateBody(addSplitsSchema), transactionController.addSplits);

/** PATCH /api/transactions/splits/:splitId/settle */
router.patch('/splits/:splitId/settle', transactionController.settleSplit);

// ── Debt Summary ──────────────────────────────────────────────────────────────

/** GET /api/transactions/debts/:userId */
router.get('/debts/:userId', transactionController.getDebtSummary);

// ── Category Rules ────────────────────────────────────────────────────────────

/** GET /api/transactions/rules/:userId */
router.get('/rules/:userId', transactionController.getCategoryRules);

/** POST /api/transactions/rules */
router.post('/rules', validateBody(createCategoryRuleSchema), transactionController.createCategoryRule);

/** DELETE /api/transactions/rules/:ruleId */
router.delete('/rules/:ruleId', transactionController.deleteCategoryRule);

// ── Stats / Analytics ─────────────────────────────────────────────────────────

/** GET /api/transactions/stats?userId= */
router.get('/stats', validateQuery(statsQuerySchema), transactionController.getStats);

export default router;
