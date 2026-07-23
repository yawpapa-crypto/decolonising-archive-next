import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/src/components/layout/PageShell";
import {
  getKnowledgeRecordsForSource,
  getKnowledgeSourceBySlug,
  knowledgeSources,
} from "@/src/lib/knowledge-registry";
import "@/app/styles/knowledge/knowledge-registry.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return knowledgeSources.map((source) => ({ slug: source.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const source = getKnowledgeSourceBySlug(slug);
  if (!source) return {};

  return {
    title: `${source.title} | Knowledge Source Registry`,
    description: source.summary,
  };
}

export default async function SourceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const source = getKnowledgeSourceBySlug(slug);
  if (!source) notFound();
  const records = getKnowledgeRecordsForSource(source.slug);

  return (
    <PageShell>
      <main className="knowledge-source-detail-page">
        <nav className="knowledge-breadcrumb" aria-label="Breadcrumb">
          <Link href="/sources">Global Knowledge Source Registry</Link>
          <span>{source.title}</span>
        </nav>
        <header className="knowledge-source-detail-hero">
          <p className="knowledge-kicker">{source.type}</p>
          <h1>{source.title}</h1>
          <p>{source.summary}</p>
          {source.url ? (
            <a href={source.url} rel="noreferrer" target="_blank">
              Open source website
            </a>
          ) : null}
        </header>

        <div className="knowledge-record-layout">
          <article className="knowledge-record-body">
            <section>
              <h2>Governance and Authority</h2>
              <p>{source.governance}</p>
            </section>
            <section>
              <h2>Access Notes</h2>
              <p>{source.accessNote}</p>
            </section>
            <section>
              <h2>Supported Knowledge Records</h2>
              <div className="knowledge-source-list">
                {records.map((record) => (
                  <Link key={record.slug} href={`/knowledge/${record.slug}`}>
                    <strong>{record.title}</strong>
                    <span>{record.region}</span>
                  </Link>
                ))}
              </div>
              {records.length === 0 ? (
                <p>No published knowledge records currently cite this source.</p>
              ) : null}
            </section>
          </article>
          <aside className="knowledge-record-aside">
            <h2>Source Metadata</h2>
            <dl>
              <div>
                <dt>Type</dt>
                <dd>{source.type}</dd>
              </div>
              <div>
                <dt>Region</dt>
                <dd>{source.region}</dd>
              </div>
              <div>
                <dt>Country</dt>
                <dd>{source.country ?? "Not specified"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{source.status}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>
    </PageShell>
  );
}
