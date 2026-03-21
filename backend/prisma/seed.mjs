/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const databaseUrl = "postgresql://postgres:postgrespassword@localhost:5433/cashsync?schema=public";
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run seed.');
}

const pool = new Pool({
  connectionString: databaseUrl,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const SALT_ROUNDS = 10;

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#F97316' },
  { name: 'Shopping', icon: '🛍️', color: '#A855F7' },
  { name: 'Transport', icon: '🚕', color: '#14B8A6' },
  { name: 'Bills', icon: '⚡', color: '#F59E0B' },
  { name: 'Entertainment', icon: '🎬', color: '#6366F1' },
  { name: 'Travel', icon: '✈️', color: '#0EA5E9' },
  { name: 'Salary', icon: '💼', color: '#22C55E' },
  { name: 'Investment', icon: '📈', color: '#10B981' },
  { name: 'Other', icon: '💸', color: '#64748B' },
];

function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

async function seed() {
  console.log('Clearing database...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users", "groups", "transactions", "categories", "budgets" CASCADE;`);
  
  console.log('Database cleared. Seeding new data...');
  
  const newUsers = [];
  
  for (let i = 1; i <= 5; i++) {
    const passwordHash = await bcrypt.hash(`User@${i}`, SALT_ROUNDS);
    
    const user = await prisma.user.create({
      data: {
        email: `user${i}@test.com`,
        name: `User ${i}`,
        provider: 'JWT',
        password: passwordHash,
      },
    });
    newUsers.push(user);

    for (const category of DEFAULT_CATEGORIES) {
      await prisma.category.create({
        data: {
          userId: user.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          isDefault: true,
        },
      });
    }
  }

  const group = await prisma.group.create({
    data: {
      name: 'Test Group',
      description: 'Test shared expenses group',
      emoji: '🏠',
    },
  });

  for (let i = 0; i < newUsers.length; i++) {
    await prisma.groupMember.create({
      data: {
        userId: newUsers[i].id,
        groupId: group.id,
        role: i === 0 ? 'ADMIN' : 'MEMBER',
      },
    });
  }

  console.log('✅ Seed complete. Created 5 users (user1@test.com - user5@test.com) & Test Group.');
}

try {
  await seed();
} catch (err) {
  console.error('❌ Seed failed', err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
