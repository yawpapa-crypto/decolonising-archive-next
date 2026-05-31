type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 200;

export const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;

export function searchCacheKey(source: string, query: string, extras: Record<string, string | number> = {}) {
  const parts = Object.entries(extras)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`);
  return `${source}:${query.trim().toLowerCase()}${parts.length ? `:${parts.join("&")}` : ""}`;
}

export function getCachedSearch<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedSearch(key: string, value: unknown, ttlMs = SEARCH_CACHE_TTL_MS) {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, { expiresAt: Date.now() + ttlMs, value });
}
