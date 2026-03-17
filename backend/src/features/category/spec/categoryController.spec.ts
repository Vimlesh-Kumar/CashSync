import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryController } from '../categoryController';
import { categoryService } from '../categoryService';

vi.mock('../categoryService', () => ({
  categoryService: {
    listByUser: vi.fn(),
    create: vi.fn(),
  },
}));

describe('CategoryController', () => {
  let mockRes: any;
  let mockReq: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    };
    mockReq = {
      params: {},
      body: {},
      header: vi.fn(),
      res: mockRes,
    };
  });

  describe('list', () => {
    it('should return list of categories', async () => {
      mockReq.params.userId = 'u1';
      vi.mocked(categoryService.listByUser).mockResolvedValue([{ id: 'c1' }] as any);
      
      await categoryController.list(mockReq, mockRes, vi.fn());
      
      expect(categoryService.listByUser).toHaveBeenCalledWith('u1');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('should create and return 201', async () => {
      mockReq.body = { name: 'New' };
      vi.mocked(categoryService.create).mockResolvedValue({ id: 'c2' } as any);
      
      await categoryController.create(mockReq, mockRes, vi.fn());
      
      expect(categoryService.create).toHaveBeenCalledWith({ name: 'New' });
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });
});
