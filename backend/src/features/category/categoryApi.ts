import { Router } from 'express';
import { ZodSchema } from 'zod';
import { categoryController } from './categoryController';
import { createCategorySchema, listCategoryParamsSchema } from './categorySchema';

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

const router = Router();

router.get('/:userId', validateParams(listCategoryParamsSchema), categoryController.list);
router.post('/', validateBody(createCategorySchema), categoryController.create);

export default router;
