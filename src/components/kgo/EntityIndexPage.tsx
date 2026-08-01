import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import JsonLd from "@/src/components/kgo/JsonLd";
import { entityKindBasePath, entityPath, listEntities, type EntityKind } from "@/lib/kgo/entities";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/kgo/schema";

const KIND_COPY: Record<EntityKind, { title: string; intro: string }> = {
  knowledge: {
    title: "Knowledge areas",
    intro: "Broad fields connecting ARED records to research traditions, practices and collections.",
  },
  community: {
    title: "Communities",
    intro: "Communities and cultural groups represented across ARED records and knowledge systems.",
  },
  language: {
    title: "Languages",
    intro: "Languages present in ARED records, including African languages and multilingual materials.",
  },
  region: {
    title: "Regions",
    intro: "Regions used to situate ARED records across Africa, the diaspora and the Global South.",
  },
  source: {
    title: "Sources",
    intro: "Institutions, archives, museums and source pathways supplying records to ARED.",
  },
  country: {
    title: "Countries",
    intro: "Countries and territories associated with ARED records, communities and knowledge systems.",
  },
};

export default async function EntityIndexPage({ kind }: { kind: EntityKind }) {
  const entities = await listEntities(kind);
  const copy = KIND_COPY[kind];

  return (
    <PageShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: copy.title, url: entityKindBasePath(kind) },
        ])}
      />
      <JsonLd
        data={itemListJsonLd(
          copy.title,
          entities.map((entity) => entityPath(entity.kind, entity.slug)),
        )}
      />
      <main className="site-container" style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 20px 80px" }}>
        <h1 style={{ marginBottom: 10, fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}>{copy.title}</h1>
        <p style={{ marginBottom: 24, maxWidth: "68ch", color: "#3f433d", lineHeight: 1.6 }}>{copy.intro}</p>
        <ul style={{ display: "grid", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
          {entities.map((entity) => (
            <li key={entity.slug} style={{ borderBottom: "1px solid #eceee8", paddingBottom: 10 }}>
              <Link href={entityPath(entity.kind, entity.slug)} style={{ fontWeight: 650, textDecoration: "underline" }}>
                {entity.label}
              </Link>
              <span style={{ marginLeft: 10, color: "#5f625d", fontSize: 13 }}>
                {entity.recordIds.length} linked record{entity.recordIds.length === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      </main>
    </PageShell>
  );
}
