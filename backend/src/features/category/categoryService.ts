import { categoryRepository } from './categoryRepository';
import { CreateCategoryRequest } from './categorySchema';

export const categoryService = {
    listByUser(userId: string) {
        return categoryRepository.listByUser(userId);
    },

    async create(data: CreateCategoryRequest) {
        return categoryRepository.create(data);
    },
};
