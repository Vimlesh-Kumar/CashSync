import { Router } from 'express';
import { ZodSchema } from 'zod';
import { groupController } from './groupController';
import {
  addGroupMemberSchema,
  createGroupSchema,
  getGroupLedgerQuerySchema,
  groupIdParamsSchema,
  listGroupsQuerySchema,
  settleGroupDebtSchema,
  updateGroupSchema,
  updateGroupMemberSchema,
  userIdParamsSchema,
} from './groupSchema';

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

router.get('/', validateQuery(listGroupsQuerySchema), groupController.list);
router.post('/', validateBody(createGroupSchema), groupController.create);
router.get('/:id', validateParams(groupIdParamsSchema), groupController.getById);
router.put('/:id', validateParams(groupIdParamsSchema), validateBody(updateGroupSchema), groupController.update);
router.delete('/:id', validateParams(groupIdParamsSchema), groupController.delete);

// Member management
router.get('/:id/members', validateParams(groupIdParamsSchema), groupController.listMembers);
router.post('/:id/members', validateParams(groupIdParamsSchema), validateBody(addGroupMemberSchema), groupController.addMember);
router.put('/:id/members/:userId', validateParams(userIdParamsSchema), validateBody(updateGroupMemberSchema), groupController.updateMember);
router.delete('/:id/members/:userId', validateParams(userIdParamsSchema), groupController.removeMember);

router.get('/:id/ledger', validateParams(groupIdParamsSchema), validateQuery(getGroupLedgerQuerySchema), groupController.getLedger);
router.post('/:id/settle', validateParams(groupIdParamsSchema), validateBody(settleGroupDebtSchema), groupController.settle);


export default router;
