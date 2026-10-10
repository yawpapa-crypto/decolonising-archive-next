import { notFound } from "next/navigation";
import Shell from "@/app/following/Shell";
import FollowButton from "@/app/following/FollowButton";
import PublicArchive from "@/app/following/PublicArchive";
import Track from "@/app/following/Track";
import ProfileHeader from "@/app/following/ProfileHeader";
import CollectionGrid from "@/app/following/CollectionGrid";
import { createClient } from "@/src/lib/supabase/server";
import { publicRecords, type Actor } from "@/lib/following/server";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const tab = (await searchParams).tab === "collections" ? "collections" : "profile";
  if (!/^[\da-f-]{36}$/i.test(id)) notFound();
  const db = await createClient();
  const [
    { data: actors },
    {
      data: { user },
    },
    { data: lists },
  ] = await Promise.all([
    db.rpc("curatorial_actors", { ids: [id] }),
    db.auth.getUser(),
    db
      .from("reading_lists")
      .select("id,title,description")
      .eq("user_id", id)
      .eq("is_public", true)
      .order("updated_at", { ascending: false }),
  ]);
  const actor = (actors as Actor[] | null)?.[0];
  if (!actor) notFound();
  const [{ data: records }, { data: follows }, fers, fing] = await Promise.all([
    db.rpc("curatorial_public_records", {
      collection_ids: (lists ?? []).map((l) => l.id),
    }),
    user
      ? db
          .from("curatorial_follows")
          .select("profile_id")
          .eq("user_id", user.id)
          .eq("profile_id", id)
      : Promise.resolve({ data: [] }),
    db.from("curatorial_follows").select("*", { count: "exact", head: true }).eq("profile_id", id),
    db.from("curatorial_follows").select("*", { count: "exact", head: true }).eq("user_id", id),
  ]);
  return (
    <Shell>
      <main className="cf-profile cf-profile--wall">
        <Track type="profile_open" target={`profile:${id}`} />
        <ProfileHeader name={actor.name} handle={id.slice(0, 8)} bio={actor.bio} avatar={actor.avatar} website={actor.website} base={`/people/${id}`} tab={tab} records={(records ?? []).length} collections={(lists ?? []).length} follow={<FollowButton id={id} kind="profile" signedIn={Boolean(user)} initial={Boolean(follows?.length)} />} moreKey={id} stats={{ followers: fers.count ?? 0, following: fing.count ?? 0 }} />
        {tab === "profile" ? (
          <PublicArchive items={publicRecords((records ?? []).map((r: { record_id: string }) => r.record_id))} />
        ) : (
          <CollectionGrid
            items={(lists ?? []).map((l) => {
              const ids = (records ?? []).filter((r: { reading_list_id: string }) => r.reading_list_id === l.id).map((r: { record_id: string }) => r.record_id);
              const pics = publicRecords(ids);
              return { key: l.id, href: `/curated-collections/${l.id}`, title: l.title, sub: `${ids.length} elements`, cover: pics[0]?.image ?? null };
            })}
          />
        )}
      </main>
    </Shell>
  );
}
