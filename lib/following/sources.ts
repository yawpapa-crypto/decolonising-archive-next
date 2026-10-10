import type { DiscoverItem } from "@/lib/home/discover-shared";

/** A real record tile from the live archive feeds (Smithsonian, Met, Europeana and the like). */
export type Tile = { id: string; src: string; title: string; href: string; source?: string; alt?: string; authors?: string; year?: string };
export type LiveSource = { id: string; handle: string; name: string; tiles: Tile[]; groups: { id: string; title: string; tiles: Tile[] }[] };

export const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
export const toItem = (t: Tile): DiscoverItem => ({ id: t.id, kind: "image", title: t.title, href: t.href, external: t.href.startsWith("http"), image: t.src, alt: t.alt || t.title, source: t.source });

/** Groups real tiles by the institution that holds them. The part after the dash becomes a sub-collection. */
export function liveSources(tiles: Tile[]): LiveSource[] {
  const by = new Map<string, Tile[]>();
  for (const t of tiles) {
    const name = (t.source ?? "").split(/\s[—–-]\s/)[0].trim();
    if (!name || /^unsplash$/i.test(name)) continue;
    by.set(name, [...(by.get(name) ?? []), t]);
  }
  return [...by.entries()]
    .filter(([, v]) => v.length >= 2)
    .map(([name, v]) => {
      const sub = new Map<string, Tile[]>();
      for (const t of v) {
        const g = (t.source ?? "").split(/\s[—–-]\s/).slice(1).join(" · ").trim();
        if (g) sub.set(g, [...(sub.get(g) ?? []), t]);
      }
      return { id: slug(name), handle: slug(name), name, tiles: v, groups: [...sub.entries()].map(([title, ts]) => ({ id: slug(title), title, tiles: ts })) };
    })
    .sort((a, b) => b.tiles.length - a.tiles.length || a.name.localeCompare(b.name));
}
