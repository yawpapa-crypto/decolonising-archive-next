import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.record.create({
    data: {
      title: "Decolonising Design in Africa",
      summary: "Sample archive record inserted through Prisma.",
      description: "This is a starter test record for the new Prisma-backed archive.",
      recordType: "Book",
      creator: "Dr Yaw Ofosu-Asare",
      source: "Local archive seed",
      sourceUrl: "https://yofosuasare.com",
      country: "Ghana",
      region: "West Africa",
      language: "English",
      tags: ["design", "decolonisation", "africa"]
    }
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
