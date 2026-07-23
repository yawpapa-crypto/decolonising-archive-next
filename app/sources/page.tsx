import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import {
  getKnowledgeRecordsForSource,
  knowledgeSources,
} from "@/src/lib/knowledge-registry";
import "@/app/styles/knowledge/knowledge-registry.css";

export const metadata: Metadata = {
  title: "Global Knowledge Source Registry | Decolonising Archive",
  description:
    "Browse community authorities, archives, museums, language centres, research institutions, publications and datasets supporting knowledge system records.",
};

const sourceTypes = [
  "Community authority",
  "Archive",
  "Museum",
  "Language centre",
  "Research institution",
  "Publication",
  "Dataset",
] as const;

function sourceTypeSlug(type: string) {
  return type.toLowerCase().replaceAll(" ", "-");
}

type SourcesPageProps = {
  searchParams?: Promise<{ type?: string }>;
};

export default async function SourcesRegistryPage({
  searchParams,
}: SourcesPageProps) {
  const params = await searchParams;
  const selectedTypeSlug = params?.type;
  const selectedType = sourceTypes.find(
    (type) => sourceTypeSlug(type) === selectedTypeSlug,
  );
  const visibleSourceTypes = selectedType ? [selectedType] : sourceTypes;

  return (
    <PageShell>
      <main className="knowledge-sources-page">
        <section className="knowledge-source-hero">
          <p className="knowledge-kicker">ARED provenance registry</p>
          <h1>Global Knowledge Source Registry</h1>
          <p>
            Explore the communities, authorities, institutions, archives,
            datasets and publications that support public knowledge system
            records. Sources provide evidence and context; they do not replace
            community authority.
          </p>
          <div className="knowledge-hero__actions">
            <Link href="/knowledge">Explore Knowledge Systems</Link>
            <Link href="/sources/request">Request source review</Link>
          </div>
        </section>

        <section className="knowledge-source-type-grid" aria-label="Source types">
          <Link
            href="/sources"
            className={!selectedType ? "is-active" : undefined}
          >
            All source types
          </Link>
          {sourceTypes.map((type) => (
            <Link
              key={type}
              href={`/sources?type=${sourceTypeSlug(type)}`}
              className={selectedType === type ? "is-active" : undefined}
            >
              {type}
            </Link>
          ))}
        </section>

        {visibleSourceTypes.map((type) => {
          const sources = knowledgeSources.filter((source) => source.type === type);
          return (
            <section
              key={type}
              className="knowledge-source-section"
              id={sourceTypeSlug(type)}
            >
              <div className="knowledge-section__head">
                <div>
                  <p className="knowledge-kicker">{sources.length} records</p>
                  <h2>{type}</h2>
                </div>
              </div>
              {sources.length ? (
                <div className="knowledge-source-card-grid">
                  {sources.map((source) => {
                    const supportedRecords = getKnowledgeRecordsForSource(source.slug);
                    return (
                      <article key={source.slug} className="knowledge-source-card">
                        <span>{source.region}</span>
                        <h3>
                          <Link href={`/sources/${source.slug}`}>{source.title}</Link>
                        </h3>
                        <p>{source.summary}</p>
                        <div className="knowledge-source-card__meta">
                          <strong>{supportedRecords.length}</strong>
                          <span>
                            supported knowledge record
                            {supportedRecords.length === 1 ? "" : "s"}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="knowledge-source-empty">
                  No public sources are listed in this category yet.
                </p>
              )}
            </section>
          );
        })}
      </main>
    </PageShell>
  );
}
