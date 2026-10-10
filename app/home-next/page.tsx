import FilmPreview from "./FilmPreview";
import InvitationMotion from "./InvitationMotion";
import type { Metadata } from "next";
import Link from "next/link";
import DonateDialog from "./DonateDialog";
import AppDownload from "./AppDownload";
import HomeNav from "./HomeNav";
import HomeFooter from "./HomeFooter";
import HomeMotion from "./HomeMotion";
import ObjectField from "./ObjectField";
import SafeImg from "./SafeImg";
import SearchBox from "./SearchBox";
import { ScopeProvider, ScopeToggle } from "./Scope";
import { display } from "./font";
import { getCurrentUser } from "@/src/lib/auth";
import { getHomeCollage, type CollageTile } from "@/lib/home/home-collage";
import { getGhanaCollectionStats } from "@/lib/data/ghana-collection";
import "./home.css";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Decolonising Archive",
  description:
    "A public cultural knowledge platform for searching, citing and connecting decolonising knowledge across Africa, the diaspora and the Global South.",
  // Preview route while the redesign is reviewed. Remove when this replaces "/".
  robots: { index: false, follow: false },
  alternates: { canonical: "/" },
};

/** Where the host serves a size-by-URL rendition (IIIF), ask for the large one. */
function larger(src: string, width: number) {
  return src.replace("/full/480,/", `/full/${width},/`);
}
const isIiif = (t: CollageTile) => t.src.includes("/full/480,/");

// Routes into the new site: places and knowledge areas browse in Explore; sources feed For You.
const ROUTES = [
  { href: "/home-next/explore?q=West%20Africa", label: "By region" },
  { href: "/home-next/explore", label: "By knowledge area" },
  { href: "/home-next/for-you", label: "By source" },
] as const;

const TRY = ["goldweights", "kente", "Asante"] as const;

const BROWSE = [
  { href: "/home-next/explore?q=West%20Africa", label: "Regions" },
  { href: "/home-next/explore", label: "Knowledge areas" },
  { href: "/home-next/for-you", label: "Sources" },
  { href: "/home-next/explore?q=Indigenous%20communities", label: "Communities" },
  { href: "/how-ared-classifies-records", label: "How records are classified" },
] as const;

