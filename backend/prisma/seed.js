import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: 'support@activibe.net' },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash('infoinfoactivibe2025', 10);
    await prisma.user.create({
      data: {
        email: 'support@activibe.net',
        password: passwordHash,
        name: 'ActiVibe Admin',
        role: 'ADMIN',
      },
    });
    console.log('Admin user created: support@activibe.net / infoinfoactivibe2025');
  } else {
    console.log('Admin user already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
