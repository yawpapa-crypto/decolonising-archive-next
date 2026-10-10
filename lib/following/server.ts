import "server-only";
import { followingInterestTerms } from "./interest-terms";
import { createClient } from "@/src/lib/supabase/server";
import { getCatalogueRecord } from "@/lib/catalogue/store";
import {
  resolveServerRecordAspectRatio,
  resolveServerRecordImage,
} from "@/lib/catalogue/record-image-server";
import type { DiscoverItem } from "@/lib/home/discover-shared";
import { gorseCandidates, gorseItems } from "@/lib/following/gorse";
import { labCandidates } from "@/lib/following/lab";
import { labEventIds, interleave } from "@/lib/following/lab-merge";
import { buildFeed, type FeedEvent, type EventType } from "@/lib/following/rank";
export type Actor = {
  id: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  website: string | null;
  href?: string;
};
export type PublicCollection = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  href?: string;
};
export type Activity = {
  id: string;
  action: "published" | "updated" | "added" | "connected" | "contributed" | "source";
  occurred_at: string;
  actor: Actor | null;
  collection: PublicCollection;
  items: DiscoverItem[];
  why?: string;
  pool?: string;
};
export function publicRecords(ids: string[]): DiscoverItem[] {
  return [...new Set(ids)].flatMap((id) => {
    const r = getCatalogueRecord(id);
    if (!r?.publicVisibility || r.communityAuthorityRequired) return [];
    const img = resolveServerRecordImage(r);
    if (img.access !== "display" || !img.url) return [];
    return [
      {
        ar: resolveServerRecordAspectRatio(r),
        id: r.id,
        title: r.title,
        kind: r.recordType === "publication" ? "essay" : "object",
        href: `/collections/ghana-graphic-design/records/${encodeURIComponent(r.id)}`,
        external: false,
        collectionSlug: "ghana-graphic-design",
        image: img.access === "display" ? (img.url ?? undefined) : undefined,
        alt: r.title,
        source: r.institutionOrCollection || r.sourceName || undefined,
        authors: r.creatorOrAuthority || undefined,
        year: r.dateStart ? String(r.dateStart) : undefined,
      } satisfies DiscoverItem,
    ];
  });
}
export async function recommendations() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  const [prefs, rels] = user
    ? await Promise.all([
        db
          .from("profiles")
          .select("interests,research_interests")
          .eq("id", user.id)
          .maybeSingle(),
        db
          .from("curatorial_follows")
          .select("profile_id,collection_id")
          .eq("user_id", user.id),
      ])
    : [{ data: null }, { data: [] }];
  const terms = followingInterestTerms(prefs.data);
  const score = (text: string) =>
    terms.reduce(
      (n: number, t: string) => n + (text.toLowerCase().includes(t) ? 1 : 0),
      0,
    );
  const [people, lists] = await Promise.all([
    db
      .from("public_profiles")
      .select("id")
      .eq("profile_visibility", "public")
      .order("created_at", { ascending: false })
      .limit(12),
    db
      .from("reading_lists")
      .select("id,user_id,title,description,created_at,updated_at")
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);
  const { data: actors, error } = await db.rpc("curatorial_actors", {
    ids: (people.data ?? []).map((p) => p.id),
  });
  const peopleResult = ((actors ?? []) as Actor[]).sort(
    (a, b) => score(b.bio ?? "") - score(a.bio ?? ""),
  );
  const collectionsResult = ((lists.data ?? []) as PublicCollection[]).sort(
    (a, b) =>
      score(b.title + " " + (b.description ?? "")) -
      score(a.title + " " + (a.description ?? "")),
  );
  const matched =
    peopleResult.some((p) => score(p.bio ?? "") > 0) ||
    collectionsResult.some(
      (c) => score(c.title + " " + (c.description ?? "")) > 0,
    );
  return {
    people: peopleResult,
    collections: collectionsResult,
    matched,
    follows: rels.data ?? [],
    unavailable: Boolean(people.error || lists.error || error),
  };
}
const PAGE = 12;
const POOL = 90;
const TYPE: Record<string, EventType> = { published: "collection_published", updated: "collection_updated", added: "records_added", connected: "records_connected", contributed: "record_contributed", source: "source_added" };
/**
 * Ranked Following. Reads recent public activity (row level security already hides private rows),
 * ranks it with the pure ranker, and pages with an offset cursor over that ranking.
 * Time is bucketed to the hour so the order stays stable while someone scrolls.
 * If ranking throws for any reason, the page falls back to newest first.
 */