export default async function HomeNextPage() {
  const [user, collage] = await Promise.all([getCurrentUser(), getHomeCollage()]);
  const stats = getGhanaCollectionStats();
  const local = collage.local.filter(t => t.source !== "Unsplash");
  const global = collage.global;
  const all = [...global, ...local];

  /* Large placements want a source that survives enlargement: prefer IIIF renditions. */
  const hi = [...all.filter(isIiif), ...all.filter((t) => !isIiif(t))];
  const posterSrcs = hi.slice(0, 4).map((t) => larger(t.src, 1400));
  const routeSrcs = ROUTES.map((_, n) => hi.slice(4 + n, 8 + n).map((t) => larger(t.src, 900)));
  const centre = hi[8] ?? hi[0];
  const centreSrcs = hi.slice(8, 11).map((t) => larger(t.src, 900));

  return (
    <div className={`ared-home ${display.variable}`}>
      <HomeNav signedIn={Boolean(user)} />
      <ScopeProvider>
        <main id="main" className="ared-canvas">
          <ObjectField local={collage.local} global={global} />

          {/* 1. Dense field, one compact stack of copy */}
          <section className="ared-band ared-hero" aria-labelledby="hero-heading">
            <div className="ared-hero__copy">
              <p className="ared-eyebrow">DECOLONISING ARCHIVE</p>
              <h1 id="hero-heading" className="ared-display">
                Begin at home.
                <br />
                Read the world.
              </h1>
              <div className="ared-actions">
                <Link href="/home-next/explore" className="ared-btn ared-btn--primary">Explore the archive</Link>
                <Link href="/home-next/fieldnotes" className="ared-btn ared-btn--outline">ARED Field</Link>
              </div>
              <ScopeToggle />
            </div>
            <a href="#enter" className="ared-chevron" aria-label="Scroll to the collection">
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 5 5 5-5" /></svg>
            </a>
          </section>

          {/* 2. Focused: one large archive entry, surrounded by linen */}
          <section id="enter" className="ared-band ared-band--film" aria-label="Featured collection">
            <div className="ared-film">
              <span className="ared-film__frame">
                <SafeImg srcs={posterSrcs} className="ared-film__img" />
              </span>
              <span className="ared-film__scrim" aria-hidden="true" />
              <span className="ared-film__row">
                <span>Enter</span>
                <span>the collection</span>
              </span>
              <span className="ared-film__caption">featuring graphic design in Ghana · {stats.total} records</span>
            </div>
          </section>

          {/* 3. Open: three routes in, image first */}
          <section className="ared-band ared-band--routes" aria-label="Ways into the archive">
            <div className="ared-routes">
              {ROUTES.map((r, n) => (
                <Link key={r.href} href={r.href} className="ared-route" data-drift={n === 1 ? -34 : 30}>
                  <span className="ared-route__media">
                    <SafeImg srcs={routeSrcs[n]} />
                  </span>
                  <span className="ared-route__label">{r.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* 4. Very open: the search, alone */}
          <section className="ared-band ared-band--search" aria-labelledby="search-heading">
            <h2 id="search-heading" className="ared-h2" data-reveal>
              Every search opens an archive.
            </h2>
            <div data-reveal><SearchBox variant="big" /></div>
            <p className="ared-try" data-reveal>
              <span>Try</span>
              {TRY.map((q) => (
                <Link key={q} href={`/home-next/explore?q=${encodeURIComponent(q)}`}>{q}</Link>
              ))}
            </p>
          </section>

          {/* 5. Focused: one object, type at the far edges */}
          <section className="ared-band ared-band--object" aria-label="Situated knowledge">
            <p className="ared-side ared-side--l" data-reveal>Searching, citing and connecting</p>
            {centre ? (
              <figure className="ared-figure" data-drift="40">
                <Link href={centre.href} className="ared-figure__media">
                  <SafeImg srcs={centreSrcs} alt={centre.alt} />
                </Link>
                <figcaption>{centre.title} · {centre.source}</figcaption>
              </figure>
            ) : null}
            <p className="ared-side ared-side--r" data-reveal>decolonising knowledge across Africa, the diaspora and the Global South</p>
          </section>

          {/* 5b. The film, small and flat, in the open space below the object */}
          <section className="ared-band ared-band--watch" aria-label="Watch the ARED film">
            <FilmPreview />
          </section>

          {/* 6. Very open: where else to begin */}
          <section className="ared-band ared-band--browse" aria-label="Browse the archive">
            <p className="ared-browse" data-reveal>
              <span>Browse</span>
              {BROWSE.map((b) => (
                <Link key={b.href} href={b.href}>{b.label}</Link>
              ))}
            </p>
          </section>

          {/* 7. Dense again, around the sign-up */}
          <section id="read-with-us" className="ared-band ared-band--cta" aria-labelledby="cta-heading">
            <div className="ared-cta__gallery" aria-hidden="true">
              {all.filter((tile, index, tiles) => tiles.findIndex(t => t.src === tile.src) === index).slice(0, 16).map((tile, index) => (
                <div className={`ared-cta__image ared-cta__image--${index}`} key={tile.id}>
                  <SafeImg srcs={[tile.src]} alt="" sizes="140px" />
                </div>
              ))}
            </div>
            <div className="ared-cta">
              <p id="cta-heading" className="ared-cta__kicker">Read with us.</p>
              <div className="ared-cta__pair">
                <a id="ared-field" href="https://apps.apple.com/au/app/ared-field/id6794563712" target="_blank" rel="noopener noreferrer" className="ared-cta__pill">Download iOS app</a>
                <DonateDialog className="ared-cta__pill ared-cta__pill--ghost">Donate to ARED</DonateDialog>
              </div>
              <AppDownload label="On Android? Join the testers" className="ared-cta__android" />
            </div>
            <InvitationMotion />
          </section>
        </main>
      </ScopeProvider>
      <details className="ared-photo-credits"><summary>Photography credits</summary><div>{collage.local.filter(t=>t.source === "Unsplash").map(t=><p key={t.id}>Photo by <a href={t.credit}>{t.photographer}</a> on <a href={t.href}>Unsplash</a></p>)}</div></details>
      <HomeFooter />
      <HomeMotion />
    </div>
  );
}
