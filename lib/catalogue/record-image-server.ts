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
  const id = record.sourceUrl?.match(/clevelandart\.org\/art\/([\d.]+)/)?.[1];
  if (!id) return null;
  // Canonical image paths come from the museum's API cache, never guessed from IDs.
  const cache = join(process.cwd(), "data", "catalogue", "cache", "cleveland", `${id}.json`);
  if (!existsSync(cache)) return null;
  try {
    const data = JSON.parse(readFileSync(cache, "utf8")) as { url?: string; license?: string };
    return data.license === "CC0" && data.url?.startsWith("https://openaccess-cdn.clevelandart.org/") ? data.url : null;
  } catch { return null; }
}

/** Server-only: resolve displayable image from Met cache / editorial overrides */
export function resolveServerRecordImage(record: CatalogueRecord): RecordImageInfo {
  const sourceUrl = record.sourceUrl;
  const alt = record.title;
  if (!record.publicVisibility || record.communityAuthorityRequired) {
    return { access: "source_only", url: null, alt, sourceUrl, label: "Public image access is not authorised" };
  }

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

/** Museum-reported proportions from the offline cache keep public masonry stable. */
export function resolveServerRecordAspectRatio(record: CatalogueRecord): number | undefined {
  if (!record.sourceUrl?.includes("clevelandart.org/art/")) return undefined;
  const accession = record.sourceUrl.match(/art\/([\d.]+)/)?.[1];
  if (!accession) return undefined;
  try {
    const data = JSON.parse(readFileSync(join(process.cwd(), "data", "catalogue", "cache", "cleveland", `${accession}.json`), "utf8")) as { ar?: number };
    return typeof data.ar === "number" && Number.isFinite(data.ar) && data.ar > 0 ? data.ar : undefined;
  } catch { return undefined; }
}

/**
 * Every legitimate image for a record, with provenance: the source's primary first, then its
 * additional images. The feed picks among them per context (see lib/visual/select.ts).
 */
export function resolveServerRecordVisuals(record: CatalogueRecord): import("@/lib/visual/select").VisualOption[] {
  const primary = resolveServerRecordImage(record);
  if (primary.access !== "display" || !primary.url) return [];
  const out: import("@/lib/visual/select").VisualOption[] = [{
    url: primary.url,
    curated: Boolean(EDITORIAL_IMAGE_OVERRIDES[record.id]),
    sourcePrimary: true,
    provenance: { provider: record.sourceName || "ARED catalogue", sourceUrl: record.sourceUrl ?? undefined, imageUrl: primary.url, providerId: record.id, licence: record.rightsStatus ?? undefined, confidence: 1, method: EDITORIAL_IMAGE_OVERRIDES[record.id] ? "editorial-override" : "source-cache" },
  }];
  const metId = metObjectIdFromRecord(record);
  if (metId && rightsAllowDisplay(record)) {
    try {
      const obj = JSON.parse(readFileSync(join(MET_CACHE, `${metId}.json`), "utf8")) as { isPublicDomain?: boolean; additionalImages?: string[] };
      if (obj.isPublicDomain) for (const url of obj.additionalImages ?? []) if (url && url !== primary.url) out.push({ url, provenance: { provider: "The Metropolitan Museum of Art", sourceUrl: record.sourceUrl ?? undefined, imageUrl: url, providerId: String(metId), licence: "CC0 / public domain", confidence: 0.95, method: "museum-additional-image" } });
    } catch { /* no cached additional images */ }
  }
  return out;
}
