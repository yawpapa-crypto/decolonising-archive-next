export const metadata = {
  title: "Changelog | Decolonising Archive",
  description: "What has changed in Decolonising Archive — updates, fixes, and new features.",
};

const ENTRIES = [
  {
    date: "30 May 2026",
    version: "0.9 — Public Beta Launch",
    items: [
      "Opened platform to public beta — any user can now create an account",
      "Added Community Reading Commons: post reflections, notes, and reading paths",
      "Added Workbench: document, board, and canvas project tools for researchers",
      "Added public member profiles accessible from the community",
      "Added admin analytics dashboard with session and search tracking",
      "Added cultural care, community guidelines, and takedown pages",
      "Added feedback and bug report system",
      "Added source suggestion workflow",
      "Added onboarding checklist for new members",
      "Improved footer with links to all trust and policy pages",
    ],
  },
  {
    date: "26 May 2026",
    version: "0.8 — Community Reading Commons",
    items: [
      "Introduced community post reactions (useful/save)",
      "Added inline comment threads to community posts",
      "Added tag and topic browsing for community posts",
      "Improved community post card layout and accessibility",
    ],
  },
  {
    date: "April 2026",
    version: "0.7 — Workbench Collaboration",
    items: [
      "Added real-time collaboration to Workbench documents and boards",
      "Added comment anchoring and inline comment threads in documents",
      "Added project review and extraction modules for research projects",
    ],
  },
  {
    date: "March 2026",
    version: "0.6 — Curator Tools",
    items: [
      "Added curator editorial workflow for reviewing and contextualising records",
      "Introduced reading list sharing and export",
      "Added saved search management in member workspace",
    ],
  },
  {
    date: "February 2026",
    version: "0.5 — Library Search Foundations",
    items: [
      "Launched library search across OpenAlex, Semantic Scholar, and CrossRef",
      "Added record saving, bookmarking, and reading list creation",
      "Introduced external source aggregator and scholarly search cache",
    ],
  },
] as const;

export default function ChangelogPage() {
  return (
    <main className="legal-page">
      <div className="legal-wrap">
        <p className="legal-eyebrow">Platform</p>
        <h1>Changelog</h1>
        <p>
          A record of significant updates to Decolonising Archive. We aim to update this page with
          every meaningful change to the platform.
        </p>

        <div style={{ marginTop: "2.5rem", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {ENTRIES.map((entry) => (
            <section key={entry.version}>
              <p className="legal-eyebrow" style={{ marginBottom: "0.25rem" }}>{entry.date}</p>
              <h2 style={{ marginTop: 0 }}>{entry.version}</h2>
              <ul>
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
