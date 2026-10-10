import { notFound } from "next/navigation";
import Shell from "@/app/following/Shell";
import PublicArchive from "@/app/following/PublicArchive";
import FollowButton from "@/app/following/FollowButton";
import ProfileFollow from "@/app/following/ProfileFollow";
import CollectionHeader from "@/app/following/CollectionHeader";
import Track from "@/app/following/Track";
import { createClient } from "@/src/lib/supabase/server";
import { publicRecords, type Actor } from "@/lib/following/server";
import { ARED, collectionRecords } from "@/lib/following/ared";
import { PUBLIC_COLLECTIONS } from "@/lib/data/public-collections";
export const dynamic = "force-dynamic";

const UUID = /^[\da-f-]{36}$/i;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = PUBLIC_COLLECTIONS.find((x) => x.slug === slug);
  return { title: c ? `${c.title} · ARED` : "Collection · ARED", robots: { index: false, follow: true } };
}

/** One public collection, laid out like a Cosmos collection: centred header, then a wide wall. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hub = PUBLIC_COLLECTIONS.find((x) => x.slug === slug);
  if (hub) {
    const items = await collectionRecords(slug);
    return (
      <Shell active="following">
        <main className="cf-coll">
          <Track type="source_open" target={`collection:${slug}`} />
          <CollectionHeader title={hub.title} handle={ARED.handle} note={`${items.length} records`} curator={ARED.name} curatorHref={`/home-next/following/${ARED.handle}`} follow={<ProfileFollow id={ARED.handle} />} moreKey={slug} />
          <PublicArchive items={items} tile={300} gap={28} />
        </main>
      </Shell>
    );
  }
  if (!UUID.test(slug)) notFound();
  const db = await createClient();
  const { data: list } = await db.from("reading_lists").select("id,user_id,title,description").eq("id", slug).eq("is_public", true).maybeSingle();
  if (!list) notFound();
  const [{ data: actors }, { data: records }, { data: { user } }, followers] = await Promise.all([
    db.rpc("curatorial_actors", { ids: [list.user_id] }),
    db.rpc("curatorial_public_records", { collection_ids: [slug] }),
    db.auth.getUser(),
    db.from("curatorial_follows").select("*", { count: "exact", head: true }).eq("collection_id", slug),
  ]);
  const actor = (actors as Actor[] | null)?.[0];
  const mine = user ? await db.from("curatorial_follows").select("collection_id").eq("user_id", user.id).eq("collection_id", slug) : { data: [] };
  const items = publicRecords((records ?? []).map((r: { record_id: string }) => r.record_id));
  return (
    <Shell active="following">
      <main className="cf-coll">
        <Track type="source_open" target={`collection:${slug}`} />
        <CollectionHeader title={list.title} handle={(actor?.name ?? "curator").toLowerCase().replace(/[^a-z0-9]+/g, "-")} followers={followers.count ?? 0} curator={actor?.name} curatorHref={actor ? `/people/${actor.id}` : undefined} avatar={actor?.avatar} follow={<FollowButton id={slug} kind="collection" signedIn={Boolean(user)} initial={Boolean(mine.data?.length)} />} moreKey={slug} />
        <PublicArchive items={items} tile={300} gap={28} />
      </main>
    </Shell>
  );
}
