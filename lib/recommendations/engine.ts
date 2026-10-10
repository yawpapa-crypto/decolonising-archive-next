/** Pure, token-free ranking. No database, network, image resolution or demographic inference. */
export const CONFIG = {
  weights: {
    collection_add: 10,
    save: 8,
    follow: 8,
    more: 8,
    source_open: 5,
    related_record_open: 4,
    repeated_search: 4,
    collection_open: 3,
    record_open: 2,
    profile_open: 1,
    impression: 0,
    less: -10,
  },
  mix: { relevant: 0.6, adjacent: 0.25, serendipity: 0.15 },
  maxConsecutive: 2,
  retentionDays: 90,
  sessionHours: 2,
  maxEvents: 500,
  explicitWeight: 12,
  diversityPenalty: 3,
  exposurePenalty: 2,
  negativeSimilarity: 4,
} as const;
export type Features = Record<string, string[]>;
export type Candidate = {
  id: string;
  features: Features;
  public: boolean;
  authorityRequired?: boolean;
  candidateSource: string;
  editorial?: boolean;
  visualAvailable?: boolean;
};
export type Evidence = {
  features: Features;
  weight: number;
  reason: string;
  id?: string;
};
export type InterestProfile = {
  explicit: Evidence[];
  saved: Evidence[];
  collections: Evidence[];
  followed: Evidence[];
  session: Evidence[];
  behaviour: Evidence[];
  negative: Evidence[];
  seen: Set<string>;
  savedIds: Set<string>;
};
export type Ranked = {
  candidate: Candidate;
  bucket: "relevant" | "adjacent" | "serendipity";
  why: string;
  components: Record<string, number>;
  score: number;
  diversityAdjustment: number;
  position: number;
};
export const normalise = (s: string) =>
  s.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").trim();
