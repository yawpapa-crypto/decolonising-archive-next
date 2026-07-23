import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/src/components/layout/PageShell";
import {
  getKnowledgeRecordBySlug,
  getPublishedKnowledgeRecords,
  getSourcesForKnowledgeRecord,
  slugifyRegistryValue,
} from "@/src/lib/knowledge-registry";
import "@/app/styles/knowledge/knowledge-registry.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPublishedKnowledgeRecords().map((record) => ({ slug: record.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const record = getKnowledgeRecordBySlug(slug);
  if (!record) return {};

  return {
    title: `${record.title} | Global Knowledge Systems`,
    description: record.summary,
  };
}

function statusLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function KnowledgeRecordPage({ params }: PageProps) {
  const { slug } = await params;
  const record = getKnowledgeRecordBySlug(slug);
  if (!record) notFound();
  const sources = getSourcesForKnowledgeRecord(record);

  return (
    <PageShell>
      <main className="knowledge-record-page">
        <nav className="knowledge-breadcrumb" aria-label="Breadcrumb">
          <Link href="/knowledge">Global Knowledge Systems</Link>
          <span>{record.title}</span>
        </nav>

        <header className="knowledge-record-hero">
          <p className="knowledge-kicker">{record.type}</p>
          <h1>{record.title}</h1>
          {record.preferredTitle ? <p>{record.preferredTitle}</p> : null}
          <div className="knowledge-record-hero__badges">
            <span>{statusLabel(record.verificationStatus)}</span>
            <span>{statusLabel(record.culturalAccess)}</span>
            <span>{record.sourceIds.length} supporting sources</span>
          </div>
        </header>

        <div className="knowledge-record-layout">
          <article className="knowledge-record-body">
            <section>
              <h2>Overview</h2>
              {record.overview.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>

            <section>
              <h2>Community and Authority</h2>
              <dl className="knowledge-definition-grid">
                <div>
                  <dt>Communities</dt>
                  <dd>{record.community.join(", ")}</dd>
                </div>
                <div>
                  <dt>Languages</dt>
                  <dd>{record.languages.join(", ")}</dd>
                </div>
                <div>
                  <dt>Cultural territories</dt>
                  <dd>{record.culturalTerritories.join(", ")}</dd>
                </div>
                <div>
                  <dt>Countries</dt>
                  <dd>{record.countries.join(", ")}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2>How the System Works</h2>
              <p>{record.summary}</p>
              <div className="knowledge-chip-list">
                {record.categories.map((category) => (
                  <Link
                    key={category}
                    href={`/knowledge/categories/${slugifyRegistryValue(category)}`}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <h2>Sources and Evidence</h2>
              <p>{record.sourceNote}</p>
              <div className="knowledge-source-list">
                {sources.map((source) => (
                  <Link key={source.slug} href={`/sources/${source.slug}`}>
                    <strong>{source.title}</strong>
                    <span>{source.type}</span>
                  </Link>
                ))}
              </div>
              {record.sourceUrl ? (
                <p>
                  <a href={record.sourceUrl} target="_blank" rel="noreferrer">
                    Open original source record
                  </a>
                </p>
              ) : null}
            </section>

            {record.fieldProvenance ? (
              <section>
                <h2>Field-Level Provenance</h2>
                <dl className="knowledge-provenance-grid">
                  {Object.entries(record.fieldProvenance).map(([field, provenance]) => (
                    <div key={field}>
                      <dt>{field}</dt>
                      <dd>{provenance}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {record.original ? (
              <section>
                <h2>Original Source Metadata</h2>
                <div className="knowledge-original-metadata">
                  {Object.entries(record.original).map(([field, value]) => (
                    <div key={field}>
                      <strong>{field}</strong>
                      <span>
                        {Array.isArray(value)
                          ? value.join(", ")
                          : value == null
                            ? "Not supplied"
                            : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
            </section>
            ) : null}

            <section>
              <h2>Why This Record Is Credible</h2>
              <p>
                This public record is connected to {sources.length} source
                {sources.length === 1 ? "" : "s"} and has been labelled{" "}
                <strong>{statusLabel(record.verificationStatus)}</strong>. ARED
                separates evidence sources from cultural authority so users can
                see both provenance and review limits.
              </p>
            </section>

            <section>
              <h2>Cultural Access</h2>
              <p>{record.culturalCare}</p>
            </section>

            <section>
              <h2>Relationships</h2>
              <div className="knowledge-chip-list">
                {record.relationships.map((relationship) => (
                  <Link
                    key={relationship}
                    href={`/knowledge/relationships/${slugifyRegistryValue(relationship)}`}
                  >
                    {relationship}
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <h2>Review and Corrections</h2>
              <p>
                If this record misstates authority, access, naming, language,
                source context or community preference, please request a review.
              </p>
              <Link className="knowledge-action-link" href="/feedback">
                Suggest correction
              </Link>
            </section>
          </article>

          <aside className="knowledge-record-aside">
            <h2>Record Metadata</h2>
            <dl>
              <div>
                <dt>Region</dt>
                <dd>{record.region}</dd>
              </div>
              <div>
                <dt>Subregion</dt>
                <dd>{record.subregion ?? "Not specified"}</dd>
              </div>
              <div>
                <dt>Periods</dt>
                <dd>{record.periods.join(", ")}</dd>
              </div>
              <div>
                <dt>Last reviewed</dt>
                <dd>{record.lastReviewed}</dd>
              </div>
              <div>
                <dt>External ID</dt>
                <dd>{record.externalIdentifier ?? "ARED curated record"}</dd>
              </div>
              <div>
                <dt>Imported</dt>
                <dd>{record.importedAt ?? "Not imported"}</dd>
              </div>
              <div>
                <dt>Original source</dt>
                <dd>{record.externalSourceName ?? "ARED registry"}</dd>
              </div>
              <div>
                <dt>Rights</dt>
                <dd>
                  {record.rights?.url ? (
                    <a href={record.rights.url} target="_blank" rel="noreferrer">
                      {record.rights.label}
                    </a>
                  ) : (
                    record.rights?.label ?? "Check source"
                  )}
                </dd>
              </div>
            </dl>
            {record.rights?.rightsStatement ? (
              <p className="knowledge-rights-note">{record.rights.rightsStatement}</p>
            ) : null}
            {record.coordinates ? (
              <div className="knowledge-record-map-note">
                <strong>{record.coordinates.label}</strong>
                <span>Map precision: {record.coordinates.precision}</span>
              </div>
            ) : null}
            <h2>Limitations</h2>
            <ul>
              {record.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </PageShell>
  );
}
