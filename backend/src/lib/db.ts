// Load .env before anything else so DATABASE_URL is available for the pool
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { createClient } from 'redis';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

// ─── Redis client ─────────────────────────────────────────────────────────────
export const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

redis.on('error', (err: Error) => {
    // Log but don't crash — app still works without Redis cache
    console.error('[Redis] connection error', err.message);
});

// Connect lazily — first call to redis.get/set will trigger connect
let redisConnected = false;
export async function ensureRedis() {
    if (!redisConnected) {
        await redis.connect();
        redisConnected = true;
    }
}
