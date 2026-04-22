import PageShell from "@/src/components/layout/PageShell";

async function getSiteContent() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "http://localhost:3000";

  const normalisedBaseUrl = baseUrl.startsWith("http")
    ? baseUrl
    : `https://${baseUrl}`;

  try {
    const response = await fetch(`${normalisedBaseUrl}/api/site-content`, {
      cache: "no-store",
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.content || null;
  } catch (error) {
    console.error("Failed to load site content:", error);
    return null;
  }
}

export default async function AboutPage() {
  const siteContent = await getSiteContent();
  const aboutContent = siteContent?.about || {
    eyebrow: "About",
    title: "About this archive",
    lead: "A working archive of decolonising knowledge across Africa, the diaspora, and the Global South.",
    body: "<p>This archive brings together records, theories, visual culture, oral traditions, and institutional pathways that support the recovery and organisation of decolonising knowledge.</p>",
    missionTitle: "Mission",
    missionBody: "<p>To build an accessible, evolving archive that supports research, teaching, cultural memory, and public knowledge.</p>",
    contactTitle: "Contact",
    contactBody: "<p>For rights, corrections, collaborations, or archival enquiries, please contact the archive administrator.</p>",
  };

  return (
    <PageShell>
      <section className="about-body">
        <p className="admin-preview-eyebrow">{aboutContent.eyebrow}</p>
        <h1>{aboutContent.title}</h1>

        <div className="info-block">
          <p>
            <strong>Decolonising Archive</strong>
            <br />
            {aboutContent.lead}
          </p>
        </div>

        <div
          className="about-richtext"
          dangerouslySetInnerHTML={{ __html: aboutContent.body }}
        />

        <h2>{aboutContent.missionTitle}</h2>
        <div
          className="about-richtext"
          dangerouslySetInnerHTML={{ __html: aboutContent.missionBody }}
        />

        <h2>{aboutContent.contactTitle}</h2>
        <div
          className="about-richtext"
          dangerouslySetInnerHTML={{ __html: aboutContent.contactBody }}
        />
      </section>
    </PageShell>
  );
}