export async function followingPage(cursor?: string) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { items: [] as Activity[], next: null, loggedIn: false };
  let offset = 0;
  if (cursor) {
    const m = /^r(\d{1,4})$/.exec(cursor);
    if (!m) throw new Error("Invalid cursor");
    offset = Number(m[1]);
  }
  const [act, rels, prefs] = await Promise.all([
    db.from("curatorial_activity").select("id,actor_id,collection_id,action,record_ids,occurred_at").order("occurred_at", { ascending: false }).order("id", { ascending: false }).limit(POOL),
    db.from("curatorial_follows").select("profile_id,collection_id").eq("user_id", user.id),
    db.from("profiles").select("interests,research_interests").eq("id", user.id).maybeSingle(),
  ]);
  if (act.error) throw new Error("Following is temporarily unavailable.");
  const rows = act.data ?? [];
  const follows = (rels.data ?? []).flatMap((f) => [f.profile_id, f.collection_id].filter(Boolean) as string[]);
  const interests = followingInterestTerms(prefs.data);
  // Second degree: who the people I follow follow. Best effort; never blocks the feed.
  const graph: Record<string, string[]> = {};
  try {
    const mine = (rels.data ?? []).map((f) => f.profile_id).filter(Boolean) as string[];
    if (mine.length) {
      const g = await db.from("curatorial_follows").select("user_id,profile_id").in("user_id", mine).not("profile_id", "is", null).limit(400);
      (g.data ?? []).forEach((r) => { (graph[r.user_id] ??= []).push(r.profile_id as string); });
    }
  } catch { /* graph optional */ }
  const ids = [...new Set(rows.map((r) => r.collection_id))];
  const [collections, actors, records] = await Promise.all([
    db.from("reading_lists").select("id,user_id,title,description,created_at,updated_at").eq("is_public", true).in("id", ids),
    db.rpc("curatorial_actors", { ids: [...new Set(rows.map((r) => r.actor_id))] }),
    db.rpc("curatorial_public_records", { collection_ids: ids }),
  ]);
  if (collections.error || actors.error || records.error) throw new Error("Following could not load.");
  const recs = (records.data ?? []) as { reading_list_id: string; record_id: string }[];
  const itemsFor = (r: (typeof rows)[number]) => {
    const current = recs.filter((i) => i.reading_list_id === r.collection_id).map((i) => i.record_id);
    return publicRecords(r.action === "added" ? current.filter((id) => (r.record_ids as string[]).includes(id)) : current).slice(0, 20);
  };
  const byId = new Map(rows.map((r) => [r.id, r]));
  const events: FeedEvent[] = rows.flatMap((r) => {
    const col = collections.data?.find((l) => l.id === r.collection_id);
    if (!col) return [];
    return [{ id: r.id, actor: r.actor_id, type: TYPE[r.action] ?? "collection_updated", collection: r.collection_id, at: r.occurred_at, itemIds: (r.record_ids as string[]) ?? [], areas: [col.title, col.description ?? ""].join(" ").toLowerCase().split(/\W+/).filter((w: string) => interests.includes(w)), public: true, accessible: true }];
  });
  let ordered: { id: string; why?: string; pool?: string }[];
  try {
    const hour = Math.floor(Date.now() / 3600e3) * 3600e3;
    gorseItems(events.map((e) => ({ id: e.id, categories: [e.type], at: new Date(e.at).toISOString() })));
    const lab = labEventIds(labCandidates(user.id), events);
    const external = interleave(lab, await gorseCandidates(user.id));
    const feed = buildFeed(events, { follows, interests, graph, external, now: hour });
    ordered = feed.flatMap((f) => (f.kind === "event" ? [{ id: f.row.event.id, why: f.row.reason, pool: f.row.pool }] : []));
  } catch {
    // Ranking failed: newest first, but still say which items come from follows so suggestions are never unlabelled.
    const followed = new Set(follows);
    ordered = rows.map((r) => ({ id: r.id, pool: followed.has(r.actor_id) || followed.has(r.collection_id) ? "direct" : "discovery" }));
  }
  // Access filter last: an event with nothing publicly viewable and no public collection is dropped.
  const out: Activity[] = [];
  for (const o of ordered) {
    const r = byId.get(o.id);
    const collection = r && collections.data?.find((l) => l.id === r.collection_id);
    if (!r || !collection) continue;
    out.push({ id: r.id, action: r.action, occurred_at: r.occurred_at, actor: ((actors.data as Actor[]) ?? []).find((a) => a.id === r.actor_id) ?? null, collection, items: itemsFor(r), why: o.why, pool: o.pool });
  }
  const page = out.slice(offset, offset + PAGE);
  return { items: page, next: offset + PAGE < out.length ? `r${offset + PAGE}` : null, loggedIn: true };
}
