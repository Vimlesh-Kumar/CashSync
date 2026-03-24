import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userController } from '../userController';
import { userService } from '../userService';

vi.mock('../userService', () => ({
  userService: {
    getAllUsers: vi.fn(),
    searchUsers: vi.fn(),
    getProfile: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    syncIdentity: vi.fn(),
  },
}));

describe('UserController', () => {
  let mockRes: any;
  let mockReq: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      sendStatus: vi.fn().mockReturnThis(),
    };
    mockReq = {
      params: {},
      body: {},
      query: {},
      header: vi.fn(),
      get: vi.fn(),
    };
    mockReq.res = mockRes;
  });

  describe('getAllUsers', () => {
    it('should return users', async () => {
      const mockUsers = [{ id: '1' }];
      vi.mocked(userService.getAllUsers).mockResolvedValue(mockUsers as any);

      await userController.getAllUsers(mockReq, mockRes, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUsers);
    });
  });

  describe('searchUsers', () => {
    it('should return search results', async () => {
      mockReq.query = { q: 'john' };
      vi.mocked(userService.searchUsers).mockResolvedValue([{ id: '1' }] as any);

      await userController.searchUsers(mockReq, mockRes, vi.fn());

      expect(userService.searchUsers).toHaveBeenCalledWith({ q: 'john' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getProfile', () => {
    it('should return profile', async () => {
      mockReq.params.id = '1';
      vi.mocked(userService.getProfile).mockResolvedValue({ id: '1' } as any);

      await userController.getProfile(mockReq, mockRes, vi.fn());

      expect(userService.getProfile).toHaveBeenCalledWith('1');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      mockReq.params.id = '1';
      await userController.deleteUser(mockReq, mockRes, vi.fn());
      expect(userService.deleteUser).toHaveBeenCalledWith('1');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
