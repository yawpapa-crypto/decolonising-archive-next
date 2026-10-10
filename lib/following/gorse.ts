import "server-only";
/**
 * Optional Gorse bridge. Gorse is classical recommendation (collaborative filtering, item neighbours, popularity).
 * Nothing here calls an LLM or a paid API. Everything is best effort: no GORSE_URL, a slow server, an error or
 * a malformed answer all return an empty list, and the native ranker carries on unchanged.
 * Gorse can only suggest event ids. The caller keeps only ids it has already proven the viewer may see.
 */
const TIMEOUT_MS = 600;
const BREAK_MS = 30_000;
let brokenUntil = 0;

const cfg = () => {
  const url = process.env.GORSE_URL?.replace(/\/$/, "");
  return url ? { url, key: process.env.GORSE_API_KEY ?? "" } : null;
};
export const gorseEnabled = () => Boolean(cfg());

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const c = cfg();
  if (!c || Date.now() < brokenUntil) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(c.url + path, { ...init, signal: ctl.signal, cache: "no-store", headers: { "content-type": "application/json", "X-API-Key": c.key, ...(init?.headers ?? {}) } });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } catch {
    brokenUntil = Date.now() + BREAK_MS; // circuit breaker: stop asking for a while
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Event ids Gorse would recommend, best first. Always resolves; empty when Gorse is off or failing. */
export async function gorseCandidates(userId: string, n = 40): Promise<string[]> {
  try {
    const out = await call(`/api/recommend/${encodeURIComponent(userId)}?n=${n}`);
    return Array.isArray(out) ? out.filter((x): x is string => typeof x === "string").slice(0, n) : [];
  } catch {
    return [];
  }
}

/** Positive or read feedback. Fire and forget; failures are ignored. */
export function gorseFeedback(type: "follow" | "open" | "save" | "more" | "seen", userId: string, itemId: string) {
  if (!cfg()) return;
  void call("/api/feedback", { method: "POST", body: JSON.stringify([{ FeedbackType: type, UserId: userId, ItemId: itemId, Timestamp: new Date().toISOString() }]) });
}

/** Register events as items (public metadata only: id, categories). Never sends titles of private records. */
export function gorseItems(items: { id: string; categories: string[]; at: string }[]) {
  if (!cfg() || !items.length) return;
  void call("/api/items", { method: "POST", body: JSON.stringify(items.map((i) => ({ ItemId: i.id, IsHidden: false, Categories: i.categories, Timestamp: i.at, Labels: [], Comment: "" }))) });
}
