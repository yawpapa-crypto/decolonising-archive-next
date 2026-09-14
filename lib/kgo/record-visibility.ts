import type { ArchiveRecord } from "@/lib/archive-metadata";

export function isPublicRecordRouteRecord(
  record: ArchiveRecord | null | undefined,
): record is ArchiveRecord {
  return record?.published === true;
}
