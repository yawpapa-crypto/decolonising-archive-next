import { publicKnowledgeGraph } from "@/lib/knowledge/server";
import { connectedRecords } from "@/lib/knowledge/model";
import "server-only";
import { discoveryMix } from "./mix";
import { europeanaStream } from "@/lib/home/europeana";
import { cookies } from "next/headers";
import { createClient } from "@/src/lib/supabase/server";
import { loadCatalogueRecords } from "@/lib/catalogue/store";
import { sanitizeInterests, interestTerms } from "@/lib/onboarding/taxonomy";
import { articleStream, bookStream } from "@/lib/home/discover";
import { commonsStream, enrichCovers, metStream, locStream } from "@/lib/home/providers";
import { sequence } from "@/lib/visual/apply";
import { warmHashes } from "@/lib/visual/live-hash";
import { unstable_cache } from "next/cache";
import { takeFresh, type DiscoverItem } from "@/lib/home/discover-shared";
import {
  CONFIG,
  normalise,
  overlap,
  rankCandidates,
  diagnostics,
  type Candidate,
  type Evidence,
  type Features,
  type InterestProfile,
  textTerms,
} from "./engine";
import {
  allowed,
  recordFeatures,
  literalFeatures,
  hydrate,
  catalogueCandidates,
} from "./catalogue";
/** Dev-only inspection of the last For You composition. */
export let forYouTrace: unknown[] = [];
export type RecommendationEvent = {
  event_type: string;
  target_id: string;
  session_id: string | null;
  metadata: { terms?: string[] };
  created_at: string;
};
const emptyProfile = (): InterestProfile => ({
  explicit: [],
  saved: [],
  collections: [],
  followed: [],
  session: [],
  behaviour: [],
  negative: [],
  seen: new Set(),
  savedIds: new Set(),
});
function featuresForTerms(terms: string[]): Features {
  const vocabulary = catalogueCandidates();
  const features: Features = { text: textTerms(terms.join(" ")) };
  for (const term of terms)
    for (const c of vocabulary)
      for (const [dim, values] of Object.entries(c.features))
        for (const value of values) {
          if (
            normalise(value) === normalise(term) ||
            (term.length > 3 && normalise(value).includes(normalise(term)))
          )
            (features[dim] ||= []).push(value);
        }
  for (const dim of Object.keys(features))
    features[dim] = [...new Set(features[dim])];
  return features;
}
export async function readProfile(sessionId?: string, ignoreEvents = false, personalise = true) {
  const cookieStore = await cookies();
  sessionId ||= cookieStore.get("ared-recommendation-session")?.value;
  ignoreEvents ||=
    cookieStore.get("ared-recommendations-optout")?.value === "1";
  const p = emptyProfile();
  let userId: string | undefined;
  let terms: string[] = [];
  let chosen: string[] = [];
  if (!personalise) return { p, userId, terms, chosen };
  const records = new Map(
    loadCatalogueRecords()
      .filter(allowed)
      .map((r) => [r.id, r]),
  );
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    const user = data.user;
    if (!user) return { p, userId, terms, chosen };
    userId = user.id;
    const [profile, marks, items, searches, follows, events] =
      await Promise.all([
        sb
          .from("profiles")
          .select("interests,research_interests")
          .eq("id", userId)
          .maybeSingle(),
        sb
          .from("bookmarks")
          .select("record_id,record_title,record_source,record_type")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(150),
        sb
          .from("reading_list_items")
          .select(
            "record_id,record_title,record_source,record_type,reading_lists!inner(user_id)",
          )
          .eq("reading_lists.user_id", userId)
          .limit(200),
        sb
          .from("saved_searches")
          .select("label")
          .eq("user_id", userId)
          .limit(30),
        sb
          .from("curatorial_follows")
          .select("profile_id,collection_id")
          .eq("user_id", userId)
          .limit(100),
        ignoreEvents
          ? Promise.resolve({ data: [], error: null })
          : sb.rpc("recommendation_events"),
      ]);
    const clean = sanitizeInterests(
      profile.data?.interests || user.user_metadata?.interests,
    );
    chosen = Object.values(clean).flatMap((v) => (Array.isArray(v) ? v : []));
    const free = String(profile.data?.research_interests || "")
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
    terms = [
      ...new Set([...interestTerms(clean).map((t) => t.term), ...free]),
    ].slice(0, 8);
    for (const label of [...chosen, ...free])
      p.explicit.push({
        features: featuresForTerms([label]),
        weight: CONFIG.explicitWeight,
        reason: "Related to an interest you chose",
      });
    const evidence = (
      r: {
        record_id: string;
        record_title?: string;
        record_source?: string;
        record_type?: string;
      },
      weight: number,
      reason: string,
    ): Evidence => ({
      id: r.record_id,
      features: records.has(r.record_id)
        ? recordFeatures(records.get(r.record_id)!)
        : literalFeatures({
            title: r.record_title || "",
            source: r.record_source,
            kind: r.record_type === "book" ? "book" : "object",
          }),
      weight,
      reason,
    });
    for (const b of marks.data || []) {
      p.savedIds.add(b.record_id);
      p.saved.push(
        evidence(b, CONFIG.weights.save, "Connected to material you saved"),
      );
    }
    for (const i of items.data || [])
      p.collections.push(
        evidence(
          i,
          CONFIG.weights.collection_add,
          "Connected to a collection you made",
        ),
      );
    for (const s of searches.data || [])
      p.behaviour.push({
        features: featuresForTerms([s.label]),
        weight: CONFIG.weights.repeated_search,
        reason: "Related to a search you kept",
      });
    const collectionIds = (follows.data || []).flatMap((f) =>
      f.collection_id ? [f.collection_id] : [],
    );
    const profileIds = (follows.data || []).flatMap((f) =>
      f.profile_id ? [f.profile_id] : [],
    );
    if (profileIds.length) {
      const actors = await sb.rpc("curatorial_actors", { ids: profileIds });
      const publicProfileIds = (actors.data || []).map((actor: { id: string }) => actor.id);
      const lists = await sb
        .from("reading_lists")
        .select("id")
        .in("user_id", publicProfileIds)
        .eq("is_public", true)
        .limit(100);
      collectionIds.push(...(lists.data || []).map((l) => l.id));
    }
    if (collectionIds.length) {
      const rows = await sb.rpc("curatorial_public_records", {
        collection_ids: collectionIds,
      });
      for (const r of rows.data || [])
        if (records.has(r.record_id))
          p.followed.push({
            features: recordFeatures(records.get(r.record_id)!),
            weight: CONFIG.weights.follow,
            reason: "In a public collection you follow",
          });
    }
    const recent = Date.now() - CONFIG.sessionHours * 3600000;
    for (const e of (events.data || []) as RecommendationEvent[]) {
      const record = records.get(e.target_id);
      const features = record
        ? recordFeatures(record)
        : featuresForTerms(
            (e.metadata?.terms || []).filter((t) => typeof t === "string"),
          );
      const inSession =
        !!sessionId &&
        e.session_id === sessionId &&
        Date.parse(e.created_at) > recent;
      if (e.event_type === "rec_less") {
        p.negative.push({
          features,
          id: e.target_id,
          weight: CONFIG.weights.more,
          reason: "Less like this",
        });
        continue;
      }
      if (e.event_type === "rec_more") {
        p.behaviour.push({
          features,
          id: e.target_id,
          weight: CONFIG.weights.more,
          reason: "Related to material you asked for more of",
        });
        continue;
      }
      const weights: Record<string, number> = {
        rec_source_open: CONFIG.weights.source_open,
        rec_related_record_open: CONFIG.weights.related_record_open,
        rec_record_open: CONFIG.weights.record_open,
        rec_search: CONFIG.weights.repeated_search,
      };
      const decay = Math.pow(
        0.5,
        (Date.now() - Date.parse(e.created_at)) / (30 * 86400000),
      );
      const evidence = {
        id: e.target_id,
        features,
        weight: (weights[e.event_type] || 0) * decay,
        reason: inSession
          ? "Connected to what you are exploring now"
          : "Connected to records you explored",
      };
      // Raw searches never enter the historical profile. One session does not redefine a member.
      if (inSession) p.session.push(evidence);
      else if (e.event_type !== "rec_search") p.behaviour.push(evidence);
    }
  } catch {
    /* Account/telemetry outage must retain public discovery. */
  }
  return { p, userId, terms, chosen };
}
const externalCandidates = unstable_cache(
  async (query: string, page = 1) => {
    const all = await Promise.all(
      [
        commonsStream(page, query, 30),
        europeanaStream(page, query, 12),
        bookStream(page, query, 15),
        articleStream(page, query, 15),
        metStream(page, query, 10),
        locStream(page, query, 8),
      ].map((p) => p.catch(() => [] as DiscoverItem[])),
    );
    return all.flat();
  },
  ["ared-native-recommendation-candidates-v3"],
  { revalidate: 3600 },
);
/** Rotating ARED topics, so every batch meets new material instead of re-ranking one pool. */
const ROTATION = [
  "African art", "Ghana textiles", "adinkra symbols", "kente cloth", "Yoruba sculpture", "Asante goldweights",
  "African graphic design", "postcolonial design", "West African architecture", "African typography",
  "Benin bronzes", "Indigenous knowledge", "African photography", "pan-African posters", "Swahili coast",
  "Ethiopian manuscripts", "Zulu beadwork", "Caribbean art", "Maori carving", "African textiles",
  "Nigerian modernism", "Sahel architecture", "Akan design", "African studio photography",
];
function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export async function recommendationBatch(opts: {
  page: number;
  seed: string;
  seen: string[];
  sessionId?: string;
  intent?: string[];
  ignoreEvents?: boolean;
  personalise?: boolean;
  feedback?: { more?: string[]; less?: string[] };
  session?: Array<{ title?: string; source?: string; type?: string }>;
}) {
  const { p, userId, terms, chosen } = await readProfile(
    opts.sessionId,
    opts.ignoreEvents,
    opts.personalise,
  );
  p.seen = new Set(opts.seen);
  // Guests retain only browser-owned session intent, never a hidden server profile.
  if (!userId)
    for (const s of opts.session || [])
      p.session.push({
        features: literalFeatures({
          title: s.title || "",
          source: s.source,
          kind: "object",
        }),
        weight: CONFIG.weights.save,
        reason: "Connected to what you saved this session",
      });
  const allRecords = loadCatalogueRecords();
  const records = new Map(allRecords.map((r) => [r.id, r]));
  if (p.savedIds.size) {
    const graph=await publicKnowledgeGraph();
    const connected=new Map<string,string>();
    for(const saved of [...p.savedIds].slice(-6))for(const connection of connectedRecords(graph,saved,6)){
      if(connection.score<3 || p.savedIds.has(connection.id))continue;
      connected.set(connection.id,connection.reasons[0]);
    }
    for(const [id,reason] of connected){const r=records.get(id);if(r&&allowed(r))p.behaviour.push({id,features:recordFeatures(r),weight:CONFIG.weights.related_record_open,reason:`Connected to a saved record · ${reason}`});}
  }
  for (const term of (opts.intent || []).slice(-3))
    p.session.push({
      features: featuresForTerms([term]),
      weight: CONFIG.weights.repeated_search,
      reason: "Connected to what you are exploring now",
    });
  // Each page draws fresh material: the visitor's own interest at the next provider page,
  // plus two rotating archive topics. Without this every page re-ranked the same ~40 items.
  const start = hashStr(opts.seed || "fy") % ROTATION.length;
  const turn = (k: number) => ROTATION[(start + (opts.page - 1) * 2 + k) % ROTATION.length];
  const lap = Math.floor(((opts.page - 1) * 2) / ROTATION.length) + 1;
  const primary = opts.intent?.at(-1) || terms[(opts.page - 1) % Math.max(1, terms.length)] || "African design archives";
  const jobs: Array<[string, number]> = [[primary, opts.page], [turn(0), lap], [turn(1), lap]];
  const queries = jobs.map(([q]) => q);
  const external = (
    await Promise.all(
      jobs.map(([q, pg]) =>
        externalCandidates(q, pg).catch(() => [] as DiscoverItem[]),
      ),
    )
  ).flat().filter((item) => queries.some((query) =>
    overlap(literalFeatures(item), featuresForTerms([query])).length > 0
  ));
  const externalById = new Map(external.map((i) => [i.id, i]));
  const candidates: Candidate[] = [
    ...catalogueCandidates(),
    ...external.map((i) => ({
      id: i.id,
      features: literalFeatures(i),
      public: true,
      candidateSource: "public-provider",
      editorial: true,
      visualAvailable: !!i.image,
    })),
  ];
  for (const id of opts.feedback?.less || []) {
    const c = candidates.find((c) => c.id === id);
    if (c)
      p.negative.push({
        id,
        features: c.features,
        weight: CONFIG.weights.more,
        reason: "Less like this",
      });
  }
  for (const id of opts.feedback?.more || []) {
    const c = candidates.find((c) => c.id === id);
    if (c)
      p.session.push({
        id,
        features: c.features,
        weight: CONFIG.weights.more,
        reason: "Related to material you asked for more of",
      });
  }

  for (const evidence of [...p.behaviour, ...p.session, ...p.negative])
    if (
      evidence.id &&
      !Object.values(evidence.features).some((v) => v.length)
    ) {
      const c = candidates.find((c) => c.id === evidence.id);
      if (c) evidence.features = c.features;
    }
  const uniqueTitles = new Set<string>();
  const deduplicated = candidates.filter((c) =>
    takeFresh(
      externalById.get(c.id) || {
        id: c.id,
        kind: "object",
        title: records.get(c.id)?.title || c.id,
      },
      uniqueTitles,
    ),
  );
  // Knowledge selection: a relevance-qualified window, mixed close/adjacent/serendipitous.
  const ranked = rankCandidates(deduplicated, p, 160, opts.seed, discoveryMix(process.env.ARED_DISCOVERY_MIX));
  const duplicate = new Set(opts.seen);
  const rows = new Map(ranked.map((row) => [row.candidate.id, row]));
  const hydrated = ranked.flatMap((row) => {
    const r = records.get(row.candidate.id);
    if (r && !allowed(r)) return [];
    const item = r ? hydrate(r) : externalById.get(row.candidate.id);
    if (!item || !takeFresh(item, duplicate)) return [];
    return [
      {
        ...item,
        why: row.why,
        bucket: row.bucket,
        saved: p.savedIds.has(item.id),
      },
    ];
  });
  // Cover resolution first, so visual selection sees the real picture.
  const withCovers = await enrichCovers(hydrated.slice(0, 80)).catch(() => hydrated.slice(0, 80));
  const order = new Map(ranked.map((row, k) => [row.candidate.id, ranked.length - k]));
  // Visual composition: bounded reorder inside the window; relevance and the bucket mix lead.
  await warmHashes([...withCovers, ...hydrated.slice(80)].map((i) => i.image)).catch(() => undefined);
  const seq = sequence([...withCovers, ...hydrated.slice(80)], {
    n: 36, seed: opts.seed || "fy", pool: 160, lookahead: 14, breadth: 1,
    tailIn: `fy:${opts.seed}|${opts.page - 1}`, tailOut: `fy:${opts.seed}|${opts.page}`,
    knowledge: (i) => order.get(i.id) ?? 0,
    editorial: (i) => Boolean(i.collectionSlug),
  });
  forYouTrace = seq.trace.map((t) => ({ ...t, bucket: rows.get(t.id)?.bucket, why: rows.get(t.id)?.why, relevanceComponents: rows.get(t.id)?.components }));
  const items = seq.items;
  const pageRanked = items.map((i) => rows.get(i.id)!).filter(Boolean);
  const covered = items;
  if (
    userId &&
    !opts.ignoreEvents &&
    (await cookies()).get("ared-recommendations-optout")?.value !== "1"
  ) {
    try {
      const sb = await createClient();
      await sb.rpc("recommendation_event", {
        p_type: "rec_delivery",
        p_target: String(covered.length),
        p_session: opts.sessionId || null,
        p_terms: [],
      });
    } catch {}
  }
  return {
    items: covered,
    next: opts.page < 200 ? opts.page + 1 : null,
    streams: {
      catalogue: candidates.filter((c) => c.candidateSource === "catalogue")
        .length,
      providers: external.length,
    },
    seed: opts.seed,
    profile: {
      loggedIn: !!userId,
      saves: p.savedIds.size,
      interests: chosen.length ? chosen : terms,
    },
    quality: diagnostics(
      pageRanked.filter((row) =>
        covered.some((i) => i.id === row.candidate.id),
      ),
    ),
  };
}
export async function relatedBatch(id: string, seen: string[], page = 1) {
  const record = loadCatalogueRecords().find((r) => r.id === id && allowed(r));
  if (!record) return loadCatalogueRecords().some((r) => r.id === id)
    ? { items: [], next: null, streams: { catalogue: 0 } } : null;
  const graph=await publicKnowledgeGraph();
  const excluded=new Set([id,...seen]);
  const records=new Map(loadCatalogueRecords().filter(allowed).map(r=>[r.id,r]));
  const connections=connectedRecords(graph,id,250).filter(c=>records.has(c.id)&&!excluded.has(c.id));
  return {items:connections.slice(0,24).map(c=>({...hydrate(records.get(c.id)!),why:c.reasons.join(" · ")})),next:connections.length>24?page+1:null,streams:{catalogue:connections.length}};
}
export async function suggestedCurations() {
  const { p, userId } = await readProfile();
  if (!userId) return { profiles: [], collections: [] };
  const sb = await createClient();
  const [lists, following] = await Promise.all([
    sb
      .from("reading_lists")
      .select("id,title,description,user_id")
      .eq("is_public", true)
      .limit(100),
    sb
      .from("curatorial_follows")
      .select("profile_id,collection_id")
      .eq("user_id", userId),
  ]);
  const ids = (lists.data || []).map((l) => l.id);
  if (!ids.length) return { profiles: [], collections: [] };
  const rows = await sb.rpc("curatorial_public_records", {
    collection_ids: ids,
  });
  const publicRows = (rows.data || []) as Array<{
    reading_list_id: string;
    record_id: string;
  }>;
  const records = new Map(
    loadCatalogueRecords()
      .filter(allowed)
      .map((r) => [r.id, r]),
  );
  const followedLists = new Set(
    (following.data || []).map((f) => f.collection_id),
  );
  const followedPeople = new Set(
    (following.data || []).map((f) => f.profile_id),
  );
  const scored = (lists.data || [])
    .filter((l) => l.user_id !== userId && !followedLists.has(l.id))
    .map((l) => {
      const members = publicRows.filter(
        (r) => r.reading_list_id === l.id && records.has(r.record_id),
      );
      const shared = members.filter((r) => p.savedIds.has(r.record_id)).length;
      const known = members.filter((r) =>
        [...p.explicit, ...p.saved].some(
          (e) =>
            overlap(recordFeatures(records.get(r.record_id)!), e.features)
              .length,
        ),
      ).length;
      return {
        ...l,
        score: shared * CONFIG.weights.save + known,
        why: shared
          ? "Contains records you saved"
          : "Connected through shared archive metadata",
        novel: members.length - shared,
      };
    })
    .filter((l) => l.score > 0 && l.novel > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 6);
  const actors = await sb.rpc("curatorial_actors", {
    ids: [...new Set(scored.map((l) => l.user_id))],
  });
  return {
    collections: scored.map(({ id, title, why }) => ({ id, title, why })),
    profiles: (actors.data || [])
      .filter((a: { id: string }) => !followedPeople.has(a.id))
      .slice(0, 4),
  };
}
