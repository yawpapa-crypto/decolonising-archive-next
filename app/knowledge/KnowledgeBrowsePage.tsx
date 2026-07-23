import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import {
  type BrowseKind,
  getBrowseIndex,
  getRecordsByBrowseValue,
  labelFromSlug,
} from "@/src/lib/knowledge-registry";
import { KnowledgeCard } from "./KnowledgeRegistryClient";
import "@/app/styles/knowledge/knowledge-registry.css";

const browseTitles: Record<BrowseKind, string> = {
  regions: "Region",
  countries: "Country",
  communities: "Community",
  languages: "Language",
  categories: "Category",
  periods: "Period",
  relationships: "Relationship",
};

export function generateBrowseParams(kind: BrowseKind) {
  return getBrowseIndex(kind).map((item) => ({ [kind.slice(0, -1)]: item.slug }));
}

export default function KnowledgeBrowsePage({
  kind,
  valueSlug,
}: {
  kind: BrowseKind;
  valueSlug: string;
}) {
  const records = getRecordsByBrowseValue(kind, valueSlug);
  const label = labelFromSlug(valueSlug);

  return (
    <PageShell>
      <main className="knowledge-browse-page">
        <nav className="knowledge-breadcrumb" aria-label="Breadcrumb">
          <Link href="/knowledge">Global Knowledge Systems</Link>
          <span>{browseTitles[kind]}</span>
        </nav>
        <header className="knowledge-browse-hero">
          <p className="knowledge-kicker">{browseTitles[kind]}</p>
          <h1>{label}</h1>
          <p>
            {records.length} public knowledge system
            {records.length === 1 ? "" : "s"} connected to this registry facet.
          </p>
        </header>
        <div className="knowledge-card-grid">
          {records.map((record) => (
            <KnowledgeCard key={record.slug} record={record} />
          ))}
        </div>
        {records.length === 0 ? (
          <section className="knowledge-empty-state">
            <h2>No public records yet</h2>
            <p>
              This registry facet exists so future reviewed records can be added
              without changing the site structure.
            </p>
          </section>
        ) : null}
      </main>
    </PageShell>
  );
}
