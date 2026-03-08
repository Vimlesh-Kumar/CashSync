import { BaseController } from '../../base/apiController';
import { groupService } from './groupService';
import type {
  AddGroupMemberRequest,
  CreateGroupRequest,
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
      const ledger = await groupService.getLedger(id);
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
