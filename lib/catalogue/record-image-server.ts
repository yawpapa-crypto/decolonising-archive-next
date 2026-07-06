import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { CatalogueRecord } from "./types";
import {
  EDITORIAL_IMAGE_OVERRIDES,
  type RecordImageInfo,
} from "./record-display";

const MET_CACHE = join(process.cwd(), "data", "catalogue", "cache", "met");

function metObjectIdFromRecord(record: CatalogueRecord): number | null {
  const cn = record.rawCsvRow?.collection_number ?? "";
  const metMatch = cn.match(/Met\s+(\d+)/i);
  if (metMatch) return parseInt(metMatch[1], 10);
  const url = record.sourceUrl ?? "";
  const urlMatch = url.match(/metmuseum\.org\/art\/collection\/search\/(\d+)/i);
  if (urlMatch) return parseInt(urlMatch[1], 10);
  return null;
}

function rightsAllowDisplay(record: CatalogueRecord): boolean {
  const r = (record.rightsStatus ?? "").toLowerCase();
  const note = (record.rightsNote ?? "").toLowerCase();
  if (r.includes("public domain") || r.includes("cc0") || r.includes("open access")) return true;
  if (note.includes("open access") || note.includes("cc0")) return true;
  if (r === "metadata_only" || r.includes("linked_record")) return false;
  if (r.includes("copyrighted") || r.includes("permission")) return false;
  return false;
}

function loadMetImage(objectId: number): string | null {
  const path = join(MET_CACHE, `${objectId}.json`);
  if (!existsSync(path)) return null;
  try {
    const obj = JSON.parse(readFileSync(path, "utf8")) as {
      isPublicDomain?: boolean;
      primaryImageSmall?: string;
      primaryImage?: string;
    };
    if (!obj.isPublicDomain) return null;
    return obj.primaryImageSmall || obj.primaryImage || null;
  } catch {
    return null;
  }
}

function clevelandImageUrl(record: CatalogueRecord): string | null {
  if (!(record.rightsStatus ?? "").includes("CC0")) return null;
  const acc = record.rawCsvRow?.collection_number;
  if (!acc || acc.startsWith("Met")) return null;
  const id = record.sourceUrl?.match(/clevelandart\.org\/art\/(\d+)/)?.[1];
  if (!id) return null;
  return `https://openaccess-cdn.clevelandart.org/${Math.floor(parseInt(id, 10) / 1000)}/${id}.jpg`;
}

/** Server-only: resolve displayable image from Met cache / editorial overrides */
export function resolveServerRecordImage(record: CatalogueRecord): RecordImageInfo {
  const sourceUrl = record.sourceUrl;
  const alt = record.title;

  if (EDITORIAL_IMAGE_OVERRIDES[record.id]) {
    return {
      access: "display",
      url: EDITORIAL_IMAGE_OVERRIDES[record.id],
      alt,
      sourceUrl,
      label: null,
    };
  }

  const metId = metObjectIdFromRecord(record);
  if (metId && rightsAllowDisplay(record)) {
    const url = loadMetImage(metId);
    if (url) {
      return { access: "display", url, alt, sourceUrl, label: null };
    }
  }

  const cleUrl = clevelandImageUrl(record);
  if (cleUrl) {
    return { access: "display", url: cleUrl, alt, sourceUrl, label: null };
  }

  if (sourceUrl && (record.rightsStatus ?? "").includes("linked")) {
    return {
      access: "source_only",
      url: null,
      alt,
      sourceUrl,
      label: "IMAGE HELD BY SOURCE INSTITUTION",
    };
  }

  if (record.sourceUrl && !rightsAllowDisplay(record) && record.evidenceStatus === "verified") {
    return {
      access: "source_only",
      url: null,
      alt,
      sourceUrl: record.sourceUrl,
      label: "IMAGE HELD BY SOURCE INSTITUTION",
    };
  }

  return { access: "none", url: null, alt, sourceUrl, label: null };
}
