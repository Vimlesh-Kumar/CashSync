import { prisma } from '../../lib/db';

// ─── User Repository ──────────────────────────────────────────────────────────
// Only place in the user feature that touches Prisma.

export class UserRepository {

    /**
     * Find all users
     * @returns All users
     */
    findAll() {
        return prisma.user.findMany({
            include: {
                authProviders: true,
            },
        });
    }

    /**
     * Find a user by email
     * @param email - The email of the user
     * @returns The user
     */
    findByEmail(email: string) {
        return prisma.user.findUnique({ where: { email } });
    }

    /**
     * Find a user by phone
     * @param phone - The phone of the user
     * @returns The user
     */
    findByPhone(phone: string) {
        return prisma.user.findUnique({ where: { phone } });
    }

    /**
     * Find a user by ID
     * @param id - The ID of the user
     * @returns The user
     */
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

    /**
     * Search users by query
     * @param query - The query to search for
     * @param options - Options for the search
     * @returns The users that match the query
     */
    async search(query: string, options?: { excludeGroupId?: string; limit?: number }) {
        const trimmedQuery = query.trim();
        const normalizedPhoneQuery = trimmedQuery.replace(/[^\d+]/g, '');
        const nameParts = trimmedQuery
            .split(/\s+/)
            .map((part) => part.trim())
            .filter(Boolean);
        const [firstNameQuery, lastNameQuery] = nameParts;
        const orFilters: any[] = [
            { email: { contains: trimmedQuery, mode: 'insensitive' } },
            { name: { contains: trimmedQuery, mode: 'insensitive' } },
        ];

        if (normalizedPhoneQuery) {
            orFilters.push({ phone: { contains: normalizedPhoneQuery, mode: 'insensitive' } });
        }

        if (firstNameQuery) {
            orFilters.push({ name: { startsWith: firstNameQuery, mode: 'insensitive' } });
        }

        if (lastNameQuery) {
            orFilters.push({ name: { contains: ` ${lastNameQuery}`, mode: 'insensitive' } });
        }

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    options?.excludeGroupId
                        ? {
                            memberships: {
                                none: {
                                    groupId: options.excludeGroupId,
                                },
                            },
                        }
                        : {},
                    { OR: orFilters },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
            },
            take: options?.limit ?? 8,
            orderBy: [
                { name: 'asc' },
                { email: 'asc' },
            ],
        });

        return users;
    }

    /**
     * Find a user by auth provider
     * @param provider - The auth provider
     * @param providerUserId - The auth provider user ID
     * @returns The user
     */
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

    /**
     * Create a new user
     * @param data - The data of the user to be created
     * @returns The created user
     */
    create(data: {
        email: string;
        phone?: string | null;
        name?: string | null;
        provider: string;
        providerId?: string | null;
        password?: string | null;
        defaultCurrency?: string;
    }) {
        return prisma.user.create({ data });
    }

    /**
     * Update a user's OAuth information
     * @param id - The ID of the user
     * @param data - The OAuth information to update
     * @returns The updated user
     */
    updateOAuth(id: string, data: { provider: string; providerId?: string | null; name?: string | null }) {
        return prisma.user.update({ where: { id }, data });
    }

    /**
     * Update a user's profile
     * @param id - The ID of the user
     * @param data - The profile information to update
     * @returns The updated user
     */
    updateProfile(id: string, data: { name?: string | null; avatarUrl?: string | null; phone?: string | null; defaultCurrency?: string }) {
        return prisma.user.update({
            where: { id },
            data,
        });
    }

    /**
     * Update a user's password
     * @param id - The ID of the user
     * @param hashedPassword - The hashed password
     * @returns The updated user
     */
    updatePassword(id: string, hashedPassword: string) {
        return prisma.user.update({
            where: { id },
            data: { password: hashedPassword, provider: 'JWT' },
        });
    }

    /**
     * Upsert an auth provider
     * @param data - The auth provider information
     * @returns The upserted auth provider
     */
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

    /**
     * Delete a user
     * @param id - The ID of the user
     * @returns The deleted user
     */
    delete(id: string) {
        return prisma.user.delete({ where: { id } });
    }
}

export const userRepository = new UserRepository();
