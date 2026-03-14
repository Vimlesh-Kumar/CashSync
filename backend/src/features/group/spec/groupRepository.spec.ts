import { describe, it, expect, vi, beforeEach } from 'vitest';
import { groupRepository } from '../groupRepository';
import { prisma } from '../../../lib/db';

vi.mock('../../../lib/db', () => ({
  prisma: {
    group: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    groupMember: {
      create: vi.fn(),
    },
    split: {
      findMany: vi.fn(),
      update: vi.fn(),
    }
  },
}));

describe('GroupRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create group', async () => {
    await groupRepository.create({ name: 'G', ownerId: 'u1' });
    expect(prisma.group.create).toHaveBeenCalled();
  });

  it('should find by id', async () => {
    await groupRepository.findById('g1');
    expect(prisma.group.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'g1' }
    }));
  });

  it('should list by user', async () => {
    await groupRepository.listByUser('u1');
    expect(prisma.group.findMany).toHaveBeenCalled();
  });

  it('should add member', async () => {
    await groupRepository.addMember('g1', 'u2', 'MEMBER');
    expect(prisma.groupMember.create).toHaveBeenCalled();
  });

  it('should find group splits', async () => {
    await groupRepository.findGroupSplits('g1');
    expect(prisma.split.findMany).toHaveBeenCalled();
  });

  it('should find unsettled splits between', async () => {
    await groupRepository.findUnsettledSplitsBetween('g1', 'u1', 'u2', 'INR');
    expect(prisma.split.findMany).toHaveBeenCalled();
  });

  it('should update split', async () => {
    await groupRepository.updateSplit('s1', { amountPaid: 10, isSettled: true });
    expect(prisma.split.update).toHaveBeenCalled();
  });
});
