import { prisma } from '../../lib/db';

// ─── User Repository ──────────────────────────────────────────────────────────
// Only place in the user feature that touches Prisma.

export class UserRepository {

    findAll() {
        return prisma.user.findMany({
            include: {
                authProviders: true,
            },
        });
    }

    findByEmail(email: string) {
        return prisma.user.findUnique({ where: { email } });
    }

    findById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            include: {
                authProviders: true,
                memberships: { include: { group: true } },
                splits: { where: { isSettled: false }, take: 10 },
            },
        });
    }

    findByAuthProvider(provider: 'GOOGLE' | 'APPLE', providerUserId: string) {
        return prisma.authProvider.findUnique({
            where: {
                provider_providerUserId: {
                    provider,
                    providerUserId,
                },
            },
            include: { user: true },
        });
    }

    create(data: {
        email: string;
        name?: string;
        provider: string;
        providerId?: string | null;
        password?: string | null;
        defaultCurrency?: string;
    }) {
        return prisma.user.create({ data });
    }

    updateOAuth(id: string, data: { provider: string; providerId?: string | null; name?: string | null }) {
        return prisma.user.update({ where: { id }, data });
    }

    updateProfile(id: string, data: { name?: string | null; avatarUrl?: string | null; defaultCurrency?: string }) {
        return prisma.user.update({
            where: { id },
            data,
        });
    }

    updatePassword(id: string, hashedPassword: string) {
        return prisma.user.update({
            where: { id },
            data: { password: hashedPassword, provider: 'JWT' },
        });
    }

    upsertAuthProvider(data: {
        userId: string;
        provider: 'GOOGLE' | 'APPLE';
        providerUserId: string;
        email?: string | null;
        emailVerified: boolean;
    }) {
        return prisma.authProvider.upsert({
            where: {
                provider_providerUserId: {
                    provider: data.provider,
                    providerUserId: data.providerUserId,
                },
            },
            create: {
                userId: data.userId,
                provider: data.provider,
                providerUserId: data.providerUserId,
                email: data.email ?? null,
                emailVerified: data.emailVerified,
            },
            update: {
                userId: data.userId,
                email: data.email ?? null,
                emailVerified: data.emailVerified,
            },
        });
    }

    delete(id: string) {
        return prisma.user.delete({ where: { id } });
    }
}

export const userRepository = new UserRepository();
