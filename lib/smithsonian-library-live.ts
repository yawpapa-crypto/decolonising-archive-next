import type { SmithsonianRecordResult } from "@/lib/search/smithsonian";
import { inferSmithsonianRegion } from "@/lib/smithsonian-region";

/** Map live EDAN item to the record shape expected by `public/assets/js/app.js`. */
export function smithsonianRecordToLibraryLive(
  item: SmithsonianRecordResult,
  index = 0,
): Record<string, unknown> {
  const edanId = item.id.replace(/^smithsonian:/, "");
  const description = item.description || "";
  const summary =
    description.slice(0, 420) ||
    `${item.type} from ${item.unitCode || "Smithsonian Institution"}. CC0 metadata — confirm cultural sensitivity at source.`;
  const creator = item.creators.length
    ? item.creators.join(", ")
    : item.unitCode || "Smithsonian Institution";

  const tags = [
    item.unitCode,
    ...(item.culture || []),
    ...(item.place || []),
    ...(item.mediaTypes || []),
  ]
    .filter(Boolean)
    .slice(0, 12);

  const images = item.imageUrl
    ? [
        {
          src: item.imageUrl,
          alt: item.title,
          caption: "Image from Smithsonian Open Access (CC0)",
        },
      ]
    : [];

  const rawType =
    item.raw && typeof item.raw === "object" && "type" in item.raw
      ? String((item.raw as { type?: string }).type || "")
      : "";
  const isArchivalFindingAid =
    !item.imageUrl &&
    (item.type === "Archive record" ||
      item.type === "Collection item" ||
      /ead_/i.test(rawType));

  const metadataLines = [
    item.type,
    item.unitCode,
    item.year ? String(item.year) : "",
    ...(item.culture || []).slice(0, 2),
    ...(item.place || []).slice(0, 2),
  ].filter(Boolean);

  return {
    id: `live-smithsonian-${edanId || index}`,
    title: item.title,
    creator,
    summary,
    abstract: description,
    description: [
      description,
      item.unitCode ? `Smithsonian unit: ${item.unitCode}` : "",
      item.culture?.length ? `Culture: ${item.culture.slice(0, 4).join(", ")}` : "",
      item.place?.length ? `Place: ${item.place.slice(0, 4).join(", ")}` : "",
    ].filter(Boolean),
    type: item.type,
    cat: "Global open cultural collections",
    region: inferSmithsonianRegion({
      place: item.place,
      culture: item.culture,
      title: item.title,
      description,
      unitCode: item.unitCode,
    }),
    country: item.place?.[0] || "",
    period: item.year ? String(item.year) : "",
    tags,
    themes: (item.culture || []).slice(0, 6),
    concepts: (item.culture || []).slice(0, 6),
    keywords: tags,
    rights: "CC0 1.0 metadata · Confirm cultural/person/image sensitivity at source",
    rightsStatus: "Public Domain",
    licence: "CC0",
    accessType: "Open Access",
    reusePermission: "CC0 — confirm at source",
    culturalSensitivity: "Confirm at source",
    verificationStatus: "Rights Checked",
    provenance: "Live metadata from Smithsonian Open Access EDAN API.",
    source: "Smithsonian Open Access",
    sourceName: "Smithsonian Open Access",
    collection: "Smithsonian Open Access",
    institution: item.unitCode || "Smithsonian Institution",
    language: [],
    sourceUrl: item.url,
    sourceActionLabel: "View at Smithsonian",
    externalLinks: [
      { label: "Smithsonian Open Access", url: "https://www.si.edu/openaccess" },
      ...(item.url ? [{ label: "Object record", url: item.url }] : []),
    ],
    notes: [
      "Hosted externally by the Smithsonian Institution. Media is not stored on this archive.",
      "Metadata is CC0 1.0; still show source attribution and respect cultural/person/image sensitivity.",
      ...(isArchivalFindingAid
        ? [
            "This is an archival finding aid. Digitized photograph previews are not supplied by Smithsonian Open Access for this entry — only descriptive metadata.",
          ]
        : []),
    ],
    archiveIdentifier: edanId ? `SI-${edanId}` : "",
    recordIdentifier: edanId,
    images,
    thumbnailUrl: item.imageUrl || "",
    hasThumbnail: Boolean(item.imageUrl),
    cardVariant: item.imageUrl ? "thumbnail" : "metadata",
    metadataPreview: metadataLines.join(" · "),
    resultMode: "live",
    resultKind: "primary",
    trustScore: 0.88,
    liveSourceHint: "smithsonian",
    open_access: item.openAccess,
    is_oa: item.openAccess,
    unitCode: item.unitCode,
    mediaTypes: item.mediaTypes,
    culture: item.culture,
    place: item.place,
    relevanceScore: item.relevanceScore,
    unifiedRelevanceScore: item.relevanceScore,
  };
}
