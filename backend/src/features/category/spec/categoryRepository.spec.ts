import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryRepository } from '../categoryRepository';
import { prisma } from '../../../lib/db';

vi.mock('../../../lib/db', () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('CategoryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listByUser', () => {
    it('should call findMany', async () => {
      vi.mocked(prisma.category.findMany).mockResolvedValue([]);
      await categoryRepository.listByUser('u1');
      expect(prisma.category.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'u1' }
      }));
    });
  });

  describe('create', () => {
    it('should call create', async () => {
      const data = { userId: 'u1', name: 'Food' };
      vi.mocked(prisma.category.create).mockResolvedValue({ id: 'c1', ...data } as any);
      await categoryRepository.create(data);
      expect(prisma.category.create).toHaveBeenCalled();
    });
  });
});
