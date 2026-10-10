/**
 * Featured — a daily, diversity-aware selection (no popularity signal).
 *
 * The selection is a pure function of the publication date (Africa/Accra, UTC+0), so it is
 * stable all day, different the next day, identical on the website and the app, and cannot
 * "fail" into a stale fallback. Cooldowns are computed by replaying the previous days'
 * selections against the same eligible catalogue, so no selection table is needed:
 *   - yesterday's records are excluded (relaxed only if the pool is too small),
 *   - records shown in the previous 7 days are strongly penalised,
 *   - exposure over a rolling 30 days is reduced, and records rarely shown get a lift.
 * Engagement (views, saves) is never an input.
 */

export const FEATURED_TIMEZONE = "Africa/Accra";
export const FEATURED_VERSION = 2;

export type FeaturedCandidate = {
  id: string;
  region?: string | null;
  periodId?: string | null;
  recordType?: string | null;
  visualSystemId?: string | null;
  institution?: string | null;
};

export type FeaturedOptions = {
  /** Records in the main daily selection. */
  perDay?: number;
  /** Kept for compatibility; history is replayed from a fixed epoch. */
  windowDays?: number;
};

/** Publication date (YYYY-MM-DD) in the Featured timezone. */
export function featuredDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FEATURED_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** FNV-1a → [0, 1). Deterministic per key. */
export function unit(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

const FACETS: Array<[keyof FeaturedCandidate, number]> = [
  ["region", 0.16],
  ["recordType", 0.11],
  ["institution", 0.13],
  ["periodId", 0.09],
  ["visualSystemId", 0.08],
];

/** One day's selection given the exposure history (date → ids). */
function pickDay<T extends FeaturedCandidate>(pool: T[], date: string, history: Map<string, string[]>, perDay: number) {
  const yesterday = new Set(history.get(shiftDate(date, -1)) ?? []);
  const last7 = new Map<string, number>();
  const last30 = new Map<string, number>();
  for (let d = 1; d <= 30; d++) {
    for (const id of history.get(shiftDate(date, -d)) ?? []) {
      last30.set(id, (last30.get(id) ?? 0) + 1);
      if (d <= 7) last7.set(id, (last7.get(id) ?? 0) + 1);
    }
  }
  const base = (c: T) => {
    let s = unit(`featured:${date}:${c.id}`); // controlled randomness
    s -= 0.55 * Math.min(2, last7.get(c.id) ?? 0); // prefer records absent this week
    s -= 0.3 * (last30.get(c.id) ?? 0); // reduce 30-day exposure (keeps exposure even across the catalogue)
    if (!last30.get(c.id)) s += 0.3; // rarely shown → genuine chance
    return s;
  };
  // Progressive relaxation: exclude yesterday unless that would leave too few records.
  const fresh = pool.filter((c) => !yesterday.has(c.id));
  const eligible = fresh.length >= perDay ? fresh : pool;
  const scores = new Map(eligible.map((c) => [c.id, base(c)]));
  const chosen: T[] = [];
  const facetCount = new Map<string, number>();
  const remaining = new Set(eligible);
  while (chosen.length < Math.min(perDay, eligible.length)) {
    let best: T | null = null;
    let bestScore = -Infinity;
    for (const c of remaining) {
      let s = scores.get(c.id)!;
      // Diversity: each facet value already chosen makes the next one less likely (not a quota).
      for (const [f, w] of FACETS) {
        const v = c[f];
        if (v) s -= w * (facetCount.get(`${String(f)}:${v}`) ?? 0);
      }
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (!best) break;
    chosen.push(best);
    remaining.delete(best);
    for (const [f] of FACETS) {
      const v = best[f];
      if (v) facetCount.set(`${String(f)}:${v}`, (facetCount.get(`${String(f)}:${v}`) ?? 0) + 1);
    }
  }
  return { chosen, relaxed: eligible === pool && yesterday.size > 0 };
}

const HISTORY_EPOCH = "2026-01-01";
const histories = new Map<string, { last: string; days: Map<string, string[]> }>();

/**
 * Published selections up to `date`, built forward from a fixed epoch and cached, so "yesterday"
 * is exactly what was shown yesterday (a per-request look-back window would drift).
 */
export function featuredHistory<T extends FeaturedCandidate>(pool: T[], date: string, opts: FeaturedOptions = {}) {
  const perDay = opts.perDay ?? 24;
  const key = `${perDay}|${pool.map((p) => p.id).sort().join(",")}`;
  let h = histories.get(key);
  if (!h) { h = { last: shiftDate(HISTORY_EPOCH, -1), days: new Map() }; histories.set(key, h); if (histories.size > 8) histories.delete(histories.keys().next().value!); }
  let day = shiftDate(h.last, 1);
  while (day <= date) {
    h.days.set(day, pickDay(pool, day, h.days, perDay).chosen.map((c) => c.id));
    h.last = day;
    day = shiftDate(day, 1);
  }
  return h.days;
}

/**
 * The day's full order: the main selection first, then every other eligible record in a
 * seeded order (so the whole archive stays reachable on later pages).
 */
export function featuredOrder<T extends FeaturedCandidate>(pool: T[], date: string, opts: FeaturedOptions = {}) {
  const perDay = opts.perDay ?? 24;
  const history = featuredHistory(pool, date, opts);
  const todayIds = history.get(date) ?? [];
  const byId = new Map(pool.map((p) => [p.id, p]));
  const main = todayIds.map((id) => byId.get(id)!).filter(Boolean);
  const rest = pool.filter((p) => !todayIds.includes(p.id)).sort((a, b) => unit(`rest:${date}:${a.id}`) - unit(`rest:${date}:${b.id}`));
  const relaxed = pickDay(pool, date, new Map([...history].filter(([d]) => d < date)), perDay).relaxed;
  return { main, rest, relaxed };
}

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

/** Closed-form daily walk through a shuffled topic list (reshuffled each full cycle). */
function walk(topics: string[], day: number, count: number, offset: number): string[] {
  const L = topics.length;
  const slot = day * count + offset;
  const cycle = Math.floor(slot / L);
  const perm = [...topics].sort((x, y) => unit(`topics:${cycle}:${x}`) - unit(`topics:${cycle}:${y}`));
  const out: string[] = [];
  for (let i = 0; out.length < count && i < L; i++) {
    const t = slot + i < (cycle + 1) * L ? perm[(slot + i) % L] : [...topics].sort((x, y) => unit(`topics:${cycle + 1}:${x}`) - unit(`topics:${cycle + 1}:${y}`))[(slot + i) % L];
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

const EPOCH = dayNumber("2026-01-01");
const topicMemo = new Map<string, string[]>();

/** The day's main topics, computed forward from a fixed epoch so "yesterday" is exactly what was used. */
function mainTopics(topics: string[], n: number, count: number): string[] {
  const key = `${topics.join("|")}#${count}#${n}`;
  const hit = topicMemo.get(key);
  if (hit) return hit;
  let prev: string[] = [];
  let start = Math.max(EPOCH, n - 400);
  for (let d = n - 1; d >= start; d--) {
    const k = `${topics.join("|")}#${count}#${d}`;
    if (topicMemo.has(k)) { prev = topicMemo.get(k)!; start = d + 1; break; }
  }
  if (!prev.length && start > EPOCH) start = EPOCH; // first call: build from the epoch
  for (let d = start; d <= n; d++) {
    const avoid = new Set(prev);
    const out: string[] = [];
    for (let extra = 0; out.length < count && extra < topics.length; extra++) {
      for (const t of walk(topics, d, count + extra, 0)) if (!avoid.has(t) && !out.includes(t) && out.length < count) out.push(t);
    }
    topicMemo.set(`${topics.join("|")}#${count}#${d}`, out);
    prev = out;
  }
  if (topicMemo.size > 5000) topicMemo.clear();
  return topicMemo.get(key)!;
}

/**
 * Topics for the external half: a different set each day, never including yesterday's.
 * `offset` > 0 ("Discover more", later pages) walks further topics of the same day.
 */
export function featuredTopics(topics: string[], date: string, count = 2, offset = 0): string[] {
  const n = dayNumber(date);
  const main = mainTopics(topics, n, count);
  if (offset === 0) return main;
  const rest = [...topics].sort((x, y) => unit(`more:${date}:${x}`) - unit(`more:${date}:${y}`)).filter((t) => !main.includes(t));
  return Array.from({ length: Math.min(count, rest.length) }, (_, i) => rest[(offset - count + i + rest.length * 4) % rest.length]);
}

/** Provider page for a topic: digs deeper as the topic recurs, so repeats surface new results. */
export function featuredProviderPage(topics: string[], date: string, topic: string): number {
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const cycle = Math.floor(dayNumber / Math.max(1, Math.floor(topics.length / 2)));
  return 1 + ((cycle + Math.floor(unit(`page:${topic}`) * 3)) % 4);
}
