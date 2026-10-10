"use client";
import { useEffect, useMemo, useState } from "react";
import FollowingFeed from "./FollowingFeed";
import { SuggestedStrip, type Sug } from "./Suggested";
import { buildFeed, whoToFollow, type FeedEvent } from "@/lib/following/rank";
import { ENTITIES, COLLECTIONS } from "@/lib/following/demo";
import type { Activity } from "@/lib/following/server";
import type { DiscoverItem } from "@/lib/home/discover-shared";

const LS = "ared-follow-sources";
const LESS = "ared-feed-less";
const ACTION: Record<string, Activity["action"]> = { records_added: "added", collection_published: "published", path_published: "published", collection_updated: "updated", records_connected: "connected", record_contributed: "contributed", source_added: "source", public_save: "added", profile_update: "updated" };

/** Editorial sample feed. Ranked in the browser with the same pure ranker the server uses. */
export default function DemoFeed({ events, items, sug, interests, debug }: { events: FeedEvent[]; items: Record<string, DiscoverItem>; sug: Sug[]; interests: string[]; debug?: boolean }) {
  const [follows, setFollows] = useState<string[]>([]);
  const [less, setLess] = useState<string[]>([]);
  const [more, setMore] = useState<string[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      try {
        const keys: string[] = JSON.parse(localStorage.getItem(LS) || "[]");
        setFollows(keys.map((k) => k.replace(/^s-/, "")));
        setLess(JSON.parse(localStorage.getItem(LESS) || "[]"));
        setMore(JSON.parse(localStorage.getItem("ared-feed-more") || "[]"));
      } catch { setFollows([]); }
    };
    read();
    try { setSeen(JSON.parse(localStorage.getItem("ared-feed-seen") || "[]")); } catch { /* none */ } // read once so the order stays stable while scrolling
    window.addEventListener("storage", read);
    window.addEventListener("ared-follows-changed", read);
    return () => { window.removeEventListener("storage", read); window.removeEventListener("ared-follows-changed", read); };
  }, []);

  const model = useMemo(() => {
    const followed = follows.length ? follows : ["yaw", "ared"]; // sample view: start from Yaw and the editorial desk
    const graph: Record<string, string[]> = {};
    ENTITIES.forEach((e) => (graph[e.id] = e.followedBy ?? []));
    const viewer = { follows: followed, interests, less, more, seen, graph: { yaw: ["ared", "cleveland"], ared: ["yaw", "commons", "europeana"] }, now: Date.now() };
    const rows = buildFeed(events, viewer, { moduleEntities: ENTITIES.filter((e) => !followed.includes(e.id)).map((e) => e.id), moduleTitle: "People connected to what you're exploring" });
    const acts: Activity[] = [];
    const modules: Record<number, string> = {};
    rows.forEach((r) => {
      if (r.kind === "module") { modules[acts.length] = r.title; return; }
      const e = r.row.event; const ent = ENTITIES.find((x) => x.id === e.actor)!; const col = COLLECTIONS.find((c) => c.id === e.collection);
      acts.push({
        id: e.id, action: ACTION[e.type] ?? "added", occurred_at: new Date(e.at).toISOString(),
        actor: { id: ent.id, name: ent.name, avatar: null, bio: ent.blurb, website: null, href: `/following/${ent.handle}` },
        collection: { id: col?.id ?? "x", user_id: ent.id, title: col?.title ?? "Collection", description: null, created_at: "", updated_at: "", href: `/following/${ent.handle}#${col?.id}` },
        items: e.itemIds.map((id) => items[id]).filter(Boolean),
        why: r.row.reason, pool: r.row.pool,
      });
    });
    const rec = whoToFollow(ENTITIES.map((e) => ({ id: e.id, areas: e.areas, followers: e.followers, followedBy: e.followedBy })), viewer, 8);
    const order = new Map(rec.map((r, i) => [r.id, i]));
    const reasons = new Map(rec.map((r) => [r.id, r.reason]));
    const suggested = sug.filter((s) => !followed.includes(s.key.replace(/^s-/, ""))).map((s) => ({ ...s, why: reasons.get(s.key.replace(/^s-/, "")) ?? s.why })).sort((a, b) => (order.get(a.key.replace(/^s-/, "")) ?? 99) - (order.get(b.key.replace(/^s-/, "")) ?? 99));
    return { acts, modules, rows, suggested, usingSample: follows.length === 0 };
  }, [follows, events, items, sug, interests, less, more, seen]);

  return (
    <>
      <SuggestedStrip items={model.suggested} signedIn={false} />
      <p className="cf-sample" role="note">
        {model.usingSample ? "Editorial sample: real archive records, grouped for illustration. Follow people and organisations to build your own feed." : "Showing activity from the people and organisations you follow."}
      </p>
      <FollowingFeed
        key={follows.join(",")}
        initial={model.acts}
        next={null}
        modules={Object.fromEntries(Object.entries(model.modules).map(([i, t]) => [i, <SuggestedStrip key={i} title={t} items={model.suggested.slice(0, 6)} signedIn={false} />]))}
      />
      {debug && (
        <pre className="cf-debug">
          {model.rows.flatMap((r) => (r.kind === "event" ? [r.row] : [])).map((x) => `${x.event.id} ${x.event.actor} [${x.pool}] ${x.score.toFixed(1)} ${x.reason}\n   ${Object.entries(x.parts).filter(([, v]) => v).map(([k, v]) => `${k}:${v.toFixed(1)}`).join(" ")}`).join("\n")}
        </pre>
      )}
    </>
  );
}
