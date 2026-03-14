import { Router } from 'express';
import { ZodSchema } from 'zod';
import { budgetController } from './budgetController';
import { budgetIdParamsSchema, budgetParamsSchema, budgetQuerySchema, createBudgetSchema, updateBudgetSchema } from './budgetSchema';

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

function validateParams(schema: ZodSchema) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.issues.map((e: any) => e.message);
      return res.status(400).json({ error: errors[0], details: errors });
    }
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

router.post('/', validateBody(createBudgetSchema), budgetController.create);
router.get('/:userId', validateParams(budgetParamsSchema), validateQuery(budgetQuerySchema), budgetController.list);
router.put('/:id', validateParams(budgetIdParamsSchema), validateBody(updateBudgetSchema), budgetController.update);

export default router;
