import type { ScholarlySearchResult } from "@/lib/scholarly-search";

/** Normalized search result for unified library / workbench streams. */
export type UnifiedSearchSource =
  | "archive"
  | "openalex"
  | "core"
  | "crossref"
  | "semantic-scholar"
  | "wikidata"
  | "openaccess"
  | "aodl"
  | "smithsonian"
  | "library-of-congress"
  | "handoff"
  | "external"
  | "archival-external";

export type UnifiedSearchResult = {
  id: string;
  source: UnifiedSearchSource;
  sourceLabel: string;
  title: string;
  subtitle?: string;
  authors?: string[];
  year?: number | string;
  type?: string;
  url?: string;
  doi?: string;
  openAccessUrl?: string;
  abstract?: string;
  description?: string;
  imageUrl?: string;
  citedByCount?: number;
  relevanceScore?: number;
  unifiedRelevanceScore?: number;
  resultKind?: "primary" | "entity" | "handoff" | "collection";
  isInternal?: boolean;
  alternateSources?: string[];
  raw?: unknown;
};

export type MergeAndRankInput = {
  query: string;
  internalResults: unknown[];
  openAlexResults?: ScholarlySearchResult[];
  coreResults?: ScholarlySearchResult[];
  crossrefResults?: ScholarlySearchResult[];
  includeHandoffs?: boolean;
};

export type SourcePaginationSource =
  | "archive"
  | "openalex"
  | "core"
  | "crossref"
  | "semantic-scholar"
  | "trove"
  | "wikidata"
  | "smithsonian"
  | "library-of-congress"
  | "openaccess"
  | "previews";

export type SourcePaginationState = {
  source: SourcePaginationSource;
  label: string;
  hasMore: boolean;
  loading: boolean;
  error?: string | null;
  cursor?: string | null;
  offset?: number;
  page?: number;
  total?: number | null;
  loadedCount: number;
  connected?: boolean;
};

export type UnifiedSearchResponse = {
  results: UnifiedSearchResult[];
  sourceStates: SourcePaginationState[];
  totalKnownResults: number | null;
};

export {
  scoreSearchResult,
  compareRankedResults,
  getCitationCount,
  getRecordYear,
  getResultKind,
  getResultRankGroup,
  type UnifiedSortMode,
  type SearchResultKind,
} from "@/lib/search/ranking";
