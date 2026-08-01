import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/src/components/layout/PageShell";
import JsonLd from "@/src/components/kgo/JsonLd";
import {
  buildProgrammaticHubs,
  getProgrammaticHub,
  recordsForHub,
} from "@/lib/kgo/programmatic";
import { getPublicArchiveRecords, recordDescription } from "@/lib/kgo/records";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/kgo/schema";
import { absoluteUrl } from "@/lib/kgo/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;

export async function generateStaticParams() {
  // Prebuild hubs that already have records; remaining hubs render on demand.
  const hubs = await buildProgrammaticHubs();
  return hubs
    .filter((hub) => hub.recordIds.length > 0)
    .slice(0, 400)
    .map((hub) => ({ slug: hub.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hub = await getProgrammaticHub(slug);
  if (!hub) {
    return { title: "Hub not found | ARED", robots: { index: false, follow: true } };
  }
  return {
    title: `${hub.title} | ARED`,
    description: hub.description,
    alternates: { canonical: `/explore/${hub.slug}` },
    openGraph: {
      title: hub.title,
      description: hub.description,
      url: `/explore/${hub.slug}`,
      type: "website",
      siteName: "Decolonising Archive",
    },
    robots: { index: true, follow: true },
  };
}

export default async function ExploreHubPage({ params }: Props) {
  const { slug } = await params;
  const hub = await getProgrammaticHub(slug);
  if (!hub) notFound();

  const all = await getPublicArchiveRecords();
  const records = recordsForHub(hub, all);
  const relatedHubs = (await buildProgrammaticHubs())
    .filter((item) => item.slug !== hub.slug)
    .filter((item) => {
      const shared =
        (hub.filters.country || []).some((value) => item.filters.country?.includes(value)) ||
        (hub.filters.region || []).some((value) => item.filters.region?.includes(value)) ||
        (hub.filters.knowledge || []).some((value) => item.filters.knowledge?.includes(value));
      return shared;
    })
    .slice(0, 12);

  return (
    <PageShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: hub.title,
          description: hub.description,
          url: absoluteUrl(`/explore/${hub.slug}`),
          isPartOf: { "@id": "https://ared.design/#website" },
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Explore", url: "/explore" },
          { name: hub.title, url: `/explore/${hub.slug}` },
        ])}
      />
      <JsonLd
        data={itemListJsonLd(
          hub.title,
          records.map((record) => `/records/${record.id}`),
        )}
      />

      <main className="site-container" style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 20px 80px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 18, fontSize: 13, color: "#5f625d" }}>
          <Link href="/">Home</Link>
          <span aria-hidden="true"> / </span>
          <Link href="/explore">Explore</Link>
          <span aria-hidden="true"> / </span>
          <span>{hub.title}</span>
        </nav>

        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(1.8rem, 4vw, 2.6rem)", lineHeight: 1.1 }}>
          {hub.title}
        </h1>
        <p style={{ marginBottom: 28, maxWidth: "68ch", color: "#3f433d", fontSize: 16, lineHeight: 1.6 }}>
          {hub.description}
        </p>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>
            {records.length
              ? `${records.length} related record${records.length === 1 ? "" : "s"}`
              : "Knowledge graph entry point"}
          </h2>
          {records.length ? (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 }}>
              {records.map((record) => (
                <li key={record.id} style={{ borderTop: "1px solid #e4e6e1", paddingTop: 14 }}>
                  <Link href={`/records/${record.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                    <strong style={{ display: "block", marginBottom: 6 }}>{record.title}</strong>
                    <span style={{ display: "block", color: "#5f625d", fontSize: 14, lineHeight: 1.5 }}>
                      {recordDescription(record)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#5f625d", lineHeight: 1.6 }}>
              No catalogue records currently match this hub. It remains a permanent entity pathway for
              researchers and machine readers.{" "}
              <Link href={`/library?q=${encodeURIComponent(hub.title)}`}>Search the library</Link>
              {" · "}
              <Link href="/knowledge">Browse knowledge areas</Link>
            </p>
          )}
        </section>

        {relatedHubs.length ? (
          <section>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Related hubs</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {relatedHubs.map((item) => (
                <li key={item.slug}>
                  <Link href={`/explore/${item.slug}`}>{item.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </PageShell>
  );
}
