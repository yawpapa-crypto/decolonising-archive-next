import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import JsonLd from "@/src/components/kgo/JsonLd";
import { buildProgrammaticHubs } from "@/lib/kgo/programmatic";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/kgo/schema";

export const metadata: Metadata = {
  title: "Explore knowledge hubs | ARED",
  description:
    "Programmatic knowledge hubs connecting countries, regions, languages, communities and knowledge systems across the Decolonising Archive.",
  alternates: { canonical: "/explore" },
};

export default async function ExploreIndexPage() {
  const hubs = await buildProgrammaticHubs();
  const withRecords = hubs.filter((hub) => hub.recordIds.length > 0);
  const featured = (withRecords.length ? withRecords : hubs).slice(0, 60);

  return (
    <PageShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Explore", url: "/explore" },
        ])}
      />
      <JsonLd data={itemListJsonLd("ARED knowledge hubs", featured.map((hub) => `/explore/${hub.slug}`))} />

      <main className="site-container" style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 20px 80px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 18, fontSize: 13, color: "#5f625d" }}>
          <Link href="/">Home</Link>
          <span aria-hidden="true"> / </span>
          <span>Explore</span>
        </nav>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(1.8rem, 4vw, 2.6rem)", lineHeight: 1.1 }}>
          Explore knowledge hubs
        </h1>
        <p style={{ marginBottom: 16, maxWidth: "68ch", color: "#3f433d", fontSize: 16, lineHeight: 1.6 }}>
          Indexable combinations of places, languages, communities and knowledge systems. Each hub is a
          permanent entry point for researchers, institutions and machine readers.
        </p>
        <p style={{ marginBottom: 12, fontSize: 14, color: "#5f625d" }}>
          {hubs.length.toLocaleString()} hubs published · {withRecords.length.toLocaleString()} currently linked to
          catalogue records
        </p>
        <p style={{ marginBottom: 28, fontSize: 14, color: "#5f625d" }}>
          Machine access: <Link href="/api/kgo/graphql">GraphQL</Link>
          {" · "}
          <Link href="/api/kgo/graph">JSON graph</Link>
          {" · "}
          <Link href="/api/kgo/rdf">RDF</Link>
          {" · "}
          <Link href="/sitemap.xml">Sitemap</Link>
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {featured.map((hub) => (
            <li key={hub.slug} style={{ borderTop: "1px solid #e4e6e1", paddingTop: 12 }}>
              <Link href={`/explore/${hub.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
                <strong style={{ display: "block", marginBottom: 4 }}>{hub.title}</strong>
                <span style={{ color: "#5f625d", fontSize: 14 }}>
                  {hub.recordIds.length} record{hub.recordIds.length === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </PageShell>
  );
}
