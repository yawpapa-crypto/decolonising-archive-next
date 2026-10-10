import type { DiscoverItem } from "@/lib/home/discover-shared";
import type { FeedEvent } from "./rank";

/**
 * Editorial sample network. It is shown only while a visitor has no real follows or activity, and is
 * always labelled as a sample in the interface. Pictures and titles are real open-access archive records;
 * the grouping into collections is editorial. Nothing here is written to the database.
 */
export type Entity = { id: string; handle: string; name: string; kind: "person" | "organisation"; blurb: string; areas: string[]; followers: number; followedBy?: string[]; match?: RegExp };
export type DemoCollection = { id: string; owner: string; title: string };

export const ENTITIES: Entity[] = [
  { id: "yaw", handle: "yaw-ofosu-asare", name: "Yaw Ofosu-Asare", kind: "person", blurb: "Lecturer in Communication Design. Decolonial design, African philosophy as method, Global South knowledge systems.", areas: ["decolonial design", "west africa", "graphic design", "adinkra"], followers: 140, followedBy: ["ared"] },
  { id: "ared", handle: "decolonising-archive", name: "Decolonising Archive", kind: "organisation", blurb: "ARED editorial. Open-access design knowledge from Africa and the Global South.", areas: ["graphic design", "west africa", "archives", "decolonial design"], followers: 900 },
  { id: "cleveland", handle: "cleveland-museum-of-art", name: "Cleveland Museum of Art", kind: "organisation", blurb: "Open Access collection: photography, textiles and works on paper.", areas: ["photography", "textiles", "prints"], followers: 52000, match: /cleveland/i },
  { id: "met", handle: "the-met-collection", name: "The Met Collection", kind: "organisation", blurb: "Open Access images from The Metropolitan Museum of Art.", areas: ["textiles", "sculpture", "ceremonial objects"], followers: 88000, match: /met\b|metropolitan/i },
  { id: "smithsonian", handle: "smithsonian-open-access", name: "Smithsonian Open Access", kind: "organisation", blurb: "Material culture and photographic archives from the Smithsonian.", areas: ["material culture", "photography", "west africa"], followers: 61000, match: /smithsonian/i },
  { id: "europeana", handle: "europeana", name: "Europeana", kind: "organisation", blurb: "European cultural heritage aggregator, including African collections held in Europe.", areas: ["archives", "photography", "maps"], followers: 30000, match: /europeana/i },
  { id: "commons", handle: "wikimedia-commons", name: "Wikimedia Commons", kind: "organisation", blurb: "Freely licensed media, including design history and vernacular signage.", areas: ["graphic design", "signage", "typography"], followers: 70000, match: /commons|wikimedia/i },
  { id: "loc", handle: "library-of-congress", name: "Library of Congress", kind: "organisation", blurb: "Prints and photographs, public domain.", areas: ["print culture", "photography", "posters"], followers: 45000, match: /library of congress|loc\b/i },
];

export const COLLECTIONS: DemoCollection[] = [
  { id: "c-ddia", owner: "yaw", title: "Decolonising Design in Africa" },
  { id: "c-adf", owner: "yaw", title: "African Design Futures" },
  { id: "c-sankofa", owner: "yaw", title: "Sankofa: Stories of a Postcolonial Space" },
  { id: "c-adinkra", owner: "yaw", title: "Adinkra and Asafo" },
  { id: "c-ghana", owner: "ared", title: "Graphic design in Ghana" },
  { id: "c-global", owner: "ared", title: "African and global archive collections" },
  { id: "c-cle", owner: "cleveland", title: "Photography from West Africa" },
  { id: "c-met", owner: "met", title: "Textiles and ceremonial objects" },
  { id: "c-smi", owner: "smithsonian", title: "Material culture" },
  { id: "c-eu", owner: "europeana", title: "African collections in European archives" },
  { id: "c-com", owner: "commons", title: "Signage and vernacular type" },
  { id: "c-loc", owner: "loc", title: "Prints and photographs" },
];

type Tile = { id: string; src: string; title: string; href: string; source: string; alt?: string; authors?: string; year?: string };
const H = 3600e3;

export function toItem(t: Tile): DiscoverItem {
  const external = t.href.startsWith("http");
  return { id: t.id, kind: "image", title: t.title, href: t.href, external, image: t.src, alt: t.alt || t.title, source: t.source, authors: t.authors, year: t.year };
}

export function buildDemo(tiles: Tile[], now = Date.now()) {
  const usable = tiles.filter((t) => t.src && t.src.startsWith("/") && !/iiif/i.test(t.src));
  const pool = usable.length ? usable : tiles;
  const itemsOf = (key: string, n: number, off: number): Tile[] => {
    const owner = ENTITIES.find((e) => e.id === key);
    const own = owner?.match ? pool.filter((t) => owner.match!.test(`${t.source} ${t.title}`)) : [];
    const src = own.length >= n ? own : pool;
    return Array.from({ length: Math.min(n, src.length) }, (_, i) => src[(off + i * 3) % src.length]);
  };
  const plan: Array<[string, string, FeedEvent["type"], number, number, string[]]> = [
    ["yaw", "c-adinkra", "records_added", 5, 3, ["adinkra", "west africa"]],
    ["ared", "c-ghana", "collection_published", 4, 7, ["graphic design", "west africa"]],
    ["yaw", "c-ddia", "records_connected", 4, 26, ["decolonial design"]],
    ["cleveland", "c-cle", "records_added", 5, 11, ["photography"]],
    ["met", "c-met", "records_added", 4, 30, ["textiles"]],
    ["yaw", "c-sankofa", "collection_updated", 3, 50, ["decolonial design"]],
    ["commons", "c-com", "records_added", 4, 54, ["typography", "signage"]],
    ["smithsonian", "c-smi", "collection_published", 5, 76, ["material culture"]],
    ["europeana", "c-eu", "records_added", 4, 96, ["archives", "photography"]],
    ["ared", "c-global", "path_published", 5, 120, ["archives"]],
    ["loc", "c-loc", "records_added", 3, 150, ["print culture"]],
    ["yaw", "c-adf", "collection_published", 4, 190, ["decolonial design", "graphic design"]],
    ["cleveland", "c-cle", "collection_updated", 3, 240, ["photography"]],
    ["met", "c-met", "records_connected", 3, 300, ["ceremonial objects"]],
  ];
  const byId = new Map<string, DiscoverItem>();
  const events: FeedEvent[] = plan.map(([actor, collection, type, n, hoursAgo, areas], i) => {
    const items = itemsOf(actor, n, i * 5).map((t) => { byId.set(t.id, toItem(t)); return t.id; });
    return { id: `demo-${i}`, actor, collection, type, at: now - hoursAgo * H, itemIds: items, areas, public: true };
  });
  return { events, items: byId };
}

export const entityBy = (handle: string) => ENTITIES.find((e) => e.handle === handle || e.id === handle);
