import type { Metadata } from "next";
import Link from "next/link";
import ArchiveAppPage from "@/src/components/archive/ArchiveAppPage";
import JsonLd from "@/src/components/kgo/JsonLd";
import { entityPath } from "@/lib/kgo/entities";
import { getPublicArchiveRecord, getPublicArchiveRecords, recordDescription } from "@/lib/kgo/records";
import { breadcrumbJsonLd, recordJsonLd } from "@/lib/kgo/schema";
import { absoluteUrl, slugifyEntity } from "@/lib/kgo/site";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const records = await getPublicArchiveRecords();
  return records.map((record) => ({ id: record.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getPublicArchiveRecord(id);
  if (!record) {
    return {
      title: "Record not found | ARED",
      robots: { index: false, follow: true },
    };
  }

  const description = recordDescription(record);
  const canonical = `/records/${encodeURIComponent(record.id)}`;
  const keywords = Array.from(
    new Set([...(record.knowledgeAreas || []), ...(record.tags || []), ...(record.communityOrCulturalGroup || [])]),
  );

  return {
    title: `${record.title} | ARED`,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title: record.title,
      description,
      url: canonical,
      type: "article",
      siteName: "Decolonising Archive",
    },
    twitter: {
      card: "summary_large_image",
      title: record.title,
      description,
    },
    other: {
      citation_title: record.title,
      citation_author: record.creator || "",
      citation_publication_date: record.datePublished || record.period?.[0] || "",
      "DC.title": record.title,
      "DC.creator": record.creator || "",
      "DC.source": record.sourceName || "",
    },
  };
}

export default async function RecordRoutePage({ params }: Props) {
  const { id } = await params;
  const record = await getPublicArchiveRecord(id);
  const all = await getPublicArchiveRecords();
  const related = record
    ? all
        .filter((item) => item.id !== record.id)
        .filter((item) => {
          const overlap = new Set([
            ...(record.knowledgeAreas || []),
            ...(record.tags || []),
            ...(record.communityOrCulturalGroup || []),
          ]);
          return (
            (item.knowledgeAreas || []).some((value) => overlap.has(value)) ||
            (item.tags || []).some((value) => overlap.has(value)) ||
            item.sourceName === record.sourceName
          );
        })
        .slice(0, 6)
    : [];

  return (
    <>
      {record ? (
        <>
          <JsonLd data={recordJsonLd(record)} />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "Library", url: "/library" },
              { name: record.sourceName || "Archive", url: "/library" },
              { name: record.title, url: `/records/${record.id}` },
            ])}
          />
          {/* Crawlable knowledge object for search engines and AI systems */}
          <article className="kgo-record-crawl" style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px" }}>
            <nav aria-label="Breadcrumb" style={{ marginBottom: 12, fontSize: 13 }}>
              <Link href="/library">Library</Link>
              <span aria-hidden="true"> / </span>
              <span>{record.title}</span>
            </nav>
            <p style={{ marginBottom: 8, fontSize: 12, color: "#5f625d" }}>
              {[record.recordType?.[0] || record.type, record.sourceName].filter(Boolean).join(" · ")}
            </p>
            <h1 style={{ margin: "0 0 12px", fontSize: "clamp(1.4rem, 3vw, 2rem)", lineHeight: 1.15 }}>
              {record.title}
            </h1>
            <p style={{ marginBottom: 16, color: "#3f433d", lineHeight: 1.6 }}>{recordDescription(record)}</p>
            <dl style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "8px 16px", marginBottom: 20 }}>
              {record.creator ? (
                <>
                  <dt>Creator</dt>
                  <dd>{record.creator}</dd>
                </>
              ) : null}
              {record.sourceName ? (
                <>
                  <dt>Source</dt>
                  <dd>
                    <Link href={`/source/${slugifyEntity(record.sourceName)}`}>{record.sourceName}</Link>
                  </dd>
                </>
              ) : null}
              {(record.region || [])[0] ? (
                <>
                  <dt>Region</dt>
                  <dd>
                    <Link href={`/region/${slugifyEntity(record.region[0])}`}>{record.region[0]}</Link>
                  </dd>
                </>
              ) : null}
              {(record.communityOrCulturalGroup || [])[0] ? (
                <>
                  <dt>Community</dt>
                  <dd>
                    <Link href={`/communities/${slugifyEntity(record.communityOrCulturalGroup![0])}`}>
                      {record.communityOrCulturalGroup![0]}
                    </Link>
                  </dd>
                </>
              ) : null}
              <dt>Persistent URL</dt>
              <dd>
                <a href={absoluteUrl(`/records/${record.id}`)}>{absoluteUrl(`/records/${record.id}`)}</a>
              </dd>
              <dt>Machine citation</dt>
              <dd>
                <a href={`/api/records/${encodeURIComponent(record.id)}/citation?format=bibtex`}>BibTeX</a>
                {" · "}
                <a href={`/api/records/${encodeURIComponent(record.id)}/citation?format=ris`}>RIS</a>
                {" · "}
                <a href={`/api/records/${encodeURIComponent(record.id)}/jsonld`}>JSON-LD</a>
              </dd>
            </dl>

            {(record.knowledgeAreas || []).length ? (
              <section style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: 18, marginBottom: 8 }}>Knowledge areas</h2>
                <ul style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0 }}>
                  {record.knowledgeAreas.map((term) => (
                    <li key={term}>
                      <Link href={entityPath("knowledge", slugifyEntity(term))}>{term}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {related.length ? (
              <section>
                <h2 style={{ fontSize: 18, marginBottom: 8 }}>Related records</h2>
                <ul>
                  {related.map((item) => (
                    <li key={item.id}>
                      <Link href={`/records/${encodeURIComponent(item.id)}`}>{item.title}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>
        </>
      ) : null}
      <ArchiveAppPage />
    </>
  );
}
