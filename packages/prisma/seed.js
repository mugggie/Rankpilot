const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.tier.createMany({
    data: [
      { name: 'Free', auditLimit: 5, tokenLimit: 10000, price: 0 },
      { name: 'Starter', auditLimit: 50, tokenLimit: 100000, price: 20 },
      { name: 'Pro', auditLimit: 200, tokenLimit: 500000, price: 45 },
      { name: 'Enterprise', auditLimit: 1000, tokenLimit: 5000000, price: 100 }
    ],
    skipDuplicates: true
  });
  console.log('Tiers seeded!');

  // Seed an admin user
  await prisma.user.upsert({
    where: { email: 'admin@rankpilot.com' },
    update: {},
    create: {
      email: 'admin@rankpilot.com',
      name: 'Admin',
      tierId: (await prisma.tier.findFirst({ where: { name: 'Enterprise' } })).id,
      isAdmin: true,
    },
  });
  console.log('Admin user seeded!');
}

main().finally(() => prisma.$disconnect());