import { Router } from 'express';
import { ZodSchema } from 'zod';
import { userController } from './userController';
import { getUserParamsSchema, syncUserSchema, updateUserSchema } from './userSchema';

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

router.get('/', userController.getAllUsers);
router.post('/sync', validateBody(syncUserSchema), userController.syncIdentity);
router.get('/:id', validateParams(getUserParamsSchema), userController.getProfile);
router.put('/:id', validateParams(getUserParamsSchema), validateBody(updateUserSchema), userController.updateUser);
router.delete('/:id', validateParams(getUserParamsSchema), userController.deleteUser);

export default router;
