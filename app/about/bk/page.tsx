import PageShell from "@/src/components/layout/PageShell";

export default function AboutPage() {
  return (
    <PageShell>
      <section className="about-body">
        <h1>About this project</h1>

        <div className="info-block">
          <p>
            <strong>Decolonising Archive</strong>
            <br />
            An open-access cultural knowledge archive dedicated to preserving,
            organising, and making discoverable records related to decolonising
            knowledge across Africa, the diaspora, and the Global South.
          </p>
        </div>

        <p>
          The archive combines a stable local index with optional source
          handoffs to external institutions. That means the core browsing,
          search, and record-detail experience works reliably on static hosting,
          while still keeping institutional pathways visible.
        </p>

        <p>
          All metadata is published under CC0. Individual records remain
          subject to the rights, custodianship conditions, and access policies
          of their originating communities and institutions. The archive does
          not claim ownership of any record. It facilitates discovery,
          provenance transparency, and contextual reading.
        </p>

        <h2>Founding Editor</h2>

        <div className="person-block">
          <div className="person-avatar">YO</div>
          <div>
            <div className="person-name">Dr Yaw Ofosu-Asare</div>
            <div className="person-role">
              Design researcher and author based in Melbourne, Australia.
              Author of <em>Decolonising Design in Africa</em> (Routledge,
              2024) and <em>African Design Futures</em> (Palgrave Macmillan,
              2024). Guest editor, <em>Design and Culture</em> special issue:
              <em> Afrikan Design</em>. Research focus: decolonial design
              theory, African design philosophy, and design pedagogy.
            </div>
          </div>
        </div>

        <h2>Technical Architecture</h2>

        <div className="info-block">
          <p>
            Static HTML/CSS/JS · Local record dataset and search index ·
            Expanded taxonomy architecture with 127+ collections, 290+ themes,
            125+ source pathways, and 2,844 related-search routes · Hash-based
            routing for shareable detail pages · Responsive bordered editorial
            grid layout · Optional external source handoffs instead of brittle
            browser-side aggregation · No backend required for core browsing.
          </p>
        </div>

        <h2>Data Model</h2>

        <p>
          Each record can carry richer fields including abstract, summary,
          multi-paragraph description, institution, contributors, collection,
          rights, provenance, citation, notes, identifiers, optional images,
          external references, related-record links, language, country
          coverage, and source pathways. The larger working-library shelf is
          embedded into the static index so topics such as African philosophy
          return broader local results, while the expanded taxonomy layer
          powers filters, browse routes, and query expansion. Missing fields
          are hidden cleanly rather than rendered as empty placeholders.
        </p>

        <h2>Production Notes</h2>

        <p>
          The site is designed to deploy safely on static hosts. The local
          index powers search, filters, and record pages without cross-origin
          requests. External archives remain available through explicit source
          links, so CORS failures no longer block the core experience.
        </p>

        <h2>Contact &amp; Partnership</h2>

        <p>
          For institutional partnership, bulk data access, or repatriation
          documentation enquiries, contact through the archive editor. For
          archive contribution or source pathway additions, reach out via
          yofosuasare.com.
        </p>
      </section>
    </PageShell>
  );
}
