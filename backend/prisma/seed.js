/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgrespassword@localhost:5433/cashsync?schema=public',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@cashsync.app' },
    update: { name: 'CashSync Demo', provider: 'JWT' },
    create: {
      email: 'demo@cashsync.app',
      name: 'CashSync Demo',
      provider: 'JWT',
      password: '$2b$10$Y9zQ3SS4Q9x36Xkf0N.VEu7YwTocPbLGV4rf39kg8Z65dBnwM0KGO', // demo123
    },
  });

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: {
        userId_name: {
          userId: demoUser.id,
          name: category.name,
        },
      },
      update: {
        icon: category.icon,
        color: category.color,
        isDefault: true,
      },
      create: {
        userId: demoUser.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        isDefault: true,
      },
    });
  }

  const foodCategory = await prisma.category.findUnique({
    where: {
      userId_name: {
        userId: demoUser.id,
        name: 'Food',
      },
    },
  });

  if (foodCategory) {
    const existingBudget = await prisma.budget.findFirst({
      where: {
        userId: demoUser.id,
        name: 'Food Budget',
        monthStart: monthStart(),
      },
    });

    if (!existingBudget) {
      await prisma.budget.create({
        data: {
          userId: demoUser.id,
          categoryId: foodCategory.id,
          name: 'Food Budget',
          amount: 5000,
          currency: 'INR',
          monthStart: monthStart(),
        },
      });
    }
  }

  let group = await prisma.group.findFirst({
    where: { name: 'Demo Housemates' },
  });

  if (!group) {
    group = await prisma.group.create({
      data: {
        name: 'Demo Housemates',
        description: 'Sample shared expenses group',
        emoji: '🏠',
      },
    });
  }

  await prisma.groupMember.upsert({
    where: {
      userId_groupId: {
        userId: demoUser.id,
        groupId: group.id,
      },
    },
    update: { role: 'ADMIN' },
    create: {
      userId: demoUser.id,
      groupId: group.id,
      role: 'ADMIN',
    },
  });

  const txExists = await prisma.transaction.findFirst({
    where: {
      authorId: demoUser.id,
      title: 'Swiggy Order',
    },
  });

  if (!txExists) {
    await prisma.transaction.create({
      data: {
        title: 'Swiggy Order',
        originalTitle: 'SWIGGY*BANGALORE',
        amount: 540,
        type: 'EXPENSE',
        category: 'Food',
        categoryId: foodCategory ? foodCategory.id : null,
        source: 'MANUAL',
        isPersonal: false,
        authorId: demoUser.id,
        groupId: group.id,
        hash: `seed-${demoUser.id}-swiggy`,
      },
    });
  }

  console.log('✅ Seed complete. Demo user: demo@cashsync.app / demo123');
}

seed()
  .catch((err) => {
    console.error('❌ Seed failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
