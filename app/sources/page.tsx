import PageShell from "@/src/components/layout/PageShell";

export default function SourcesPage() {
  return (
    <PageShell>
      <section className="about-body">
        <div className="hero-eyebrow" style={{ marginBottom: "12px" }}>
          Source directory
        </div>

        <h1>Sources</h1>

        <p style={{ fontSize: "15px", color: "#000", marginTop: "12px", marginBottom: "24px" }}>
          Decolonising Archive brings together a stable local index with source
          pathways to external institutions, repositories, and cultural archives
          across Africa, the diaspora, and the Global South.
        </p>

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

        <h2>Source pathway types</h2>

        <div className="info-block">
          <p>
            <strong>African-Priority</strong>: archives, repositories,
            libraries, and cultural collections centred on Africa and the
            diaspora.
          </p>
          <p>
            <strong>Search-Ready</strong>: external collections and discovery
            systems that can be opened directly through stable source links and
            search pathways.
          </p>
          <p>
            <strong>Internal Architecture</strong>: the archive’s own index,
            enrichment, routing, taxonomy, and recovery layers that make
            discovery possible.
          </p>
          <p>
            <strong>Partner &amp; Community</strong>: community, custodial, and
            institutional routes for contributions, review, rights-limited
            reference, and archival partnership.
          </p>
        </div>

        <h2>Examples</h2>

        <p>
          Source pathways include African repositories such as WIReDSpace,
          OpenUCT, KNUST Repository, Kenya National Archives, Endangered
          Archives Programme, DISA, AfricArXiv, and CODESRIA Publications,
          alongside broader search-ready discovery systems such as Internet
          Archive, Open Library, V&amp;A Collections, The Met, Art Institute of
          Chicago, Wellcome Collection, Gallica, and the Library of Congress.
        </p>

        <h2>Internal archive architecture</h2>

        <p>
          The source model also includes internal pathways such as the local
          archive index, enriched records, metadata normalisation, rights and
          provenance enrichment, related search expansion, multilingual
          aliasing, collection pathway building, historical geography mapping,
          citation enrichment, zero-result recovery, and source handoff
          routing.
        </p>

        <h2>Partner and community pathways</h2>

        <p>
          The archive recognises community submission intake, oral history
          deposit routes, museum restitution dossier intake, archive classroom
          submissions, regional repository partnerships, rights-limited
          reference layers, community review channels, manuscript rescue
          networks, diaspora memory networks, exhibition dossier pathways,
          repatriation case tracking, and regional translation pathways as part
          of the broader source ecology.
        </p>

        <h2>Access Protocols &amp; Rights</h2>

        <div className="info-block">
          <p>
            <strong>Local Index</strong>: The core archive runs from a static
            local dataset so browsing and search remain stable when hosted on
            any static domain.
          </p>
          <p>
            <strong>Search-Ready</strong>: Links open the originating archive or
            discovery interface in a new tab rather than depending on fragile
            browser-side API aggregation.
          </p>
          <p>
            <strong>Directory</strong>: Institutional homepages, repository
            directories, and partner routes remain visible even when item-level
            access is external or rights-limited.
          </p>
          <p>
            <strong>Partnership</strong>: Some collections require institutional
            access, custodial agreements, or on-site consultation rather than
            public download.
          </p>
          <p>
            <strong>Internal Architecture</strong>: Search expansion, taxonomy
            registries, enrichment layers, and routing logic are represented as
            first-class pathways inside the archive model.
          </p>
          <p>
            <strong>Community Custodianship</strong>: Records may describe
            knowledge held by originating communities. Discovery does not
            override community governance or rights.
          </p>
          <p>
            <strong>Rights Handling</strong>: Metadata and summaries can remain
            open while the underlying source retains its own access
            restrictions, licences, or viewing conditions.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
