import PageShell from "@/src/components/layout/PageShell";

export const metadata = {
  title: "Partners & Collaborators | Decolonising Archive",
  description:
    "Institutions, organisations, and initiatives that Decolonising Archive works with and draws from.",
};

export default function PartnersPage() {
  return (
    <PageShell>
      <main className="legal-page">
        <div className="legal-wrap">
          <p className="legal-eyebrow">Platform</p>
          <h1>Partners &amp; Collaborators</h1>

        <section>
          <h2>Our Approach to Partnership</h2>
          <p>
            Decolonising Archive draws on open metadata from a range of scholarly and archival
            infrastructure providers. We are not affiliated with these institutions unless explicitly
            stated, and our use of their data does not imply endorsement of our platform by them, or
            our endorsement of all of their practices.
          </p>
          <p>
            We are actively seeking partnerships with archives, universities, cultural institutions,
            and community organisations — particularly those working in Africa, the diaspora, and the
            Global South — who are interested in improving the discoverability and contextualisation
            of their collections. If that describes your institution, please get in touch.
          </p>
        </section>

        <section>
          <h2>Data Infrastructure</h2>
          <p>
            Decolonising Archive uses open scholarly metadata from{" "}
            <a href="https://openalex.org" target="_blank" rel="noopener noreferrer">
              OpenAlex
            </a>
            ,{" "}
            <a href="https://www.semanticscholar.org" target="_blank" rel="noopener noreferrer">
              Semantic Scholar
            </a>
            , and{" "}
            <a href="https://www.crossref.org" target="_blank" rel="noopener noreferrer">
              Crossref
            </a>
            . These services provide open bibliographic data that we use to surface relevant archival
            and scholarly sources for our users.
          </p>
        </section>

        <section>
          <h2>Become a Partner</h2>
          <p>
            We welcome expressions of interest from archives, libraries, universities, research
            centres, and community organisations. Potential areas of collaboration include:
          </p>
          <ul>
            <li>Integration of collection metadata into the archive</li>
            <li>Co-curation and editorial contextualisation of materials</li>
            <li>Research partnerships and academic use cases</li>
            <li>Community knowledge projects</li>
            <li>Curriculum integration and teaching pathways</li>
          </ul>
          <p>
            To discuss a partnership, contact us at{" "}
            <a href="mailto:hello@ared.design">hello@ared.design</a>.
          </p>
        </section>

        <section>
          <h2>Platform</h2>
          <p>
            Decolonising Archive is designed and built by{" "}
            <a href="https://yofosuasare.com" target="_blank" rel="noopener noreferrer">
              yofosuasare.com
            </a>
            . The platform is hosted on Vercel and uses Supabase for data infrastructure.
          </p>
        </section>
        </div>
      </main>
    </PageShell>
  );
}
