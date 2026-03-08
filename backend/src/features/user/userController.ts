import { BaseController } from '../../base/apiController';
import { userService } from './userService';
import type { SyncUserRequest } from './userSchema';

class UserController extends BaseController {
  constructor() {
    super('user');
  }

  getProfile = this.handle(
    'getProfile',
    async (ctx) => {
      const { id } = ctx.params as { id: string };
      const user = await userService.getProfile(id);
      return this.ok(user);
    },
    'Failed to fetch user profile.',
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
