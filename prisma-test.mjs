import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const records = await prisma.record.findMany();
  console.log(records);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
