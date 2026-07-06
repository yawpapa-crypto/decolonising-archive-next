/** Shared search page sizes — library + workbench. */
export const SEARCH_DEFAULT_PAGE_SIZE = 25;
export const SEARCH_MAX_PAGE_SIZE = 50;
export const SEARCH_PREVIEW_PAGE_SIZE = 8;

export type SearchSourceResponse<T> = {
  source: string;
  query: string;
  count: number | null;
  displayedCount: number;
  nextCursor: string | null;
  nextOffset: number | null;
  results: T[];
  error: string | null;
};

export function clampPageSize(value: number | undefined, fallback = SEARCH_DEFAULT_PAGE_SIZE) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.max(Math.floor(n), 1), SEARCH_MAX_PAGE_SIZE);
}
