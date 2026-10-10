/** Keeps a visitor's intended Save through sign-up. Held in the browser and, for other-browser email confirmation, carried in the return URL. */
export type PendingItem = { id: string; title?: string; source?: string; kind?: string; href?: string; image?: string; year?: string };
const KEY = "ared:pending-save";
const PARAM = "ared_save";
const compact = (i: PendingItem): PendingItem => ({ id: String(i.id).slice(0, 200), title: i.title?.slice(0, 200), source: i.source?.slice(0, 120), kind: i.kind?.slice(0, 40), href: i.href?.slice(0, 300), year: i.year?.slice(0, 12) });
const enc = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const dec = <T,>(s: string): T | null => { try { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))) as T; } catch { return null; } };

export function setPending(item: PendingItem) { try { localStorage.setItem(KEY, JSON.stringify({ item: compact(item), at: Date.now() })); } catch { /* storage unavailable */ } }

/** The current path with the pending record attached, for use as a sign-up return URL. */
export function returnUrlWithPending(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(PARAM);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const { item } = JSON.parse(raw) as { item: PendingItem }; if (item?.id) url.searchParams.set(PARAM, enc(item)); }
  } catch { /* ignore */ }
  return url.pathname + url.search;
}

/** Reads and clears the pending record, from the URL first (works across browsers) and then local storage. */
export function consumePending(): PendingItem | null {
  let found: PendingItem | null = null;
  try {
    const url = new URL(window.location.href);
    const p = url.searchParams.get(PARAM);
    if (p) { found = dec<PendingItem>(p); url.searchParams.delete(PARAM); window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash); }
    const raw = localStorage.getItem(KEY);
    if (raw) { localStorage.removeItem(KEY); const { item, at } = JSON.parse(raw) as { item: PendingItem; at: number }; if (!found && item && Date.now() - at < 6 * 3600e3) found = item; }
  } catch { /* ignore */ }
  return found && found.id ? found : null;
}
