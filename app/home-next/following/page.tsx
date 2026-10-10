import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import LineLoader from "@/app/home-next/ui/LineLoader";
import "@/app/home-next/ui/cosmos-dialogs.css";
import Shell from "@/app/following/Shell";
import FollowingFeed from "@/app/following/FollowingFeed";
import FollowButton from "@/app/following/FollowButton";
import { followingPage, recommendations } from "@/lib/following/server";
import { SuggestedPanel, SuggestedStrip, type Sug } from "@/app/following/Suggested";
import { getHomeCollage } from "@/lib/home/home-collage";
import { padWithFallbacks } from "@/lib/home/fallback-images";
import CollectionGrid, { type CGItem } from "@/app/following/CollectionGrid";
import { aredActivity } from "@/lib/following/ared";
import { PUBLIC_COLLECTIONS } from "@/lib/data/public-collections";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Following · ARED",
  robots: { index: false, follow: true },
};
async function Content() {
  const [feedR, selR] = await Promise.all([
    followingPage().catch(() => ({ items: [], next: null, loggedIn: false }) as Awaited<ReturnType<typeof followingPage>>),
    recommendations().catch(() => ({ people: [], collections: [], matched: false, follows: [], unavailable: true }) as Awaited<ReturnType<typeof recommendations>>),
  ]);
  const result = [feedR, selR] as const;
  const [feed, selection] = result;
  const collage = await getHomeCollage().catch(() => null);
  const pics = collage ? [...collage.global, ...collage.local].map((t) => t.src).filter((u) => Boolean(u) && u.startsWith("/") && !/iiif/i.test(u)) : [];
  const pool = padWithFallbacks(pics, 24);
  const thumbsFor = (i: number) => [0, 1, 2, 3].map((k) => pool[(i * 4 + k * 7) % pool.length]);
  const ared = await aredActivity();
  const aredSug: Sug = { key: "s-decolonising-archive", name: "Decolonising Archive", handle: "@decolonising-archive", why: `${PUBLIC_COLLECTIONS.length} public collections`, href: "/home-next/following/decolonising-archive", thumbs: PUBLIC_COLLECTIONS.map((c) => c.imageUrl).slice(0, 3), count: "archive" };
  const colItems: CGItem[] = [
    ...selection.collections.map((c, i) => ({ key: `db-${c.id}`, href: `/home-next/c/${c.id}`, title: c.title, sub: "Public collection", cover: thumbsFor(i)[0] })),
    ...PUBLIC_COLLECTIONS.map((c) => ({ key: c.id, href: c.href, title: c.title, sub: c.recordCount ?? c.kicker, cover: c.imageUrl })),
  ];
  const sug: Sug[] = [
    ...selection.people.map((p, i) => ({ key: `p-${p.id}`, name: p.name, handle: `@${p.id.slice(0, 8)}`, why: "Member curator", href: `/people/${p.id}`, thumbs: thumbsFor(i), count: "curator", db: { id: p.id, kind: "profile" as const, initial: selection.follows.some((f) => f.profile_id === p.id) } })),
    ...selection.collections.map((c, i) => ({ key: `c-${c.id}`, name: c.title, handle: "@collection", why: "Public collection", href: `/home-next/c/${c.id}`, thumbs: thumbsFor(i + 3), count: "collection", db: { id: c.id, kind: "collection" as const, initial: selection.follows.some((f) => f.collection_id === c.id) } })),
    aredSug,
  ];
  return (
    <>
      <div className="cf-main">
      {feed.items.length || feed.next ? (
        <FollowingFeed initial={feed.items} next={feed.next} interlude={<SuggestedStrip items={sug.map((x) => ({ ...x, thumbs: [...x.thumbs, ...pool].slice(0, 3) }))} signedIn={feed.loggedIn} />} />
      ) : (
        <FollowingFeed initial={ared} next={null} interlude={<SuggestedStrip items={sug.map((x) => ({ ...x, thumbs: [...x.thumbs, ...pool].slice(0, 3) }))} signedIn={feed.loggedIn} />} />
      )}
      </div>
            <div className="cf-side"><SuggestedPanel items={sug} signedIn={feed.loggedIn} /></div>
      <section className="cf-discover" hidden>
        <h2>Public curations to explore</h2>
        <p className="cf-note">
          {selection.matched
            ? "Public curations with topics that overlap your chosen interests."
            : "Recent public collections and profiles. An editorial selection, rather than a popularity ranking."}
        </p>
        <div className="cf-recommendations">
          {selection.people.map((p) => (
            <article key={p.id}>
              <Link href={`/people/${p.id}`}>
                <h3>{p.name}</h3>
                <p>{p.bio}</p>
              </Link>
              <FollowButton
                id={p.id}
                kind="profile"
                signedIn={feed.loggedIn}
                initial={selection.follows.some((f) => f.profile_id === p.id)}
              />
            </article>
          ))}
          {selection.collections.map((c) => (
            <article key={c.id}>
              <Link href={`/home-next/c/${c.id}`}>
                <h3>{c.title}</h3>
                <p>{c.description}</p>
              </Link>
              <FollowButton
                id={c.id}
                kind="collection"
                signedIn={feed.loggedIn}
                initial={selection.follows.some(
                  (f) => f.collection_id === c.id,
                )}
              />
            </article>
          ))}
          {!selection.people.length &&
            !selection.collections.length &&
            PUBLIC_COLLECTIONS.map((c) => (
              <article key={c.id}>
                <Link href={c.href}>
                  <Image
                    className="cf-editorial-image"
                    src={c.imageUrl}
                    alt={c.imageCaption}
                    width={240}
                    height={170}
                  />
                  <h3>{c.title}</h3>
                  <p>Explore this ARED editorial collection ↗</p>
                </Link>
              </article>
            ))}
        </div>
      </section>
    </>
  );
}
export default function Page() {
  return (
    <Shell active="following">
      <main className="cf-page">
        <Suspense
          fallback={
            <div className="cz-load-page" aria-busy="true" style={{ gridColumn: "1 / -1", width: "100%" }}>
              <LineLoader size={88} label="Opening Following" />
            </div>
          }
        >
          <Content />
        </Suspense>
      </main>
    </Shell>
  );
}
