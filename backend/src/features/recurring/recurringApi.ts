import { Router } from 'express';
import { ZodSchema } from 'zod';
import { recurringController } from './recurringController';
import {
    createRecurringBillSchema,
    listRecurringBillsQuerySchema,
    updateRecurringBillSchema,
} from './recurringSchema';

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

router.get('/', validateQuery(listRecurringBillsQuerySchema), recurringController.list);
router.post('/', validateBody(createRecurringBillSchema), recurringController.create);
router.patch('/:id', validateBody(updateRecurringBillSchema), recurringController.update);
router.delete('/:id', recurringController.delete);
router.post('/process-due', recurringController.processDue); // called by cron/worker

export default router;
