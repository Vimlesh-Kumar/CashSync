import { prisma } from '../../lib/db';

export const categoryRepository = {
    listByUser(userId: string) {
        return prisma.category.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });
    },

    create(data: { userId: string; name: string; icon?: string; color?: string; isDefault?: boolean }) {
        return prisma.category.create({
            data: {
                userId: data.userId,
                name: data.name,
                icon: data.icon,
                color: data.color,
                isDefault: data.isDefault ?? false,
            },
        });
    },
};
