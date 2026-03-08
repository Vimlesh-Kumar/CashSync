import { BaseController } from '../../base/apiController';
import { categoryService } from './categoryService';
import type { CreateCategoryRequest } from './categorySchema';

class CategoryController extends BaseController {
  constructor() {
    super('category');
  }

  list = this.handle(
    'list',
    async (ctx) => {
      const { userId } = ctx.params as { userId: string };
      const categories = await categoryService.listByUser(userId);
      return this.ok(categories);
    },
    'Failed to fetch categories.',
  );

  create = this.handle(
    'create',
    async (ctx) => {
      const category = await categoryService.create(ctx.body as CreateCategoryRequest);
      return this.created(category);
    },
    'Failed to create category.',
  );
}

export const categoryController = new CategoryController();
