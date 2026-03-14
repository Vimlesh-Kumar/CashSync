import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryService } from '../categoryService';
import { categoryRepository } from '../categoryRepository';

vi.mock('../categoryRepository', () => ({
  categoryRepository: {
    listByUser: vi.fn(),
    create: vi.fn(),
  },
}));

describe('CategoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listByUser', () => {
    it('should return categories for a user', async () => {
      const mockCategories = [{ id: 'c1', name: 'Food' }];
      vi.mocked(categoryRepository.listByUser).mockResolvedValue(mockCategories as any);

      const result = await categoryService.listByUser('u1');

      expect(result).toEqual(mockCategories);
      expect(categoryRepository.listByUser).toHaveBeenCalledWith('u1');
    });
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const input = { userId: 'u1', name: 'Travel', color: '#ff0000' };
      vi.mocked(categoryRepository.create).mockResolvedValue({ id: 'c2', ...input } as any);

      const result = await categoryService.create(input as any);

      expect(result.name).toBe('Travel');
      expect(categoryRepository.create).toHaveBeenCalledWith(input);
    });
  });
});
