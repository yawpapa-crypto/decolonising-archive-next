-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "abstract" TEXT,
ADD COLUMN     "archiveIdentifier" TEXT,
ADD COLUMN     "citation" TEXT,
ADD COLUMN     "collection" TEXT,
ADD COLUMN     "contributors" TEXT[],
ADD COLUMN     "externalLinks" TEXT[],
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "provenance" TEXT,
ADD COLUMN     "recordIdentifier" TEXT,
ADD COLUMN     "relatedRecords" TEXT[],
ADD COLUMN     "rights" TEXT;
