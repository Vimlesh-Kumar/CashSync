import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService, UserService } from '../userService';
import { userRepository } from '../userRepository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { oauthService } from '../../../services/oauth.service';

vi.mock('../userRepository', () => ({
  userRepository: {
    findById: vi.fn(),
    findAll: vi.fn(),
    updateProfile: vi.fn(),
    delete: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updatePassword: vi.fn(),
    findByAuthProvider: vi.fn(),
    updateOAuth: vi.fn(),
    upsertAuthProvider: vi.fn(),
  },
}));

vi.mock('../../../services/oauth.service', () => ({
  oauthService: {
    verify: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed'),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('token'),
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('getProfile', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser as any);

      const result = await userService.getProfile('1');

      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw 404 when user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(userService.getProfile('1')).rejects.toThrow('User not found.');
      try {
        await userService.getProfile('1');
      } catch (e: any) {
        expect(e.status).toBe(404);
      }
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [{ id: '1', name: 'User 1' }, { id: '2', name: 'User 2' }];
      vi.mocked(userRepository.findAll).mockResolvedValue(mockUsers as any);

      const result = await userService.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(userRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update user if found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({ id: '1' } as any);
      vi.mocked(userRepository.updateProfile).mockResolvedValue({ id: '1', name: 'New' } as any);

      const result = await userService.updateUser('1', { name: 'New' });
      expect(result.name).toBe('New');
    });

    it('should throw 404 if not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);
      await expect(userService.updateUser('1', {})).rejects.toThrow('User not found.');
    });
  });

  describe('deleteUser', () => {
    it('should delete if found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({ id: '1' } as any);
      await userService.deleteUser('1');
      expect(userRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw 404 if not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);
      await expect(userService.deleteUser('1')).rejects.toThrow('User not found.');
    });
  });

  describe('syncIdentity', () => {
    describe('JWT Provider', () => {
      it('should throw if email is missing', async () => {
        await expect(userService.syncIdentity({ provider: 'JWT' } as any)).rejects.toThrow('Email is required for JWT login.');
      });

      it('should sign up new user', async () => {
        vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
        vi.mocked(userRepository.create).mockResolvedValue({ id: '1', email: 'test@test.com' } as any);

        const res = await userService.syncIdentity({ provider: 'JWT', email: 'test@test.com', password: 'password' });
        expect(res.token).toBe('token');
        expect(userRepository.create).toHaveBeenCalled();
      });

      it('should update password if isSignUp and user exists', async () => {
        vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: '1', email: 'test@test.com' } as any);
        vi.mocked(userRepository.updatePassword).mockResolvedValue({ id: '1', email: 'test@test.com' } as any);

        await userService.syncIdentity({ provider: 'JWT', email: 'test@test.com', password: 'new', isSignUp: true });
        expect(userRepository.updatePassword).toHaveBeenCalled();
      });

      it('should login existing user with correct password', async () => {
        vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: '1', password: 'hash' } as any);
        vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

        const res = await userService.syncIdentity({ provider: 'JWT', email: 'a@b.com', password: 'pass' });
        expect(res.user.id).toBe('1');
      });

      it('should throw if password is wrong', async () => {
        vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: '1', password: 'hash' } as any);
        vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

        await expect(userService.syncIdentity({ provider: 'JWT', email: 'a@b.com', password: 'wrong' }))
          .rejects.toThrow('Invalid email or password.');
      });

      it('should throw if user has no password (social account)', async () => {
        vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: '1', password: null } as any);
        await expect(userService.syncIdentity({ provider: 'JWT', email: 'a@b.com', password: 'pass' }))
          .rejects.toThrow('social provider');
      });
    });

    describe('OAuth Provider', () => {
      it('should throw if idToken is missing', async () => {
        await expect(userService.syncIdentity({ provider: 'GOOGLE' } as any)).rejects.toThrow('OAuth idToken is required.');
      });

      it('should verify and sync existing user', async () => {
        vi.mocked(oauthService.verify).mockResolvedValue({ email: 'test@test.com', providerUserId: 'p1' } as any);
        vi.mocked(userRepository.findByAuthProvider).mockResolvedValue({ user: { id: '1', email: 'test@test.com' } } as any);
        vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: '1', email: 'test@test.com' } as any);
        vi.mocked(userRepository.updateOAuth).mockResolvedValue({ id: '1', email: 'test@test.com' } as any);

        const res = await userService.syncIdentity({ provider: 'GOOGLE', idToken: 'token' });
        expect(res.user.id).toBe('1');
        expect(userRepository.updateOAuth).toHaveBeenCalled();
      });

      it('should throw on email mismatch', async () => {
        vi.mocked(oauthService.verify).mockResolvedValue({ email: 'a@a.com', providerUserId: 'p1' } as any);
        await expect(userService.syncIdentity({ provider: 'GOOGLE', idToken: 't', email: 'b@b.com' }))
          .rejects.toThrow('does not match OAuth token email');
      });

      it('should throw if email missing from identity', async () => {
        vi.mocked(oauthService.verify).mockResolvedValue({ providerUserId: 'p1' } as any);
        await expect(userService.syncIdentity({ provider: 'GOOGLE', idToken: 't' }))
          .rejects.toThrow('OAuth email is unavailable');
      });

      it('should throw on identity conflict', async () => {
        vi.mocked(oauthService.verify).mockResolvedValue({ email: 'user@test.com', providerUserId: 'p1' } as any);
        vi.mocked(userRepository.findByAuthProvider).mockResolvedValue({ user: { id: 'u1' } } as any);
        vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: 'u2' } as any);

        await expect(userService.syncIdentity({ provider: 'GOOGLE', idToken: 't' }))
          .rejects.toThrow('already linked to another account');
      });

      it('should create user if not found by email or provider', async () => {
        vi.mocked(oauthService.verify).mockResolvedValue({ email: 'new@test.com', providerUserId: 'p1' } as any);
        vi.mocked(userRepository.findByAuthProvider).mockResolvedValue(null);
        vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
        vi.mocked(userRepository.create).mockResolvedValue({ id: 'new', email: 'new@test.com' } as any);
        vi.mocked(userRepository.updateOAuth).mockResolvedValue({ id: 'new', email: 'new@test.com' } as any);

        await userService.syncIdentity({ provider: 'GOOGLE', idToken: 't' });
        expect(userRepository.create).toHaveBeenCalled();
      });
      
      it('should update profile if avatar or missing name in identity', async () => {
        vi.mocked(oauthService.verify).mockResolvedValue({ email: 'test@test.com', providerUserId: 'p1', avatarUrl: 'url', name: 'Name' } as any);
        vi.mocked(userRepository.findByAuthProvider).mockResolvedValue({ user: { id: '1', email: 'test@test.com' } } as any);
        vi.mocked(userRepository.updateOAuth).mockResolvedValue({ id: '1', name: null } as any);
        vi.mocked(userRepository.updateProfile).mockResolvedValue({ id: '1', avatarUrl: 'url', name: 'Name' } as any);

        await userService.syncIdentity({ provider: 'GOOGLE', idToken: 't' });
        expect(userRepository.updateProfile).toHaveBeenCalled();
      });
    });

    it('should throw if user resolution fails for some reason', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.create).mockResolvedValue(null as any);
      await expect(userService.syncIdentity({ provider: 'JWT', email: 'a@b.com', password: 'p' }))
        .rejects.toThrow('Unable to complete authentication.');
    });
  });
});
