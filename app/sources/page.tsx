import PageShell from "@/src/components/layout/PageShell";

export default function SourcesPage() {
  return (
    <PageShell>
      <section className="about-body">
        <h1>Sources</h1>

        <p>
          Decolonising Archive brings together a stable local index with source
          pathways to external institutions, repositories, and cultural archives
          across Africa, the diaspora, and the Global South.
        </p>

        <h2>How sources work</h2>

        <p>
          The archive is designed so that core browsing, filters, and record
          pages remain reliable locally, while external institutions stay
          visible through source pathways and handoffs. This avoids brittle
          browser-only dependency on third-party systems while keeping archival
          discovery open.
        </p>

        <h2>Source categories</h2>

        <div className="info-block">
          <p>
            African institutional archives · libraries · museum collections ·
            scholarly indexes · digital repositories · oral history archives ·
            image collections · restitution pathways · record handoffs
          </p>
        </div>

        <h2>Current source strategy</h2>

        <p>
          The archive uses a local-first approach for stability, with optional
          outward pathways to originating institutions and collections. This
          supports provenance visibility, contextual reading, and broader
          discovery without making the core archive experience dependent on live
          third-party aggregation.
        </p>

        <h2>Examples</h2>

        <p>
          Source pathways may include institutional archives, museum collection
          interfaces, scholarly databases, digital library systems, and
          collection-specific discovery routes connected to the archive’s
          taxonomy and record structure.
        </p>
      </section>
    </PageShell>
  );
}
