import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogueRecord } from "@/lib/catalogue/store";
import { resolveServerRecordImage } from "@/lib/catalogue/record-image-server";
import type { DiscoverItem } from "@/lib/home/discover-shared";
import Link from "next/link";
import HomeNav from "../HomeNav";
import CommandBar from "../CommandBar";
import { display, ui } from "../font";
import { getCurrentUser } from "@/src/lib/auth";
import { collageFor, exploreCategories, getExplorePage } from "@/lib/home/for-you";
import ForYouFeed from "../for-you/ForYouFeed";
import { after } from "next/server";
import { headers } from "next/headers";
import { logSearchEvent } from "@/lib/admin-analytics";
import { SelectedRail, Trending } from "./ExploreStrips";
import "./explore.css";
import "../home.css";
import "../for-you/for-you.css";

export const metadata: Metadata = {
  title: "Explore | Decolonising Archive",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** Real destinations that already exist on the site. */
const SELECTED = [
  { key: "ghana", title: "Ghana graphic design", sub: "Collection", href: "/home-next/c/ghana-graphic-design" },
  { key: "african", title: "African archives", sub: "Collection", href: "/home-next/c/african-archives" },
  { key: "knowledge", title: "Knowledge areas", sub: "Browse by knowledge system", href: "/home-next/explore?q=Indigenous%20knowledge" },
  { key: "regions", title: "Regions", sub: "Browse by place", href: "/home-next/explore?q=West%20Africa" },
  { key: "sources", title: "Sources", sub: "Picked for you from every source", href: "/home-next/for-you" },
  { key: "communities", title: "Communities", sub: "Browse by community", href: "/home-next/explore?q=Indigenous%20communities" },
];

const TRY = [
  "goldweights", "kente cloth", "adinkra", "Asante", "Yoruba", "textiles", "manuscripts", "protest posters", "Benin bronzes", "typography",
  "oral literature", "masks", "photography", "architecture", "Ge'ez script", "Nsibidi", "mud cloth", "Adire cloth", "Kuba cloth", "Zulu beadwork",
  "Ndebele", "Maasai", "Dogon", "Ife heads", "Igbo-Ukwu", "Great Zimbabwe", "Timbuktu", "Swahili coast", "independence posters", "anticolonial print",
  "pan-African", "calligraphy", "hand-painted signs", "market signage", "Ashanti stools", "Ethiopian manuscripts",
];
const SHEETS = ["#c9902f", "#b4531f", "#2447a8", "#2f5a3b", "#d7a3a1", "#6c5b8f"];

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string; record?: string }> }) {
  const sp = await searchParams;
  const record = sp.record ? getCatalogueRecord(sp.record) : null;
  if (sp.record && !record?.publicVisibility) notFound();
  const image = record ? resolveServerRecordImage(record) : null;
  const initialOpen: DiscoverItem | undefined = record ? {
    id: record.id, kind: record.recordType === "publication" ? "essay" : "object", title: record.title,
    href: record.sourceUrl && /^https?:\/\//.test(record.sourceUrl) ? record.sourceUrl : `/home-next/explore?record=${encodeURIComponent(record.id)}`,
    external: Boolean(record.sourceUrl && /^https?:\/\//.test(record.sourceUrl)),
    image: image?.access === "display" ? image.url ?? undefined : undefined,
    authors: record.creatorOrAuthority || undefined, year: record.dateStart ? String(record.dateStart) : undefined,
    source: record.institutionOrCollection || record.sourceName || undefined,
    abstract: record.description || undefined, collectionSlug: "ghana-graphic-design",
  } : undefined;
  const q = (sp.q ?? sp.c ?? "").slice(0, 120);
  const cats = exploreCategories();
  const [user, first, collages, thumbs] = await Promise.all([
    getCurrentUser().catch(() => null),
    getExplorePage({ page: 1, q, seen: [] }),
    collageFor("explore-category-selection", SELECTED.length * 3).then(images => SELECTED.map((_, i) => images.slice(i * 3, i * 3 + 3))),
    collageFor("trending", TRY.length),
  ]);

  // Every Explore search (search bar, command bar, trending chips, category chips) reaches the
  // admin Searches tab. Logged after the response, so search never waits on analytics.
  const typed = (sp.q ?? "").trim();
  const chip = !typed ? (sp.c ?? "").trim() : "";
  if (typed || chip) {
    const h = await headers();
    const optedOut = h.get("sec-gpc") === "1" || /(?:^|;\s*)ared-privacy-optout=1/.test(h.get("cookie") || "");
    if (!optedOut) after(() => logSearchEvent({
      query: (typed || chip).slice(0, 120),
      sourceScope: typed ? "explore" : "explore-category",
      resultCount: first.items.length,
      externalResultCount: first.items.filter((i) => !i.collectionSlug).length,
      localResultCount: first.items.filter((i) => i.collectionSlug).length,
      status: "success",
      metadata: { surface: "home-next/explore" },
      userId: user?.id ?? null,
    }).then(() => undefined).catch(() => undefined));
  }

  return (
    <div className={`ared-home ex-ui ${display.variable} ${ui.variable}`}>
      <CommandBar />
      <HomeNav signedIn={Boolean(user)} variant="feed" active="explore" />
      <main className="fy fy--ex">
        <h1 className="ared-sr">Explore the archive</h1>
        <nav className="ex-cats" aria-label="Categories">
          <Link className="ex-chip" href="/home-next/explore" aria-current={q ? undefined : "page"}>Featured</Link>
          {cats.map((c) => (
            <Link key={c} className="ex-chip" href={`/home-next/explore?c=${encodeURIComponent(c)}`} aria-current={q === c ? "page" : undefined}>
              {c}
            </Link>
          ))}
        </nav>

        {!q && (
          <>
            <h2 className="ex-h">Selected by ARED</h2>
            <SelectedRail items={SELECTED.map((s, i) => ({ ...s, images: collages[i], tint: SHEETS[i % SHEETS.length] }))} />
            <h2 className="ex-h">Trending searches</h2>
            <Trending terms={TRY.map((t, i) => ({ term: t, image: thumbs[i], tint: SHEETS[i % SHEETS.length] }))} />
          </>
        )}

        <ForYouFeed key={`${q}:${sp.record ?? ""}`} initialOpen={initialOpen} initial={first} endpoint="/api/explore" storageKey={`ared-explore:v6:${q}`} extra={{ q }} onboarding={false} recordHeading={q || "Explore records"} toolbar />
      </main>
    </div>
  );
}
