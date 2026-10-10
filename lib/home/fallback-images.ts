/** Local photographs in /public: used whenever a remote image link breaks. Safe to import from client and server code. */
export const FALLBACK_IMAGES = [
  "/images/fallback/kente-portrait.jpg",
  "/images/fallback/baskets.jpg",
  "/images/fallback/traffic-light-dress.jpg",
  "/images/fallback/lagos-aerial.jpg",
  "/images/fallback/weaver.jpg",
  "/images/fallback/namibian-dolls.jpg",
  "/images/fallback/painted-faces.jpg",
  "/images/fallback/mauritania-badges.jpg",
  "/images/fallback/market-beads.jpg",
  "/images/fallback/barber.jpg",
  "/images/fallback/lagos-street.jpg",
] as const;

/** A stable fallback for a given key (a URL or index), so the same slot always shows the same photograph. */
export function fallbackFor(key: string | number = 0): string {
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return FALLBACK_IMAGES[h % FALLBACK_IMAGES.length];
}

/** Pads a list of sources with fallback photographs until it holds at least n entries. */
export function padWithFallbacks(srcs: string[], n: number): string[] {
  const out = srcs.filter(Boolean).slice();
  for (let i = 0; out.length < n; i++) out.push(FALLBACK_IMAGES[i % FALLBACK_IMAGES.length]);
  return out;
}
