import {
  COMMUNITY_GROUPS,
  KNOWLEDGE_AREAS,
  LANGUAGES,
  REGIONS,
} from "@/lib/archive-metadata";
import { getPublicArchiveRecords } from "@/lib/kgo/records";
import { entitySameAsUrls } from "@/lib/kgo/sameAs";
import { slugifyEntity } from "@/lib/kgo/site";

export type EntityKind =
  | "knowledge"
  | "community"
  | "language"
  | "region"
  | "source"
  | "country";

export type EntityNode = {
  kind: EntityKind;
  slug: string;
  label: string;
  description: string;
  recordIds: string[];
  sameAs: string[];
};

const ENTITY_HELP: Record<EntityKind, string> = {
  knowledge:
    "A broad field of study or knowledge tradition used by ARED to connect records with related scholarship and collections.",
  community:
    "A community, cultural group or knowledge-holding people connected to records in the archive.",
  language:
    "A language represented in ARED records, including African languages, diaspora languages and multilingual materials.",
  region:
    "A geographic or cultural region used to situate records across Africa, the diaspora and the Global South.",
  source:
    "A holding institution, archive, museum, publisher or source pathway supplying record metadata.",
  country:
    "A country or territory associated with records, communities or knowledge systems in ARED.",
};

function uniqueLabels(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    const label = String(value || "").trim();
    if (!label) return;
    const key = slugifyEntity(label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(label);
  });
  return out;
}

export async function buildEntityIndex(): Promise<EntityNode[]> {
  const records = await getPublicArchiveRecords();
  const buckets = new Map<string, EntityNode>();

  const ensure = (kind: EntityKind, label: string) => {
    const slug = slugifyEntity(label);
    if (!slug) return null;
    const key = `${kind}:${slug}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        kind,
        slug,
        label,
        description: `${ENTITY_HELP[kind]} Entity: ${label}.`,
        recordIds: [],
        sameAs: entitySameAsUrls(kind, label),
      });
    }
    return buckets.get(key)!;
  };

  KNOWLEDGE_AREAS.forEach((label) => ensure("knowledge", label));
  COMMUNITY_GROUPS.forEach((label) => ensure("community", label));
  LANGUAGES.forEach((label) => ensure("language", label));
  REGIONS.forEach((label) => ensure("region", label));

  records.forEach((record) => {
    uniqueLabels(record.knowledgeAreas || []).forEach((label) => {
      const node = ensure("knowledge", label);
      node?.recordIds.push(record.id);
    });
    uniqueLabels(record.communityOrCulturalGroup || []).forEach((label) => {
      const node = ensure("community", label);
      node?.recordIds.push(record.id);
    });
    uniqueLabels(record.language || []).forEach((label) => {
      const node = ensure("language", label);
      node?.recordIds.push(record.id);
    });
    uniqueLabels(record.region || []).forEach((label) => {
      const node = ensure("region", label);
      node?.recordIds.push(record.id);
    });
    uniqueLabels(record.country || []).forEach((label) => {
      const node = ensure("country", label);
      node?.recordIds.push(record.id);
    });
    if (record.sourceName) {
      const node = ensure("source", record.sourceName);
      node?.recordIds.push(record.id);
    }
  });

  return Array.from(buckets.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export async function getEntity(kind: EntityKind, slug: string): Promise<EntityNode | null> {
  const index = await buildEntityIndex();
  return index.find((node) => node.kind === kind && node.slug === slug) || null;
}

export async function listEntities(kind: EntityKind): Promise<EntityNode[]> {
  const index = await buildEntityIndex();
  return index.filter((node) => node.kind === kind);
}

export function entityKindBasePath(kind: EntityKind): string {
  // Avoid collision with Reading Commons (/community) and Global Knowledge Systems (/knowledge).
  if (kind === "community") return "/communities";
  if (kind === "knowledge") return "/knowledge-areas";
  return `/${kind}`;
}

export function entityPath(kind: EntityKind, slug: string): string {
  return `${entityKindBasePath(kind)}/${encodeURIComponent(slug)}`;
}

export function entitySchemaType(kind: EntityKind): string {
  switch (kind) {
    case "community":
      return "Organization";
    case "language":
      return "Language";
    case "region":
    case "country":
      return "Place";
    case "source":
      return "Organization";
    case "knowledge":
    default:
      return "DefinedTerm";
  }
}
