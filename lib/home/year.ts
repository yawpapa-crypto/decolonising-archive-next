/**
 * Reads a year out of the loose dates archives supply: "1897", "ca. 1850", "1850-1900",
 * "1890s", "19th century", "2001-04-12", "<time>1905</time>". Returns null when there is
 * no year to be had, rather than guessing. Shared by the server adapters and the feed's
 * period filter so both read dates the same way.
 */
const NOW = new Date().getFullYear() + 1;
const ORD = /\b(\d{1,2})(?:st|nd|rd|th)[\s-]+(?:century|c\.)(\s*(?:BCE?|B\.C\.))?/i;
const ROMAN = /\b([IVX]{1,5})(?:th|e|°)?\.?\s*(?:century|cent\.|sec(?:olo|\.)?|siècle|s\.)/i;
const roman = (r: string) => { const v: Record<string, number> = { I: 1, V: 5, X: 10 }; let n = 0; const u = r.toUpperCase(); for (let i = 0; i < u.length; i++) { const a = v[u[i]], b = v[u[i + 1]] ?? 0; n += a < b ? -a : a; } return n; };
const YEAR = /(?<![\d.,/#])(1\d{3}|20\d{2})(?![\d]|\.\d)/g;

export function yearOf(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) && value > 0 && value <= NOW ? Math.trunc(value) : null;
  const s = String(value).replace(/<[^>]+>/g, " ").trim();
  if (!s) return null;
  for (const m of s.matchAll(YEAR)) {
    const at = m.index ?? 0, before = s.slice(Math.max(0, at - 6), at), after = s.slice(at + 4, at + 10);
    // Reference numbers such as "CO 1069-188-1" or "71-1886" are not dates; "1916-1918" is.
    const isoDate = /^-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?(?![\d-])/.test(s.slice(at + 4, at + 14)); // 2001-04-12, 1891-05
    if ((!isoDate && /^-\d{1,3}(?!\d)/.test(after)) || /^-\d{5,}/.test(after) || /(?:^|[^\d])\d{1,3}-$/.test(before)) continue;
    const n = Number(m[1]);
    if (n >= 1000 && n <= NOW) return n;
  }
  const c = s.match(ORD);
  if (c) { const n = Number(c[1]); if (n >= 1 && n <= 21) return c[2] ? -((n - 1) * 100 + 50) : (n - 1) * 100 + 50; }
  const r = s.match(ROMAN);
  if (r) { const n = roman(r[1]); if (n >= 1 && n <= 21) return (n - 1) * 100 + 50; }
  return null;
}
