"use client";
import { useEffect, useState } from "react";
import FollowingFeed from "./FollowingFeed";
import type { Activity } from "@/lib/following/server";
import type { DiscoverItem } from "@/lib/home/discover-shared";

export type SrcGroup = { handle: string; name: string; items: DiscoverItem[] };
const LS = "ared-follow-sources";

/** Real records from the institutions this visitor follows on this device, or from every source until they follow one. */
export default function SourceFeed({ groups, fallback }: { groups: SrcGroup[]; fallback: React.ReactNode }) {
  const [keys, setKeys] = useState<string[] | null>(null);
  useEffect(() => {
    const read = () => { try { setKeys(JSON.parse(localStorage.getItem(LS) || "[]")); } catch { setKeys([]); } };
    read();
    window.addEventListener("ared-follows-changed", read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener("ared-follows-changed", read); window.removeEventListener("storage", read); };
  }, []);
  if (!groups.length) return <>{fallback}</>;
  const followed = groups.filter((g) => (keys ?? []).includes(`s-${g.handle}`));
  // Until you follow something, the feed is the live archive itself, spread across every source.
  const mine = followed.length ? followed : groups;
  const now = Date.now();
  const acts: Activity[] = mine.flatMap((g, i) => {
    const per = 10;
    const out: Activity[] = [];
    for (let k = 0; k * per < Math.min(g.items.length, 40); k++) {
      const items = g.items.slice(k * per, k * per + per);
      if (!items.length) break;
      out.push({ id: `src-${g.handle}-${k}`, action: "added", occurred_at: new Date(now - (i + k * mine.length) * 3600e3).toISOString(), actor: { id: g.handle, name: g.name, avatar: null, bio: null, website: null, href: `/following/${g.handle}` }, collection: { id: g.handle, user_id: g.handle, title: g.name, description: null, created_at: "", updated_at: "", href: `/following/${g.handle}` }, items });
    }
    return out;
  });
  return <FollowingFeed key={mine.map((m) => m.handle).join(",")} initial={acts} next={null} />;
}
