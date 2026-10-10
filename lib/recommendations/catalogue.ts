import "server-only";
import visualInventory from "@/data/catalogue/recommendation-visuals.json";
import { loadCatalogueRecords } from "@/lib/catalogue/store";
import type { CatalogueRecord } from "@/lib/catalogue/types";
import {
  resolveServerRecordImage,
  resolveServerRecordAspectRatio,
  resolveServerRecordVisuals,
} from "@/lib/catalogue/record-image-server";
import type { DiscoverItem } from "@/lib/home/discover-shared";
import { type Features, type Candidate, normalise, textTerms } from "./engine";
export function allowed(r: CatalogueRecord) {
  return r.publicVisibility && !r.communityAuthorityRequired;
}
export function recordFeatures(r: CatalogueRecord): Features {
  const fields: Record<string, string | null> = {
    region: r.region,
    period: r.periodLabel,
    visualSystem: r.visualSystemLabel,
    type: r.recordType,
    source: r.sourceName,
    creator: r.creatorOrAuthority,
    material: r.mediumOrFormat,
    community: r.communityOrCulture,
  };
  return {
    ...Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, v ? [v] : []]),
    ),
    concept: r.tags.filter(Boolean),
    text: textTerms(`${r.title} ${r.tags.join(" ")}`),
  };
}
export function catalogueCandidates() {
  // Local Ghana catalogue records are withdrawn from feeds; see discover.ts.
  if (process.env.ARED_LOCAL_RECORDS !== "1") return [] as ReturnType<typeof catalogueCandidatesAll>;
  return catalogueCandidatesAll();
}
function catalogueCandidatesAll() {
  return loadCatalogueRecords()
    .filter(allowed)
    .map(
      (r) =>
        ({
          id: r.id,
          features: recordFeatures(r),
          public: true,
          candidateSource: "catalogue",
          editorial: true,
          visualAvailable: visualInventory.includes(r.id),
        }) satisfies Candidate,
    );
}
/** External metadata stays literal: matching a vocabulary label requires it in source-supplied text. */
export function literalFeatures(
  item: Pick<
    DiscoverItem,
    "title" | "abstract" | "source" | "venue" | "kind" | "authors"
  >,
): Features {
  const text = normalise(`${item.title} ${item.abstract || ""}`);
  const vocabulary = new Map<string, Set<string>>();
  for (const c of catalogueCandidates())
    for (const [dim, values] of Object.entries(c.features)) {
      if (["source", "creator", "type"].includes(dim)) continue;
      if (!vocabulary.has(dim)) vocabulary.set(dim, new Set());
      for (const v of values) if (v.length > 3) vocabulary.get(dim)!.add(v);
    }
  return {
    ...Object.fromEntries(
      [...vocabulary].map(([dim, values]) => [
        dim,
        [...values].filter((v) => text.includes(normalise(v))),
      ]),
    ),
    text: textTerms(`${item.title} ${item.abstract || ""}`),
    type: [item.kind],
    source: [item.source || item.venue || ""].filter(Boolean),
    creator: [item.authors || ""].filter(Boolean),
  };
}
export function hydrate(r: CatalogueRecord): DiscoverItem {
  const image = resolveServerRecordImage(r);
  return {
    id: r.id,
    title: r.title,
    kind: r.recordType === "publication" ? "essay" : "object",
    href: r.sourceUrl && /^https?:\/\//.test(r.sourceUrl) ? r.sourceUrl : `/home-next/explore?record=${encodeURIComponent(r.id)}`,
    external: Boolean(r.sourceUrl && /^https?:\/\//.test(r.sourceUrl)),
    collectionSlug: "ghana-graphic-design",
    source: r.sourceName || undefined,
    authors: r.creatorOrAuthority || undefined,
    year: r.dateStart || undefined,
    image: image.access === "display" ? image.url || undefined : undefined,
    ar: resolveServerRecordAspectRatio(r),
    visuals: resolveServerRecordVisuals(r),
    alt: r.title,
  };
}
