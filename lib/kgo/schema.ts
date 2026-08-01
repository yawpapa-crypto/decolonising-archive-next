import type { ArchiveRecord } from "@/lib/archive-metadata";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/kgo/site";
import { recordDescription } from "@/lib/kgo/records";
import { recordSameAsUrls } from "@/lib/kgo/sameAs";

type JsonLd = Record<string, unknown>;

function schemaTypeForRecord(record: ArchiveRecord): string {
  const type = String(record.recordType?.[0] || record.type || "").toLowerCase();
  if (type.includes("book")) return "Book";
  if (type.includes("journal") || type.includes("article")) return "ScholarlyArticle";
  if (type.includes("dataset") || type.includes("metadata")) return "Dataset";
  if (type.includes("image") || type.includes("poster") || type.includes("visual")) return "VisualArtwork";
  if (type.includes("map")) return "Map";
  if (type.includes("oral") || type.includes("performance")) return "CreativeWork";
  if (type.includes("architecture")) return "CreativeWork";
  return "CreativeWork";
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: ["ARED", "Decolonising Archive"],
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/library?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: "ARED",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: absoluteUrl("/og-image.jpg"),
    sameAs: ["https://ko-fi.com/areddesign", "https://yofosuasare.com"],
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function recordJsonLd(record: ArchiveRecord): JsonLd {
  const url = absoluteUrl(`/records/${encodeURIComponent(record.id)}`);
  const keywords = Array.from(
    new Set([
      ...(record.knowledgeAreas || []),
      ...(record.tags || []),
      ...(record.keywords || []),
      ...(record.communityOrCulturalGroup || []),
      ...(record.region || []),
    ]),
  ).filter(Boolean);

  const sameAs = recordSameAsUrls(record);

  return {
    "@context": "https://schema.org",
    "@type": schemaTypeForRecord(record),
    "@id": url,
    url,
    name: record.title,
    headline: record.title,
    description: recordDescription(record),
    identifier: [
      record.identifier || record.recordIdentifier || record.id,
      record.doi ? { "@type": "PropertyValue", propertyID: "DOI", value: record.doi } : null,
      record.externalIds?.orcid
        ? { "@type": "PropertyValue", propertyID: "ORCID", value: record.externalIds.orcid }
        : null,
      record.externalIds?.ror
        ? { "@type": "PropertyValue", propertyID: "ROR", value: record.externalIds.ror }
        : null,
      record.externalIds?.wikidata
        ? { "@type": "PropertyValue", propertyID: "Wikidata", value: record.externalIds.wikidata }
        : null,
    ].filter(Boolean),
    creator: record.creator
      ? {
          "@type": "Person",
          name: record.creator,
          sameAs: record.externalIds?.orcid
            ? [record.externalIds.orcid.startsWith("http") ? record.externalIds.orcid : `https://orcid.org/${record.externalIds.orcid}`]
            : undefined,
        }
      : undefined,
    contributor: (record.contributors || []).map((name) => ({
      "@type": "Person",
      name,
    })),
    about: (record.knowledgeAreas || []).map((term) => ({
      "@type": "DefinedTerm",
      name: term,
      inDefinedTermSet: absoluteUrl("/knowledge-areas"),
      url: absoluteUrl(`/knowledge-areas/${encodeURIComponent(slugFromLabel(term))}`),
    })),
    keywords,
    inLanguage: record.language,
    spatialCoverage: [...(record.country || []), ...(record.region || [])].filter(Boolean),
    dateCreated: record.dateCreated || undefined,
    datePublished: record.datePublished || undefined,
    license: record.licence || record.rightsStatementUri || undefined,
    copyrightNotice: record.rightsStatus || undefined,
    isPartOf: {
      "@type": "Collection",
      name: record.collection || SITE_NAME,
      url: absoluteUrl("/library"),
    },
    citation: record.citation || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    provider: {
      "@type": "Organization",
      name: record.sourceName || record.institution || SITE_NAME,
      url: record.sourceUrl || SITE_URL,
    },
  };
}

export function entityJsonLd(options: {
  type: string;
  name: string;
  description: string;
  url: string;
  sameAs?: string[];
  additionalType?: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": options.type,
    "@id": absoluteUrl(options.url),
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.url),
    additionalType: options.additionalType,
    sameAs: options.sameAs?.length ? options.sameAs : undefined,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
    },
  };
}

export function itemListJsonLd(name: string, urls: string[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: urls.length,
    itemListElement: urls.map((url, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(url),
    })),
  };
}

function slugFromLabel(value: string): string {
  return String(value || "")
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
