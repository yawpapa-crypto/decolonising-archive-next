import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import JsonLd from "@/src/components/kgo/JsonLd";
import {
  entityKindBasePath,
  entityPath,
  entitySchemaType,
  type EntityKind,
  type EntityNode,
} from "@/lib/kgo/entities";
import { getPublicArchiveRecords } from "@/lib/kgo/records";
import {
  breadcrumbJsonLd,
  entityJsonLd,
  itemListJsonLd,
} from "@/lib/kgo/schema";
import { slugifyEntity } from "@/lib/kgo/site";

const KIND_LABEL: Record<EntityKind, string> = {
  knowledge: "Knowledge area",
  community: "Community",
  language: "Language",
  region: "Region",
  source: "Source",
  country: "Country",
};

type EntityPageProps = {
  entity: EntityNode;
};

export default async function EntityPage({ entity }: EntityPageProps) {
  const records = await getPublicArchiveRecords();
  const related = records.filter((record) => entity.recordIds.includes(record.id));
  const path = entityPath(entity.kind, entity.slug);

  const connectedKinds: EntityKind[] = ["knowledge", "community", "language", "region", "source", "country"];
  const connected = new Map<string, { kind: EntityKind; label: string; slug: string }>();
  related.forEach((record) => {
    const pairs: Array<[EntityKind, string[]]> = [
      ["knowledge", record.knowledgeAreas || []],
      ["community", record.communityOrCulturalGroup || []],
      ["language", record.language || []],
      ["region", record.region || []],
      ["country", record.country || []],
      ["source", record.sourceName ? [record.sourceName] : []],
    ];
    pairs.forEach(([kind, labels]) => {
      labels.forEach((label) => {
        const slug = slugifyEntity(label);
        if (!slug || (kind === entity.kind && slug === entity.slug)) return;
        connected.set(`${kind}:${slug}`, { kind, label, slug });
      });
    });
  });

  return (
    <PageShell>
      <JsonLd
        data={entityJsonLd({
          type: entitySchemaType(entity.kind),
          name: entity.label,
          description: entity.description,
          url: path,
          sameAs: entity.sameAs,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: KIND_LABEL[entity.kind], url: entityKindBasePath(entity.kind) },
          { name: entity.label, url: path },
        ])}
      />
      <JsonLd
        data={itemListJsonLd(
          `Records related to ${entity.label}`,
          related.map((record) => `/records/${record.id}`),
        )}
      />

      <main className="site-container" style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 20px 80px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 18, fontSize: 13, color: "#5f625d" }}>
          <Link href="/">Home</Link>
          <span aria-hidden="true"> / </span>
          <Link href={entityKindBasePath(entity.kind)}>{KIND_LABEL[entity.kind]}</Link>
          <span aria-hidden="true"> / </span>
          <span>{entity.label}</span>
        </nav>

        <p style={{ marginBottom: 8, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5f625d" }}>
          {KIND_LABEL[entity.kind]}
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(1.8rem, 4vw, 2.6rem)", lineHeight: 1.1 }}>
          {entity.label}
        </h1>
        <p style={{ marginBottom: 28, maxWidth: "68ch", color: "#3f433d", fontSize: 16, lineHeight: 1.6 }}>
          {entity.description}
        </p>

        {entity.sameAs.length ? (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Linked identifiers</h2>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#3f433d", fontSize: 14, lineHeight: 1.6 }}>
              {entity.sameAs.map((href) => (
                <li key={href}>
                  <a href={href} rel="noopener noreferrer" target="_blank">
                    {href}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Related records</h2>
          {related.length ? (
            <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0, margin: 0 }}>
              {related.map((record) => (
                <li key={record.id} style={{ border: "1px solid #dedfd9", borderRadius: 12, padding: 14 }}>
                  <Link href={`/records/${encodeURIComponent(record.id)}`} style={{ fontWeight: 700, textDecoration: "underline" }}>
                    {record.title}
                  </Link>
                  <p style={{ margin: "6px 0 0", color: "#5f625d", fontSize: 14 }}>
                    {[record.creator, record.sourceName, (record.region || [])[0]].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#5f625d" }}>No indexed records are currently linked to this entity.</p>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Connected entities</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Array.from(connected.values())
              .filter((node) => connectedKinds.includes(node.kind))
              .slice(0, 40)
              .map((node) => (
                <Link
                  key={`${node.kind}-${node.slug}`}
                  href={entityPath(node.kind, node.slug)}
                  style={{
                    border: "1px solid #dedfd9",
                    borderRadius: 999,
                    padding: "6px 12px",
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  {KIND_LABEL[node.kind]}: {node.label}
                </Link>
              ))}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
