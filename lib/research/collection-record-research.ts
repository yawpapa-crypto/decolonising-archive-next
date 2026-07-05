import type { CatalogueRecord } from "@/lib/catalogue/types";
import { GHANA_COLLECTION_TITLE } from "@/lib/data/ghana-subcollections";

export type ResearchItemType = "catalogue_record" | "library_record";

export type CollectionRecordResearchInput = {
  itemType: ResearchItemType;
  itemId: string;
  collectionSlug: string;
  collectionTitle: string;
  title: string;
  creator: string | null;
  date: string | null;
  recordType: string | null;
  institution: string | null;
  accession: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  canonicalPath: string;
};

export const GHANA_COLLECTION_SLUG = "ghana-graphic-design";

export function collectionRecordPath(collectionSlug: string, recordId: string) {
  return `/collections/${collectionSlug}/records/${encodeURIComponent(recordId)}`;
}

export function catalogueRecordDateLabel(record: CatalogueRecord): string | null {
  const raw = record.rawCsvRow;
  const display = raw?.date_display?.trim();
  if (display) return display;
  if (record.dateStart && record.dateEnd) {
    return `${record.dateStart} – ${record.dateEnd}`;
  }
  if (record.dateStart) return record.dateStart;
  return null;
}

export function catalogueRecordCreatorLabel(record: CatalogueRecord): string | null {
  const maker = record.creatorOrAuthority?.trim();
  if (maker) return maker;
  const role = record.creatorRole?.trim();
  if (role) return role;
  return null;
}

export function ghanaCatalogueResearchInput(record: CatalogueRecord): CollectionRecordResearchInput {
  const accession = record.rawCsvRow?.collection_number?.trim() || null;
  return {
    itemType: "catalogue_record",
    itemId: record.id,
    collectionSlug: GHANA_COLLECTION_SLUG,
    collectionTitle: GHANA_COLLECTION_TITLE,
    title: record.title,
    creator: catalogueRecordCreatorLabel(record),
    date: catalogueRecordDateLabel(record),
    recordType: record.recordType,
    institution: record.institutionOrCollection,
    accession,
    sourceName: record.sourceName,
    sourceUrl: record.sourceUrl,
    canonicalPath: collectionRecordPath(GHANA_COLLECTION_SLUG, record.id),
  };
}

/** Workspace API snapshot — references canonical record, does not duplicate full record */
export function buildCatalogueRecordSnapshot(
  input: CollectionRecordResearchInput,
  origin: string,
) {
  const canonicalUrl = `${origin.replace(/\/$/, "")}${input.canonicalPath}`;
  return {
    id: input.itemId,
    record_id: input.itemId,
    title: input.title,
    recordTitle: input.title,
    creator: input.creator,
    author: input.creator,
    record_author: input.creator,
    type: input.recordType,
    record_type: input.recordType,
    recordType: input.recordType,
    year: input.date,
    date: input.date,
    period: input.date,
    source: input.collectionTitle,
    collection: input.collectionTitle,
    record_source: "ARED Collection",
    publisher: input.institution || input.sourceName || "ARED",
    institution: input.institution,
    archive: input.institution,
    source_name: input.sourceName,
    source_url: input.sourceUrl,
    url: input.sourceUrl,
    record_source_url: canonicalUrl,
    recordUrl: canonicalUrl,
    href: canonicalUrl,
    recordIdentifier: input.itemId,
    archiveIdentifier: input.accession,
    metadata: {
      itemType: input.itemType,
      sourceArea: "catalogue_record",
      collectionSlug: input.collectionSlug,
      collectionTitle: input.collectionTitle,
      accession: input.accession,
      recordTypeLabel: input.recordType,
      normalizedType: "archive-record",
      sourceLabel: "ARED Collection",
    },
  };
}

export function ghanaCatalogueListSnapshot(record: Pick<
  CatalogueRecord,
  | "id"
  | "title"
  | "recordType"
  | "creatorOrAuthority"
  | "creatorRole"
  | "dateStart"
  | "dateEnd"
  | "institutionOrCollection"
  | "sourceName"
  | "sourceUrl"
  | "rawCsvRow"
>) {
  return ghanaCatalogueResearchInput(record as CatalogueRecord);
}
