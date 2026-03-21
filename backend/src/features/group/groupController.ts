import { BaseController } from '../../base/apiController';
import { groupService } from './groupService';
import type {
  AddGroupMemberRequest,
  CreateGroupRequest,
  GetGroupLedgerQuery,
  SettleGroupDebtRequest,
  UpdateGroupRequest,
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

  getById = this.handle(
    'getById',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const group = await groupService.getById(id);
      return this.ok(group);
    },
    'Failed to fetch group.',
  );

  update = this.handle(
    'update',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const group = await groupService.update(id, ctx.body as UpdateGroupRequest);
      return this.ok(group);
    },
    'Failed to update group.',
  );

  delete = this.handle(
    'delete',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      await groupService.delete(id);
      return this.noContent();
    },
    'Failed to delete group.',
  );

  listMembers = this.handle(
    'listMembers',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const members = await groupService.listMembers(id);
      return this.ok(members);
    },
    'Failed to fetch group members.',
  );

  updateMember = this.handle(
    'updateMember',
    async (ctx) => {
      const { id, userId } = ctx.params as { id: string; userId: string };
      const { role } = ctx.body as { role: 'ADMIN' | 'MEMBER' };
      const member = await groupService.updateMember(id, userId, role);
      return this.ok(member);
    },
    'Failed to update group member.',
  );

  removeMember = this.handle(
    'removeMember',
    async (ctx) => {
      const { id, userId } = ctx.params as { id: string; userId: string };
      await groupService.removeMember(id, userId);
      return this.noContent();
    },
    'Failed to remove group member.',
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
