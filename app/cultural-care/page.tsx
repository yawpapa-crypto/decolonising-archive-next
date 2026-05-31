import PageShell from "@/src/components/layout/PageShell";

export const metadata = {
  title: "Cultural Care | Decolonising Archive",
  description:
    "How Decolonising Archive approaches cultural knowledge, Indigenous sovereignty, and custodianship.",
};

export default function CulturalCarePage() {
  return (
    <PageShell>
      <main className="legal-page">
        <div className="legal-wrap">
          <p className="legal-eyebrow">Ethics &amp; Practice</p>
          <h1>Cultural Care</h1>
          <p className="legal-updated">Last reviewed: 30 May 2026</p>

        <section>
          <h2>1. Our Commitment</h2>
          <p>
            Decolonising Archive is built on a recognition that archives are not neutral. The
            accumulation and description of knowledge — particularly knowledge produced by and about
            colonised peoples — has historically served to dispossess, misrepresent, and erase.
            Cultural care is our attempt to operate differently.
          </p>
          <p>
            We understand cultural care as an ongoing practice, not a policy checkbox. It requires
            us to centre the perspectives and sovereignty of originating communities in how we
            describe, present, and make accessible the materials referenced on this platform.
          </p>
        </section>

        <section>
          <h2>2. Indigenous Data Sovereignty</h2>
          <p>
            We acknowledge the CARE Principles for Indigenous Data Governance (Collective Benefit,
            Authority to Control, Responsibility, Ethics) and seek to apply them to how we handle
            metadata about Indigenous peoples, lands, languages, and knowledge systems.
          </p>
          <p>
            Where archival materials originate from or describe Indigenous communities, we recognise
            that those communities — not archives, institutions, or this platform — are the primary
            custodians of that knowledge.
          </p>
        </section>

        <section>
          <h2>3. Harmful and Restricted Content</h2>
          <p>
            Some archival materials contain images, descriptions, or language that is harmful,
            outdated, or culturally inappropriate. Where we are aware of such content, we aim to
            contextualise it clearly. We do not reproduce primary archival content — we link to and
            describe materials held by external institutions.
          </p>
          <p>
            If you encounter a record that references material you believe should be restricted,
            contextualised differently, or removed, please use our{" "}
            <a href="/takedown">takedown and rights contact page</a>.
          </p>
        </section>

        <section>
          <h2>4. Language and Description</h2>
          <p>
            Archival description has historically used language that reflects the biases of the
            institutions that created those descriptions. We are working to improve and contextualise
            metadata language across our archive. This is imperfect and ongoing work.
          </p>
          <p>
            If you notice description language that is harmful or inaccurate, we welcome your report
            via the{" "}
            <a href="/feedback">feedback page</a> or{" "}
            <a href="/takedown">takedown contact</a>.
          </p>
        </section>

        <section>
          <h2>5. Institutional Relationships</h2>
          <p>
            Decolonising Archive links to materials held by universities, national archives, museums,
            and libraries. The cultural care practices of those institutions vary widely. Our
            inclusion of a link to an institution does not imply endorsement of its practices.
          </p>
        </section>

        <section>
          <h2>6. Ongoing Practice</h2>
          <p>
            We are a small, independent platform. Our cultural care practice is evolving. We
            welcome feedback, partnership, and critique from researchers, archivists, and
            communities. Contact us at{" "}
            <a href="mailto:hello@ared.design">hello@ared.design</a>.
          </p>
        </section>
        </div>
      </main>
    </PageShell>
  );
}
