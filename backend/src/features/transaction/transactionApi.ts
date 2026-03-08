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

const router = Router();

router.get('/', transactionController.getAll);
router.post('/', validateBody(createTransactionSchema), transactionController.create);
router.patch('/:id', validateBody(updateTransactionSchema), transactionController.update);
router.post('/sms', validateBody(ingestSmsSchema), transactionController.ingestSms);
router.post('/:id/splits', validateBody(addSplitsSchema), transactionController.addSplits);
router.patch('/splits/:splitId/settle', transactionController.settleSplit);
router.get('/debts/:userId', transactionController.getDebtSummary);
router.get('/rules/:userId', transactionController.getCategoryRules);
router.post('/rules', validateBody(createCategoryRuleSchema), transactionController.createCategoryRule);
router.delete('/rules/:ruleId', transactionController.deleteCategoryRule);
router.get('/stats', validateQuery(statsQuerySchema), transactionController.getStats);

export default router;
