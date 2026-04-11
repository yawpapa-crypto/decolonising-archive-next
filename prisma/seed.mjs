import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.record.deleteMany();

  await prisma.record.createMany({
    data: [
      {
        title: "Decolonising Design in Africa",
        summary: "A foundational text on decolonial design thinking in African contexts.",
        description: "Sample archive record for database-backed archive testing.",
        recordType: "Book",
        creator: "Dr Yaw Ofosu-Asare",
        source: "Local archive seed",
        sourceUrl: "https://yofosuasare.com",
        country: "Ghana",
        region: "West Africa",
        language: "English",
        tags: ["design", "decolonisation", "africa"]
      },
      {
        title: "African Design Futures",
        summary: "A record focused on futures, pedagogy, and African design thought.",
        description: "Sample second record for database-backed testing.",
        recordType: "Book",
        creator: "Dr Yaw Ofosu-Asare",
        source: "Local archive seed",
        sourceUrl: "https://yofosuasare.com",
        country: "Ghana",
        region: "West Africa",
        language: "English",
        tags: ["african futures", "design", "pedagogy"]
      },
      {
        title: "Ashanti Textile Knowledge Pathways",
        summary: "Textile record exploring cultural memory and material practice.",
        description: "Sample archive textile-related record.",
        recordType: "Textile / Cultural Record",
        creator: "Archive Test Data",
        source: "Local archive seed",
        sourceUrl: "https://yofosuasare.com",
        country: "Ghana",
        region: "West Africa",
        language: "English",
        tags: ["textiles", "ashanti", "material culture"]
      },
      {
        title: "Liberation Posters and Visual Resistance",
        summary: "Poster-related record focused on anti-colonial visual communication.",
        description: "Sample archive poster-related record.",
        recordType: "Poster / Visual Culture",
        creator: "Archive Test Data",
        source: "Local archive seed",
        sourceUrl: "https://yofosuasare.com",
        country: "South Africa",
        region: "Southern Africa",
        language: "English",
        tags: ["posters", "resistance", "visual culture"]
      },
      {
        title: "Oral Histories of Decolonising Knowledge",
        summary: "Record exploring oral archives and community-held memory.",
        description: "Sample oral history record.",
        recordType: "Oral History",
        creator: "Archive Test Data",
        source: "Local archive seed",
        sourceUrl: "https://yofosuasare.com",
        country: "Kenya",
        region: "East Africa",
        language: "English",
        tags: ["oral history", "memory", "community archive"]
      }
    ]
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
