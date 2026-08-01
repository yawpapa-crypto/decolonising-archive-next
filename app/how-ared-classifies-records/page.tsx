import Link from "next/link";

export default function HowAredClassifiesRecordsPage() {
  return (
    <main className="site-container" style={{ maxWidth: 980, margin: "0 auto", padding: "40px 20px 80px" }}>
      <p style={{ marginBottom: 12, fontSize: 13, color: "#5f625d", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Methodology
      </p>
      <h1 style={{ marginBottom: 16, fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.05 }}>
        How ARED classifies records
      </h1>
      <p style={{ marginBottom: 24, fontSize: 17, lineHeight: 1.6, color: "#3f433d" }}>
        ARED preserves source institution metadata while adding contextual, scholarly and community-informed enrichment.
        Classifications are transparent, reviewable, and open to correction.
      </p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28 }}>Classification levels</h2>
        <ul style={{ display: "grid", gap: 12, paddingLeft: 20 }}>
          <li><strong>Knowledge area</strong> — Broad fields of study or knowledge tradition (e.g. Material culture, African philosophy).</li>
          <li><strong>Concept</strong> — Specific ideas, frameworks or cultural meanings represented in the record (e.g. Restitution, Sankofa).</li>
          <li><strong>Tag</strong> — Practical terms used for retrieval (e.g. Ghana, Kente, 19th century).</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28 }}>Who creates classifications</h2>
        <ul style={{ display: "grid", gap: 12, paddingLeft: 20 }}>
          <li>Source institutions provide original catalogue fields.</li>
          <li>ARED editorial workflows normalise and expand fields for cross-archive discoverability.</li>
          <li>Community contributions can add local names, corrections, oral histories and disputed interpretations.</li>
          <li>Machine assistance may suggest terms; these are marked and reviewed before trust elevation.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28 }}>Review and contested terms</h2>
        <p style={{ lineHeight: 1.6, color: "#3f433d" }}>
          Every major metadata field includes provenance and review status. Contested or incomplete interpretations are
          labelled and remain open to correction. Colonial terminology is preserved where historically necessary, with
          contextual interpretation so users can see both source language and editorial framing.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28 }}>Suggesting corrections</h2>
        <p style={{ lineHeight: 1.6, color: "#3f433d" }}>
          Use <strong>Community knowledge and responses</strong> on any record to submit local knowledge, correction,
          alternative naming, oral history, translation context, or disputed interpretation. Contributions are marked with
          status labels and do not silently overwrite source institution metadata.
        </p>
      </section>

      <p style={{ marginTop: 32 }}>
        <Link href="/library" style={{ textDecoration: "underline" }}>Return to Library</Link>
      </p>
    </main>
  );
}
