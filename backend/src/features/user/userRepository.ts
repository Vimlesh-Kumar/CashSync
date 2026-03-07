import { prisma } from '../../lib/db';

// ─── User Repository ──────────────────────────────────────────────────────────
// Only place in the user feature that touches Prisma.

export const userRepository = {

    findByEmail(email: string) {
        return prisma.user.findUnique({ where: { email } });
    },

    findById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            include: {
                memberships: { include: { group: true } },
                splits: { where: { isSettled: false }, take: 10 },
            },
        });
    },

    create(data: {
        email: string;
        name?: string;
        provider: string;
        providerId?: string | null;
        password?: string | null;
    }) {
        return prisma.user.create({ data });
    },

    updateOAuth(id: string, data: { provider: string; providerId?: string | null; name?: string | null }) {
        return prisma.user.update({ where: { id }, data });
    },

    updatePassword(id: string, hashedPassword: string) {
        return prisma.user.update({
            where: { id },
            data: { password: hashedPassword, provider: 'JWT' },
        });
    },
};
