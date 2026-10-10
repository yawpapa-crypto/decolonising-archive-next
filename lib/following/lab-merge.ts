/** Pure helpers: turn RecBole lab candidates (profile:ID, collection:ID, record ids) into feed event ids. No I/O. */
export type LabItem = { item: string; score: number };
export type MinimalEvent = { id: string; actor: string; collection?: string };

/** Event ids ordered by the best lab rank of anything they touch. Items the lab never named are left out. */
export function labEventIds(items: LabItem[], events: MinimalEvent[]): string[] {
  const rank = new Map<string, number>();
  items.forEach((c, i) => { if (!rank.has(c.item)) rank.set(c.item, i); });
  const best = (e: MinimalEvent) => Math.min(...[e.id, `profile:${e.actor}`, e.actor, e.collection ? `collection:${e.collection}` : "", e.collection ?? ""].map((k) => rank.get(k) ?? Infinity));
  return events.map((e) => ({ id: e.id, r: best(e) })).filter((x) => x.r !== Infinity).sort((a, b) => a.r - b.r || a.id.localeCompare(b.id)).map((x) => x.id);
}

/** Interleave several best-first lists without duplicates, so no single recommender owns the top. */
export function interleave(...lists: string[][]): string[] {
  const out: string[] = [], seen = new Set<string>();
  const n = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < n; i++) for (const l of lists) if (l[i] !== undefined && !seen.has(l[i])) { seen.add(l[i]); out.push(l[i]); }
  return out;
}
