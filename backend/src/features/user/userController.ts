import { BaseController } from '../../base/apiController';
import type { SyncUserRequest, UpdateUserRequest } from './userSchema';
import { userService } from './userService';

class UserController extends BaseController {
  constructor() {
    super('user');
  }

  getAllUsers = this.handle(
    'getAllUsers',
    async (ctx) => {
      const users = await userService.getAllUsers();
      return this.ok(users);
    },
    'Failed to fetch users.'
  );

  getProfile = this.handle(
    'getProfile',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const user = await userService.getProfile(id);
      return this.ok(user);
    },
    'Failed to fetch user profile.',
  );

  updateUser = this.handle(
    'updateUser',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const user = await userService.updateUser(id, ctx.body as UpdateUserRequest);
      return this.ok(user);
    },
    'Failed to update user profile.'
  );

  deleteUser = this.handle(
    'deleteUser',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      await userService.deleteUser(id);
      return this.ok({ success: true, message: 'User deleted successfully' });
    },
    'Failed to delete user.'
  );

  syncIdentity = this.handle(
    'syncIdentity',
    async (ctx) => {
      const result = await userService.syncIdentity(ctx.body as SyncUserRequest);
      return this.ok(result);
    },
    'Failed to sync user identity.',
  );
}

export const userController = new UserController();
