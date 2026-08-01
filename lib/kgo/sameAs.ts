import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { ArchiveRecord } from "@/lib/archive-metadata";
import type { EntityKind } from "@/lib/kgo/entities";
import { slugifyEntity } from "@/lib/kgo/site";

export type SameAsLinks = {
  wikidata?: string | null;
  orcid?: string | null;
  ror?: string | null;
  geonames?: string | null;
  gettyAat?: string | null;
  viaf?: string | null;
  libraryOfCongress?: string | null;
  openAlex?: string | null;
  crossref?: string | null;
  worldcat?: string | null;
  europeana?: string | null;
  unesco?: string | null;
  wikipedia?: string | null;
  localContexts?: string | null;
};

type SameAsCatalog = Record<string, Record<string, SameAsLinks>>;

const catalogPath = path.join(process.cwd(), "data/kgo/entity-sameas.json");

const readCatalog = cache((): SameAsCatalog => {
  try {
    return JSON.parse(fs.readFileSync(catalogPath, "utf8")) as SameAsCatalog;
  } catch {
    return {};
  }
});

export function wikidataUrl(id?: string | null): string | undefined {
  if (!id) return undefined;
  const qid = id.startsWith("Q") || id.startsWith("http") ? id : `Q${id}`;
  if (qid.startsWith("http")) return qid;
  return `https://www.wikidata.org/entity/${qid}`;
}

export function geonamesUrl(id?: string | null): string | undefined {
  if (!id) return undefined;
  if (id.startsWith("http")) return id;
  return `https://www.geonames.org/${id}`;
}

export function orcidUrl(id?: string | null): string | undefined {
  if (!id) return undefined;
  if (id.startsWith("http")) return id;
  return `https://orcid.org/${id}`;
}

export function rorUrl(id?: string | null): string | undefined {
  if (!id) return undefined;
  if (id.startsWith("http")) return id;
  return `https://ror.org/${id.replace(/^ror\.org\//, "")}`;
}

export function sameAsUrlsFromLinks(links?: SameAsLinks | null): string[] {
  if (!links) return [];
  return [
    wikidataUrl(links.wikidata),
    orcidUrl(links.orcid),
    rorUrl(links.ror),
    geonamesUrl(links.geonames),
    links.gettyAat || undefined,
    links.viaf || undefined,
    links.libraryOfCongress || undefined,
    links.openAlex || undefined,
    links.crossref || undefined,
    links.worldcat || undefined,
    links.europeana || undefined,
    links.unesco || undefined,
    links.wikipedia || undefined,
    links.localContexts || undefined,
  ].filter((value): value is string => Boolean(value));
}

export function lookupEntitySameAs(kind: EntityKind | "people", labelOrSlug: string): SameAsLinks | null {
  const catalog = readCatalog();
  const slug = slugifyEntity(labelOrSlug);
  const bucket = catalog[kind] || {};
  return bucket[slug] || null;
}

export function entitySameAsUrls(kind: EntityKind, labelOrSlug: string): string[] {
  return sameAsUrlsFromLinks(lookupEntitySameAs(kind, labelOrSlug));
}

function asExternalIds(raw: unknown): ArchiveRecord["externalIds"] {
  if (!raw || typeof raw !== "object") return {};
  const value = raw as Record<string, unknown>;
  const pick = (key: string) => {
    const item = value[key];
    return typeof item === "string" && item.trim() ? item.trim() : undefined;
  };
  return {
    openAlex: pick("openAlex"),
    crossref: pick("crossref"),
    worldcat: pick("worldcat"),
    libraryOfCongress: pick("libraryOfCongress"),
    trove: pick("trove"),
    europeana: pick("europeana"),
    wikidata: pick("wikidata"),
    orcid: pick("orcid"),
    ror: pick("ror"),
    viaf: pick("viaf"),
    gettyAat: pick("gettyAat"),
    geonames: pick("geonames"),
    unesco: pick("unesco"),
    localContexts: pick("localContexts"),
    wikipedia: pick("wikipedia"),
  };
}

export function normalizeExternalIds(raw: unknown): ArchiveRecord["externalIds"] {
  return asExternalIds(raw);
}

/** Enrich a normalized record with curated sameAs / external identifiers. */
export function enrichRecordSameAs(record: ArchiveRecord): ArchiveRecord {
  const externalIds = { ...(record.externalIds || {}) };
  const push = (key: keyof NonNullable<ArchiveRecord["externalIds"]>, value?: string) => {
    if (!value || externalIds[key]) return;
    externalIds[key] = value;
  };

  const sourceLinks = lookupEntitySameAs("source", record.sourceName || "");
  if (sourceLinks) {
    push("wikidata", wikidataUrl(sourceLinks.wikidata));
    push("ror", rorUrl(sourceLinks.ror));
    push("wikipedia", sourceLinks.wikipedia || undefined);
  }

  for (const country of record.country || []) {
    const links = lookupEntitySameAs("country", country);
    if (!links) continue;
    push("wikidata", wikidataUrl(links.wikidata));
    push("geonames", geonamesUrl(links.geonames));
    push("wikipedia", links.wikipedia || undefined);
    break;
  }

  for (const area of record.knowledgeAreas || []) {
    const links = lookupEntitySameAs("knowledge", area);
    if (!links?.wikidata) continue;
    if (!externalIds.wikidata) push("wikidata", wikidataUrl(links.wikidata));
    break;
  }

  if (record.creator) {
    const person = lookupEntitySameAs("people", record.creator);
    if (person?.orcid) push("orcid", orcidUrl(person.orcid));
    if (person?.wikidata && !externalIds.wikidata) push("wikidata", wikidataUrl(person.wikidata));
  }

  if (record.localContextsLabel || record.localContextsNotice) {
    push("localContexts", "https://localcontexts.org/");
  }

  return {
    ...record,
    externalIds,
  };
}

export function recordSameAsUrls(record: ArchiveRecord): string[] {
  const ids = record.externalIds || {};
  return Array.from(
    new Set(
      [
        record.sourceUrl,
        record.doi ? `https://doi.org/${record.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}` : "",
        ids.openAlex,
        ids.crossref,
        ids.worldcat,
        ids.libraryOfCongress,
        ids.europeana,
        ids.trove,
        wikidataUrl(ids.wikidata),
        orcidUrl(ids.orcid),
        rorUrl(ids.ror),
        ids.viaf,
        ids.gettyAat,
        geonamesUrl(ids.geonames),
        ids.unesco,
        ids.wikipedia,
        ids.localContexts,
      ].filter(Boolean) as string[],
    ),
  );
}
