import {
  AODL_COLLECTIONS,
  type ExternalArchiveCollection,
} from "@/lib/data/aodl-collections";
import { scoreSearchResult } from "@/lib/search/ranking";
import type { UnifiedSearchResult } from "@/lib/unified-search";

export type SearchAodlOptions = {
  limit?: number;
};

function inferRegion(countries: string[]): string {
  if (countries.includes("Pan-Africa")) return "Pan-Africa";
  if (countries.length === 1) return countries[0];
  return countries.slice(0, 2).join(" / ");
}

export function mapAodlCollectionToUnifiedResult(
  collection: ExternalArchiveCollection,
  relevanceScore: number,
): UnifiedSearchResult {
  return {
    id: `aodl:${collection.id}`,
    source: "aodl",
    sourceLabel: "AODL",
    resultKind: "collection",
    type: collection.type,
    title: collection.title,
    description: collection.description,
    url: collection.url,
    subtitle: collection.platform,
    authors: [collection.platform],
    abstract: collection.description,
    relevanceScore,
    unifiedRelevanceScore: relevanceScore,
    raw: collection,
  };
}

/** JSON-safe archive card fields for the library SPA. */
export function mapAodlCollectionToClientPayload(
  collection: ExternalArchiveCollection,
  relevanceScore: number,
): Record<string, unknown> {
  const region = inferRegion(collection.countries);
  const tagPool = [
    ...collection.themes,
    ...collection.keywords,
    ...collection.mediaTypes,
    ...collection.countries,
  ];

  return {
    id: `aodl:${collection.id}`,
    title: collection.title,
    creator: collection.platform,
    summary: collection.description,
    abstract: collection.description,
    description: [collection.description],
    type: collection.type,
    cat: "African open collections",
    region,
    country: collection.countries[0] || "",
    countries: collection.countries,
    collection: "AODL African Archive Collections",
    institution: "AODL",
    source: "AODL",
    sourceName: "External Source · AODL",
    sourceUrl: collection.url,
    sourceActionLabel: "Open collection",
    sourceCategoryGroup: "african_open_collections",
    resultMode: "external_handoff",
    resultKind: "collection",
    liveSourceHint: "aodl",
    trustScore: 0.85,
    tags: tagPool.slice(0, 12),
    themes: collection.themes,
    keywords: collection.keywords,
    concepts: collection.themes.slice(0, 6),
    language: collection.languages,
    mediaTypes: collection.mediaTypes,
    accessLabel: "External open collection",
    access: "External open collection",
    rights: "External source rights apply · Hosted by AODL",
    rightsLabel: "External hosting",
    notes: [
      "Hosted externally by AODL or a partner project. Media is not stored on this archive.",
      "Open the collection on AODL to view recordings, images, and documents.",
    ],
    relevanceScore,
    unifiedRelevanceScore: relevanceScore,
    externalHostingDisclaimer: "Hosted externally by AODL or partner project",
  };
}

export function searchAodlCollections(
  query: string,
  options: SearchAodlOptions = {},
): { results: UnifiedSearchResult[]; clientResults: Record<string, unknown>[] } {
  const normalized = String(query || "").trim();
  const limit = Math.max(1, Math.min(options.limit ?? 12, AODL_COLLECTIONS.length));

  const scored = AODL_COLLECTIONS.map((collection) => {
    const rankInput = {
      id: `aodl:${collection.id}`,
      title: collection.title,
      summary: collection.description,
      abstract: collection.description,
      description: collection.description,
      tags: [...collection.themes, ...collection.keywords, ...collection.mediaTypes],
      keywords: collection.keywords,
      themes: collection.themes,
      concepts: collection.themes,
      countries: collection.countries,
      country: collection.countries[0],
      region: inferRegion(collection.countries),
      language: collection.languages,
      source: "AODL",
      institution: "AODL",
      collection: "AODL African Archive Collections",
      type: collection.type,
      cat: "African open collections",
      sourceCategoryGroup: "african_open_collections",
      resultKind: "collection" as const,
      liveSourceHint: "aodl",
      resultMode: "external_handoff",
    };

    const relevanceScore = normalized
      ? scoreSearchResult(rankInput, normalized, { sourceKey: "aodl" })
      : 1;

    return { collection, relevanceScore };
  })
    .filter(({ relevanceScore }) => (normalized ? relevanceScore > 0 : true))
    .sort(
      (a, b) =>
        b.relevanceScore - a.relevanceScore ||
        a.collection.title.localeCompare(b.collection.title),
    )
    .slice(0, limit);

  return {
    results: scored.map(({ collection, relevanceScore }) =>
      mapAodlCollectionToUnifiedResult(collection, relevanceScore),
    ),
    clientResults: scored.map(({ collection, relevanceScore }) =>
      mapAodlCollectionToClientPayload(collection, relevanceScore),
    ),
  };
}

export function listAllAodlClientPayloads(): Record<string, unknown>[] {
  return AODL_COLLECTIONS.map((collection) =>
    mapAodlCollectionToClientPayload(collection, 0),
  );
}
