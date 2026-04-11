import PageShell from "@/src/components/layout/PageShell";

export default function AboutPage() {
  return (
    <PageShell>
      <section className="section">
        <div className="section-header">
          <h1 className="section-title">About the Archive</h1>
        </div>

        <p className="section-copy">
          Decolonising Archive is a growing public-facing archive of artefacts,
          books, images, ideas, oral histories, manuscripts, textiles, research
          materials, and cultural records across Africa, the diaspora, and the
          Global South.
        </p>

        <p className="section-copy">
          The project is being developed as a space for discovery, recovery,
          memory, and critical access to decolonising knowledges, archival
          pathways, and cultural records.
        </p>
      </section>
    </PageShell>
  );
}
