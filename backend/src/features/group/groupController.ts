import { BaseController } from '../../base/apiController';
import { groupService } from './groupService';
import type {
  AddGroupMemberRequest,
  CreateGroupRequest,
  GetGroupLedgerQuery,
  SettleGroupDebtRequest,
} from './groupSchema';

class GroupController extends BaseController {
  constructor() {
    super('group');
  }

  list = this.handle(
    'list',
    async (ctx) => {
      const { userId } = ctx.query as { userId: string };
      const groups = await groupService.listForUser(userId);
      return this.ok(groups);
    },
    'Failed to fetch groups.',
  );

  create = this.handle(
    'create',
    async (ctx) => {
      const group = await groupService.create(ctx.body as CreateGroupRequest);
      return this.created(group);
    },
    'Failed to create group.',
  );

  /**
   * @swagger
   * /api/groups/{id}/members:
   *   post:
   *     summary: Add a member to a group
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *       - name: body
   *         in: body
   *         required: true
   *         schema:
   *           type: object
   *           properties:
   *             userId:
   *               type: string
   *             email:
   *               type: string
   *     responses:
   *       201:
   *         description: Member added successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                 name:
   *                   type: string
   *                 email:
   *                   type: string
   *                 balance:
   *                   type: number
   *                 createdAt:
   *                   type: string
   *                 updatedAt:
   *                   type: string
   *       400:
   *         description: Invalid request
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                 details:
   *                   type: array
   *                   items:
   *                     type: string
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                 details:
   *                   type: array
   *                   items:
   *                     type: string
   */
  addMember = this.handle(
    'addMember',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const member = await groupService.addMember(id, ctx.body as AddGroupMemberRequest);
      return this.created(member);
    },
    'Failed to add group member.',
  );

  getLedger = this.handle(
    'getLedger',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const { userId } = ctx.query as GetGroupLedgerQuery;
      const ledger = await groupService.getLedger(id, userId);
      return this.ok(ledger);
    },
    'Failed to fetch group ledger.',
  );

  settle = this.handle(
    'settle',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const result = await groupService.settleRoute(id, ctx.body as SettleGroupDebtRequest);
      return this.ok(result);
    },
    'Failed to settle debt.',
  );
}

export const groupController = new GroupController();