export function textTerms(text: string): string[] {
  const stop = new Set(
    "the and for with from this that about their into over under more book study studies records archive".split(
      " ",
    ),
  );
  return [
    ...new Set(
      normalise(text)
        .replace(/[^\p{L}\p{N} ]/gu, " ")
        .split(/\s+/)
        .filter((t) => t.length > 3 && !stop.has(t) && !/^\d+$/.test(t)),
    ),
  ].slice(0, 24);
}
export function overlap(a: Features, b: Features): string[] {
  const matches: string[] = [];
  for (const [dim, values] of Object.entries(a)) {
    const theirs = new Set((b[dim] || []).map(normalise));
    for (const v of values) if (theirs.has(normalise(v))) matches.push(v);
  }
  return [...new Set(matches)];
}
function affinity(c: Candidate, evidence: Evidence[]) {
  const hits = evidence
    .map((e) => ({ e, matches: overlap(c.features, e.features) }))
    .filter((h) => h.matches.length);
  // Saturation prevents hundreds of saves of the same type becoming a region monopoly.
  const score = Math.min(
    18,
    hits.reduce(
      (s, h) => s + h.e.weight * Math.min(1, h.matches.length / 3),
      0,
    ),
  );
  const best = hits.sort(
    (a, b) => b.e.weight * b.matches.length - a.e.weight * a.matches.length,
  )[0];
  return { score, best };
}
export function rankCandidates(
  candidates: Candidate[],
  p: InterestProfile,
  limit = 36,
  seed = "",
  mix: { relevant: number; adjacent: number; serendipity: number } = CONFIG.mix,
): Ranked[] {
  const unique = new Map<string, Candidate>();
  for (const c of candidates)
    if (c.public && !c.authorityRequired) unique.set(c.id, c);
  const evidence = [
    ...p.explicit,
    ...p.saved,
    ...p.collections,
    ...p.followed,
    ...p.behaviour,
  ];
  const scored: Ranked[] = [...unique.values()]
    .filter((c) => !p.seen.has(c.id))
    .map((c) => {
      const exp = affinity(c, p.explicit),
        saved = affinity(c, p.saved),
        collections = affinity(c, p.collections),
        followed = affinity(c, p.followed),
        session = affinity(c, p.session),
        behaviour = affinity(c, p.behaviour);
      const negative = affinity(c, p.negative);
      const hits = [exp, saved, collections, followed, session, behaviour]
        .filter((x) => x.best)
        .sort((a, b) => b.score - a.score);
      const exactNegative = p.negative.some((e) => e.id === c.id);
      const features = new Set(
        [...p.explicit, ...p.saved, ...p.collections].flatMap(
          (e) => e.features.region || [],
        ),
      );
      const outward = (c.features.region || []).some((r) => !features.has(r));
      const path = affinity(c, evidence).best;
      const nonGeographic = path?.matches.some(
        (m) => !c.features.region?.includes(m) && !c.features.type?.includes(m),
      );
      const bucket: Ranked["bucket"] =
        outward && nonGeographic
          ? "serendipity"
          : exp.score +
                saved.score +
                collections.score +
                followed.score +
                session.score >=
              5
            ? "relevant"
            : path
              ? "adjacent"
              : "adjacent";
      const components = {
        preference: exp.score,
        saved: saved.score,
        collection: collections.score,
        followed: followed.score,
        session: Math.min(12, session.score),
        behaviour: Math.min(6, behaviour.score),
        editorial: c.editorial ? 1 : 0,
        visual: c.visualAvailable ? 2 : 0,
        novelty: p.savedIds.has(c.id) ? 0 : 1,
        repetition: p.savedIds.has(c.id) ? -CONFIG.exposurePenalty : 0,
        negative: exactNegative
          ? -100
          : -Math.min(CONFIG.negativeSimilarity, negative.score),
      };
      let why = "From the public archive — an editorial starting point.";
      if (hits[0]?.best)
        why = `${hits[0].best.e.reason}: ${hits[0].best.matches.slice(0, 2).join(" · ")}.`;
      if (bucket === "serendipity" && path)
        why = `A route beyond your usual regions, connected through ${path.matches
          .filter((m) => !c.features.region?.includes(m))
          .slice(0, 2)
          .join(" · ")}.`;
      return {
        candidate: c,
        bucket,
        why,
        components,
        score: Object.values(components).reduce((a, b) => a + b, 0),
        diversityAdjustment: 0,
        position: 0,
      };
    })
    .filter((r) => r.components.negative > -100);
  const result: Ranked[] = [];
  const counts: Record<string, number> = {
    relevant: 0,
    adjacent: 0,
    serendipity: 0,
  };
  while (scored.length && result.length < limit) {
    // Quotas are targets, never a reason to invent a bridge or discard all other material.
    const wanted = (Object.keys(mix) as Ranked["bucket"][]).sort(
      (a, b) => counts[a] / mix[a] - counts[b] / mix[b],
    )[0];
    const recent = result.slice(-CONFIG.maxConsecutive);
    const available = scored.some((r) => r.bucket === wanted);
    let best = 0,
      bestScore = -Infinity,
      bestAdjustment = 0;
    scored.forEach((r, i) => {
      let penalty = 0;
      for (const dim of [
        "region",
        "type",
        "source",
        "creator",
        "period",
        "visualSystem",
      ]) {
        const vals = r.candidate.features[dim] || [];
        if (
          vals.length &&
          recent.length === CONFIG.maxConsecutive &&
          recent.every(
            (x) =>
              overlap(
                { [dim]: vals },
                { [dim]: x.candidate.features[dim] || [] },
              ).length,
          )
        )
          penalty += CONFIG.diversityPenalty;
      }
      const adjusted =
        r.score - penalty + (available && r.bucket === wanted ? 6 : 0);
      if (
        adjusted > bestScore ||
        (adjusted === bestScore &&
          (seed ? stableHash(seed+r.candidate.id) < stableHash(seed+scored[best].candidate.id) : r.candidate.id.localeCompare(scored[best].candidate.id) < 0))
      ) {
        best = i;
        bestScore = adjusted;
        bestAdjustment = -penalty;
      }
    });
    const r = scored.splice(best, 1)[0];
    r.diversityAdjustment = bestAdjustment;
    r.position = result.length + 1;
    result.push(r);
    counts[r.bucket]++;
  }
  return result;
}
export function diagnostics(rows: Ranked[]) {
  return {
    delivered: rows.length,
    regions: new Set(rows.flatMap((r) => r.candidate.features.region || []))
      .size,
    types: new Set(rows.flatMap((r) => r.candidate.features.type || [])).size,
    sources: new Set(rows.flatMap((r) => r.candidate.features.source || []))
      .size,
    knowledgeAreas: new Set(
      rows.flatMap((r) => r.candidate.features.concept || []),
    ).size,
    novelty: rows.filter((r) => r.components.novelty > 0).length,
    serendipity: rows.filter((r) => r.bucket === "serendipity").length,
    repeatSaved: rows.filter((r) => r.components.repetition < 0).length,
  };
}

function stableHash(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
