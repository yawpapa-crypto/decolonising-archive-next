import { notFound } from "next/navigation";
import Shell from "@/app/following/Shell";
import ProfileFollow from "@/app/following/ProfileFollow";
import ProfileHeader from "@/app/following/ProfileHeader";
import CollectionGrid from "@/app/following/CollectionGrid";
import PublicArchive from "@/app/following/PublicArchive";
import Track from "@/app/following/Track";
import { PUBLIC_COLLECTIONS } from "@/lib/data/public-collections";
import { ARED, collectionRecords } from "@/lib/following/ared";
export const dynamic = "force-dynamic";
export const metadata = { title: "Decolonising Archive · ARED", robots: { index: false, follow: true } };

/** The archive's own account: every record in its public collections, and the collections themselves. */
export default async function Page({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ tab?: string }> }) {
  if ((await params).handle !== ARED.handle) notFound();
  const tab = (await searchParams).tab === "collections" ? "collections" : "profile";
  const lists = await Promise.all(PUBLIC_COLLECTIONS.map(async (c) => ({ c, items: await collectionRecords(c.slug) })));
  const all = lists.flatMap((l) => l.items).filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
  const cards = lists.map(({ c, items }) => ({ key: c.id, href: `/c/${c.slug}`, title: c.title, sub: `${items.length} elements`, cover: c.imageUrl }));
  return (
    <Shell active="following">
      <main className="cf-profile cf-profile--wall">
        <Track type="profile_open" target={`profile:${ARED.handle}`} />
        <ProfileHeader name={ARED.name} handle={ARED.handle} bio={ARED.bio} base={`/following/${ARED.handle}`} tab={tab} records={all.length} collections={cards.length} follow={<ProfileFollow id={ARED.handle} />} moreKey={ARED.handle} />
        {tab === "profile" ? <PublicArchive items={all} tile={300} gap={28} /> : <CollectionGrid items={cards} />}
      </main>
    </Shell>
  );
}
