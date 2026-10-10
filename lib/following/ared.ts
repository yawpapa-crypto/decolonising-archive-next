import "server-only";
import { distinctPictures } from "@/lib/visual/apply";
import { loadCatalogueRecords } from "@/lib/catalogue/store";
import { getHomeCollage } from "@/lib/home/home-collage";
import { PUBLIC_COLLECTIONS } from "@/lib/data/public-collections";
import { publicRecords, type Activity } from "@/lib/following/server";
import type { DiscoverItem } from "@/lib/home/discover-shared";

export const ARED = { id: "decolonising-archive", handle: "decolonising-archive", name: "Decolonising Archive", bio: "An open-access archive of design knowledge from Africa and the Global South." };
export const collectionHref = (slug: string) => `/c/${slug}`;

type Tile = { id: string; src: string; title: string; href: string; source?: string; alt?: string };
const tileItem = (t: Tile): DiscoverItem => ({ id: t.id, kind: "image", title: t.title, href: t.href, external: t.href.startsWith("http"), image: t.src, alt: t.alt || t.title, source: t.source });

/** Records that belong on a public collection page. Only records the catalogue already marks public with a displayable image. */
export async function collectionRecords(slug: string): Promise<DiscoverItem[]> {
  if (slug === "ghana-graphic-design") return publicRecords(loadCatalogueRecords().map((r) => r.id));
  const c = await getHomeCollage().catch(() => null);
  return c ? distinctPictures([...c.global].filter((t) => t.src).map(tileItem)) : [];
}

/** The archive's own publishing history, as feed events. Real collections, real covers. No invented people. */
export async function aredActivity(): Promise<Activity[]> {
  const actor = { id: ARED.id, name: ARED.name, avatar: null, bio: ARED.bio, website: null, href: `/following/${ARED.handle}` };
  const collage = await getHomeCollage().catch(() => null);
  const live = collage ? (await distinctPictures([...collage.global].filter((t) => t.src).map(tileItem))).slice(0, 12) : [];
  const now = Date.now();
  return PUBLIC_COLLECTIONS.map((c, i) => {
    const cover: DiscoverItem = { id: `cover-${c.id}`, kind: "image", title: c.title, href: c.href, external: false, image: c.imageUrl, alt: c.imageCaption, source: ARED.name };
    return {
      id: `ared-${c.id}`, action: "published" as const, occurred_at: new Date(now - i * 6 * 3600e3).toISOString(), actor,
      collection: { id: c.id, user_id: ARED.id, title: c.title, description: c.description, created_at: "", updated_at: "", href: collectionHref(c.slug) },
      items: c.id === "african-archives" && live.length ? [cover, ...live] : [cover],
    };
  });
}
