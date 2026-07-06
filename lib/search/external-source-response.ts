export type ExternalSourceResult = {
  id: string;
  source: string;
  title: string;
  creator?: string;
  date?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
};

export type ExternalSourceSearchError = {
  code: string;
  message: string;
  status?: number;
};

export type ExternalSourceSearchResponse = {
  source: string;
  ok: boolean;
  results: ExternalSourceResult[];
  count: number;
  displayedCount?: number;
  nextOffset?: number | null;
  nextCursor?: string | null;
  hasMore?: boolean;
  durationMs?: number;
  retryAttempted?: boolean;
  endpointLabel?: string;
  error?: ExternalSourceSearchError;
};

export function emptyExternalSearchResponse(
  source: string,
): ExternalSourceSearchResponse {
  return {
    source,
    ok: true,
    results: [],
    count: 0,
    displayedCount: 0,
    nextOffset: null,
    hasMore: false,
  };
}

export function failedExternalSearchResponse(
  source: string,
  error: ExternalSourceSearchError,
  extra: Partial<ExternalSourceSearchResponse> = {},
): ExternalSourceSearchResponse {
  return {
    source,
    ok: false,
    results: [],
    count: 0,
    displayedCount: 0,
    nextOffset: null,
    hasMore: false,
    error,
    ...extra,
  };
}
