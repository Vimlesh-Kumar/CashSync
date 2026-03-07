import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                splits: true,
                memberships: {
                    include: { group: true }
                },
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
};

export const syncUserIdentity = async (req: Request, res: Response) => {
    try {
        const { email, name, provider, providerId, password } = req.body;

        // Find existing by email for Identity Linking across providers
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            // Identity linked. 
            // If they are trying to login via JWT (email/password)
            if (provider === 'JWT') {
                if (!password) {
                    return res.status(400).json({ error: 'Password required' });
                }

                // If they don't have a password set (e.g. they signed up via Google originally)
                // but now they are setting a password or trying to login?
                // Let's assume if req.body.isSignUp is true, we set the password.
                if (req.body.isSignUp) {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { password: hashedPassword, provider: 'JWT' }
                    });
                } else {
                    // Logging in
                    if (!user.password) {
                        return res.status(400).json({ error: 'Please set a password or login with your provider.' });
                    }
                    const valid = await bcrypt.compare(password, user.password);
                    if (!valid) {
                        return res.status(401).json({ error: 'Invalid credentials' });
                    }
                }
            } else {
                // OAuth login, update provider info
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { provider, providerId, name: user.name || name }
                });
            }
        } else {
            // Create new user
            let hashedPassword = null;
            if (provider === 'JWT' && password) {
                hashedPassword = await bcrypt.hash(password, 10);
            }

            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    provider,
                    providerId,
                    password: hashedPassword
                }
            });
        }

        // Generate token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: '7d',
        });

        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to sync user identity' });
    }
};
