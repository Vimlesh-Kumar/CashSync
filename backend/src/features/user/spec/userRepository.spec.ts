import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userRepository } from '../userRepository';
import { prisma } from '../../../lib/db';

vi.mock('../../../lib/db', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    authProvider: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
    }
  },
}));

describe('UserRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should call prisma findMany with include', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      await userRepository.findAll();
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        include: { authProviders: true }
      }));
    });
  });

  describe('findById', () => {
    it('should call findUnique with relations', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: '1' } as any);
      await userRepository.findById('1');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '1' }
      }));
    });
  });

  describe('create', () => {
    it('should call prisma create', async () => {
        const data = { email: 'a@b.com', provider: 'JWT' };
        vi.mocked(prisma.user.create).mockResolvedValue({ id: '1', ...data } as any);
        await userRepository.create(data);
        expect(prisma.user.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('delete', () => {
    it('should call prisma delete', async () => {
        await userRepository.delete('1');
        expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });
});
