import { notFound } from "next/navigation";
import Shell from "@/app/following/Shell";
import Canvas from "@/app/following/Canvas";
import Track from "@/app/following/Track";
import { createClient } from "@/src/lib/supabase/server";
import { publicRecords } from "@/lib/following/server";
import { collectionRecords } from "@/lib/following/ared";
import { PUBLIC_COLLECTIONS } from "@/lib/data/public-collections";
export const dynamic = "force-dynamic";
export const metadata = { title: "Canvas · ARED", robots: { index: false, follow: false } };

/** Free-form board for one public collection. Arrangement is kept on this device. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hub = PUBLIC_COLLECTIONS.find((x) => x.slug === slug);
  let title: string, items;
  if (hub) {
    title = hub.title; items = await collectionRecords(slug);
  } else {
    if (!/^[\da-f-]{36}$/i.test(slug)) notFound();
    const db = await createClient();
    const { data: list } = await db.from("reading_lists").select("id,title").eq("id", slug).eq("is_public", true).maybeSingle();
    if (!list) notFound();
    const { data: records } = await db.rpc("curatorial_public_records", { collection_ids: [slug] });
    title = list.title; items = publicRecords((records ?? []).map((r: { record_id: string }) => r.record_id));
  }
  return (
    <Shell active="following">
      <Track type="source_open" target={`canvas:${slug}`} />
      <Canvas items={items} title={title} back={`/home-next/c/${slug}`} storageKey={slug} />
    </Shell>
  );
}
