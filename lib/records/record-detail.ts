/**
 * Canonical record detail (contract v1) shared by ared.design and AR/D Fieldnotes.
 *
 * - Catalogue records resolve from the website's public archive (`getPublicArchiveRecord`).
 * - Live external results use a namespaced reference `<provider>-<providerId>` and are resolved
 *   on demand through the provider's public API. They are never written to the catalogue.
 * - Citations reuse `generateCollectionCitation` so website and app text is identical.
 * - Missing metadata is returned as null; nothing is inferred or invented.
 */
import { getPublicArchiveRecord, getPublicArchiveRecords } from "@/lib/kgo/records";
import { generateCollectionCitation, type CitationStyleId } from "@/lib/research/citation-formats";
import { absoluteUrl } from "@/lib/kgo/site";
import type { ArchiveRecord } from "@/lib/archive-metadata";
import { getGhanaItem, GHANA_COLLECTION_META, type GhanaArchiveItem } from "@/lib/data/ghana-collection";
import { collectionRecordPath, GHANA_COLLECTION_SLUG } from "@/lib/research/collection-record-research";

export type Origin = "catalogue" | "external";
export type CitationSubject = "catalogue_entry" | "original_work" | "digital_image";
export type LinkKind = "item" | "search" | "homepage";

export type RecordDetail = {
  version: 1;
  id: string;
  status: "ok";
  origin: Origin;
  recordType: string | null;
  mediaType: "image" | "text" | "audio" | "video" | null;
  provider: { name: string; recordId: string } | null;
  catalogueRecordId: string | null;
  title: string;
  creator: string | null;
  contributors: string[];
  date: string | null;
  description: { text: string; origin: "ared_editorial" | "source" } | null;
  place: { region: string[]; country: string[]; place: string[] };
  subjects: string[];
  taxonomy: { period: string[]; knowledgeAreas: string[] };
  images: Array<{ url: string; role: "primary" | "thumbnail" }>;
  source: {
    institution: string | null;
    itemUrl: string | null;
    itemUrlKind: LinkKind | null;
    catalogueUrl: string | null;
    retrievedAt: string | null;
  };
  rights: {
    statement: string | null;
    licence: string | null;
    uri: string | null;
    holder: string | null;
    attribution: string | null;
    reuse: string | null;
  };
  identifiers: { doi: string | null; isbn: string | null; accession: string | null; provider: string | null };
  citation: {
    subject: CitationSubject;
    metadata: { title: string; creator: string | null; date: string | null; publisher: string | null; url: string };
    apa: string;
    chicago: string;
    mla: string;
    missing: string[];
    exports: { ris: string | null; bibtex: string | null };
    note: string;
  };
  permalink: string | null;
  related: { searchQuery: string | null };
};

export type DetailError = { status: 404 | 400 | 503; error: string; code: "not_found" | "invalid_reference" | "provider_unavailable" };

const PROVIDERS: Record<string, string> = {
  cr: "Crossref", oa: "OpenAlex", ol: "Open Library", s2: "Semantic Scholar", wc: "Wikimedia Commons", europeana: "Europeana",
};

export function parseReference(id: string): { provider: string; providerId: string } | null {
  const match = id.match(/^(cr|oa|ol|s2|wc|europeana)-(.+)$/);
  return match ? { provider: match[1]!, providerId: match[2]! } : null;
}

/** A link is only "item" when it plausibly identifies one object; search pages and bare homepages are labelled as such. */
export function classifyLink(raw: string | null | undefined): LinkKind | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (/^\/?$/.test(url.pathname) && !url.search) return "homepage";
    const keys = [...url.searchParams.keys()].map((k) => k.toLowerCase());
    if (/\/search\b|\/results\b/i.test(url.pathname) || keys.some((k) => ["q", "query", "keyword", "keywords", "search", "searchterm"].includes(k))) return "search";
    return "item";
  } catch {
    return null;
  }
}

const clean = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : []);

function citations(input: {
  id: string; title: string; creator: string | null; date: string | null; recordType: string | null;
  institution: string | null; accession: string | null; sourceName: string | null; sourceUrl: string | null;
  subject: CitationSubject; collectionTitle: string; canonicalUrl: string;
}): Pick<RecordDetail["citation"], "apa" | "chicago" | "mla" | "missing" | "note"> {
  // The engine prepends `origin` to `canonicalPath`; passing a full URL with an empty origin keeps it intact.
  const base = {
    itemType: "library_record" as const, itemId: input.id, collectionSlug: "archive", collectionTitle: input.collectionTitle,
    title: input.title, creator: input.creator, date: input.date, recordType: input.recordType, institution: input.institution,
    accession: input.accession, sourceName: input.sourceName, sourceUrl: input.sourceUrl, canonicalPath: input.canonicalUrl,
  };
  const run = (style: CitationStyleId) => generateCollectionCitation(base, style, "").formatted;
  const missing = [!input.creator && "creator", !input.date && "date", !input.institution && "institution"].filter(Boolean) as string[];
  const subjectNote = input.subject === "catalogue_entry"
    ? "Cites the AR/D catalogue entry for this item."
    : input.subject === "digital_image"
      ? "Cites the digital image as published by the provider."
      : "Cites the original work as described by the provider.";
  return { apa: run("apa"), chicago: run("chicago"), mla: run("mla"), missing, note: `${subjectNote}${missing.length ? ` Unrecorded: ${missing.join(", ")}.` : ""}` };
}

function mediaTypeOf(types: string[], hasImage: boolean): RecordDetail["mediaType"] {
  const t = types.join(" ").toLowerCase();
  if (/audio|sound|recording/.test(t)) return "audio";
  if (/video|film|moving/.test(t)) return "video";
  if (hasImage || /image|photo|poster|artefact|object|textile|map/.test(t)) return "image";
  return types.length ? "text" : null;
}

function fromCatalogue(record: ArchiveRecord): RecordDetail {
  const permalink = absoluteUrl(`/records/${encodeURIComponent(record.id)}`);
  const creator = clean(record.creator);
  const date = clean(record.datePublished) || clean(record.dateCreated) || clean(record.period?.[0]);
  const institution = clean(record.institution) || clean(record.sourceName);
  const sourceUrl = clean(record.sourceUrl);
  const image = clean((record as unknown as { image?: string; imageUrl?: string }).image) || clean((record as unknown as { imageUrl?: string }).imageUrl);
  const recordType = record.recordType?.[0] ?? null;
  const text = clean(record.description) || clean(record.summary);
  return {
    version: 1, id: record.id, status: "ok", origin: "catalogue", recordType,
    mediaType: mediaTypeOf(record.recordType ?? [], !!image),
    provider: null, catalogueRecordId: record.id,
    title: record.title, creator, contributors: list(record.contributors), date,
    description: text ? { text, origin: "ared_editorial" } : null,
    place: { region: list(record.region), country: list(record.country), place: list(record.place) },
    subjects: [...new Set([...list(record.tags), ...list(record.keywords)])],
    taxonomy: { period: list(record.period), knowledgeAreas: list(record.knowledgeAreas) },
    images: image ? [{ url: image, role: "primary" }] : [],
    source: { institution, itemUrl: sourceUrl, itemUrlKind: classifyLink(sourceUrl), catalogueUrl: null, retrievedAt: null },
    rights: {
      statement: clean(record.rightsStatus) && !/unknown|unrecorded|not evaluated/i.test(record.rightsStatus) ? clean(record.rightsStatus) : null,
      licence: clean(record.licence), uri: clean(record.rightsStatementUri), holder: clean(record.rightsHolder),
      attribution: clean(record.recommendedAttribution), reuse: clean(record.reusePermission),
    },
    identifiers: { doi: clean(record.doi), isbn: clean(record.isbn), accession: clean(record.identifier) || clean(record.recordIdentifier), provider: null },
    citation: {
      subject: "catalogue_entry",
      metadata: { title: record.title, creator, date, publisher: institution, url: permalink },
      ...citations({ id: record.id, title: record.title, creator, date, recordType, institution, accession: clean(record.identifier), sourceName: clean(record.sourceName), sourceUrl, subject: "catalogue_entry", collectionTitle: "Decolonising Archive", canonicalUrl: permalink }),
      exports: {
        ris: absoluteUrl(`/api/records/${encodeURIComponent(record.id)}/citation?format=ris`),
        bibtex: absoluteUrl(`/api/records/${encodeURIComponent(record.id)}/citation?format=bibtex`),
      },
    },
    permalink,
    related: { searchQuery: record.title.split(/[:—–(]/)[0]!.trim() || null },
  };
}

type External = {
  title: string; creator: string | null; contributors?: string[]; date: string | null; description: string | null; recordType: string | null;
  institution: string | null; itemUrl: string | null; image: string | null; doi?: string | null; isbn?: string | null;
  licence?: string | null; licenceUri?: string | null; attribution?: string | null; subjects?: string[];
};

async function getJson(url: string): Promise<unknown | "not_found"> {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "ARED/1.0 (https://ared.design)" }, signal: AbortSignal.timeout(7000), next: { revalidate: 3600 } } as RequestInit);
  if (res.status === 404 || res.status === 410) return "not_found";
  if (!res.ok) throw new Error(`provider ${res.status}`);
  return res.json();
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
const strip = (html: string | null) => (html ? html.replace(/<[^>]+>/g, " ").replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e: string) => ENTITIES[e]!).replace(/\s+/g, " ").trim() || null : null);

async function resolveExternal(provider: string, id: string): Promise<External | "not_found" | "unsupported"> {
  if (provider === "cr") {
    const d = await getJson(`https://api.crossref.org/works/${encodeURIComponent(id)}`);
    if (d === "not_found") return d;
    const m = (d as { message: Record<string, any> }).message;
    // "Family, Given" keeps compound surnames intact when the citation engine inverts names.
    const authors = (m.author || []).map((a: any) => a.family && a.given ? `${a.family}, ${a.given}` : a.family || a.name || a.given || "").filter(Boolean);
    const year = m.issued?.["date-parts"]?.[0]?.[0];
    return { title: m.title?.[0] || id, creator: authors[0] ?? null, contributors: authors.slice(1), date: year ? String(year) : null, description: strip(m.abstract ?? null),
      recordType: m.type ?? null, institution: m.publisher ?? null, itemUrl: m.URL ?? `https://doi.org/${id}`, image: null, doi: m.DOI ?? id,
      isbn: m.ISBN?.[0] ?? null, licence: null, licenceUri: m.license?.[0]?.URL ?? null, subjects: m.subject ?? [] };
  }
  if (provider === "oa") {
    const d = await getJson(`https://api.openalex.org/works/${encodeURIComponent(id)}`);
    if (d === "not_found") return d;
    const m = d as Record<string, any>;
    const authors = (m.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean);
    return { title: m.display_name || id, creator: authors[0] ?? null, contributors: authors.slice(1), date: m.publication_year ? String(m.publication_year) : null, description: null,
      recordType: m.type ?? null, institution: m.primary_location?.source?.display_name ?? null, itemUrl: m.doi || m.primary_location?.landing_page_url || m.id || null, image: null,
      doi: m.doi ? String(m.doi).replace(/^https?:\/\/doi\.org\//, "") : null, licence: m.primary_location?.license ?? null, subjects: (m.concepts || []).slice(0, 8).map((c: any) => c.display_name) };
  }
  if (provider === "ol") {
    const key = id.replace(/^works/, "");
    const d = await getJson(`https://openlibrary.org/works/${encodeURIComponent(key)}.json`);
    if (d === "not_found") return d;
    const m = d as Record<string, any>;
    const authorKeys: string[] = (m.authors || []).map((a: any) => a.author?.key).filter(Boolean).slice(0, 3);
    const authors = (await Promise.all(authorKeys.map(async (k) => { try { const a = await getJson(`https://openlibrary.org${k}.json`); return a === "not_found" ? null : (a as any).name ?? null; } catch { return null; } }))).filter(Boolean) as string[];
    const desc = typeof m.description === "string" ? m.description : m.description?.value ?? null;
    return { title: m.title || key, creator: authors[0] ?? null, contributors: authors.slice(1), date: clean(m.first_publish_date), description: desc, recordType: "book",
      institution: "Open Library", itemUrl: `https://openlibrary.org/works/${key}`, image: m.covers?.[0] ? `https://covers.openlibrary.org/b/id/${m.covers[0]}-L.jpg` : null, subjects: (m.subjects || []).slice(0, 8) };
  }
  if (provider === "s2") {
    const d = await getJson(`https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(id)}?fields=title,authors,year,venue,abstract,externalIds,url,publicationTypes`);
    if (d === "not_found") return d;
    const m = d as Record<string, any>;
    const authors = (m.authors || []).map((a: any) => a.name).filter(Boolean);
    return { title: m.title || id, creator: authors[0] ?? null, contributors: authors.slice(1), date: m.year ? String(m.year) : null, description: m.abstract ?? null,
      recordType: m.publicationTypes?.[0] ?? "article", institution: clean(m.venue), itemUrl: m.externalIds?.DOI ? `https://doi.org/${m.externalIds.DOI}` : m.url ?? null, image: null, doi: m.externalIds?.DOI ?? null };
  }
  if (provider === "wc") {
    const d = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&format=json&pageids=${encodeURIComponent(id)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600`);
    if (d === "not_found") return d;
    const page = Object.values(((d as any).query?.pages) || {})[0] as any;
    if (!page || page.missing !== undefined || !page.imageinfo?.[0]) return "not_found";
    const info = page.imageinfo[0]; const meta = info.extmetadata || {};
    const value = (k: string) => strip(meta[k]?.value ?? null);
    return { title: value("ObjectName") || String(page.title || id).replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, ""), creator: value("Artist"), date: value("DateTimeOriginal"),
      description: value("ImageDescription"), recordType: "image", institution: "Wikimedia Commons", itemUrl: info.descriptionurl ?? null, image: info.thumburl || info.url || null,
      licence: value("LicenseShortName"), licenceUri: clean(meta.LicenseUrl?.value),
      // Commons "Credit" is often the boilerplate "Own work"; that names no one, so fall back to the author.
      attribution: value("Attribution") || (value("Credit") && !/^own work$/i.test(value("Credit")!) ? value("Credit") : null) || (value("Artist") ? `${value("Artist")}, ${value("LicenseShortName") ?? "see licence"}, via Wikimedia Commons` : null) };
  }
  if (provider === "europeana") {
    const key = process.env.EUROPEANA_API_KEY;
    if (!key) return "unsupported";
    const d = await getJson(`https://api.europeana.eu/record/v2${id.startsWith("/") ? id : `/${id}`}.json?wskey=${encodeURIComponent(key)}`);
    if (d === "not_found") return d;
    const o = (d as any).object || {};
    const proxy = (o.proxies || []).find((p: any) => p.europeanaProxy === false) || o.proxies?.[0] || {};
    const pick = (f: any) => (f ? (Object.values(f)[0] as string[] | undefined)?.[0] ?? null : null);
    const agg = o.aggregations?.[0] || {};
    const providerRef = pick(agg.edmDataProvider);
    const org = (o.organizations || []).find((x: any) => x.about === providerRef);
    const institution = org ? pick(org.prefLabel) : providerRef && !/^https?:/.test(providerRef) ? providerRef : null;
    return { title: pick(proxy.dcTitle) || id, creator: pick(proxy.dcCreator), date: pick(proxy.dcDate) || pick(proxy.dctermsCreated), description: pick(proxy.dcDescription),
      recordType: o.type ?? null, institution, itemUrl: agg.edmIsShownAt ?? `https://www.europeana.eu/item${id}`, image: agg.edmIsShownBy ?? agg.edmObject ?? null,
      licenceUri: agg.edmRights ? pick(agg.edmRights) : null };
  }
  return "unsupported";
}

async function catalogueMatch(ext: External, provider: string, providerId: string): Promise<string | null> {
  const doi = ext.doi?.toLowerCase();
  const records = await getPublicArchiveRecords();
  const hit = records.find((r) =>
    (doi && r.doi?.toLowerCase() === doi) ||
    (provider === "oa" && r.externalIds?.openAlex?.endsWith(providerId)) ||
    (provider === "europeana" && r.externalIds?.europeana?.endsWith(providerId)));
  return hit?.id ?? null;
}

function fromGhana(item: GhanaArchiveItem, id: string): RecordDetail {
  const permalink = absoluteUrl(collectionRecordPath(GHANA_COLLECTION_SLUG, item.id));
  const sourceUrl = item.source_url || item.external_link;
  const institution = clean(item.source_name);
  const date = clean(item.date);
  const cite = citations({ id: item.id, title: item.title, creator: item.creator, date, recordType: item.format, institution, accession: null,
    sourceName: institution, sourceUrl, subject: "catalogue_entry", collectionTitle: GHANA_COLLECTION_META.title, canonicalUrl: permalink });
  const image = item.image_url || item.thumbnail_url;
  return {
    version: 1, id, status: "ok", origin: "catalogue", recordType: item.format, mediaType: image ? "image" : "text",
    provider: null, catalogueRecordId: id,
    title: item.title, creator: item.creator, contributors: [], date: clean(item.date_display) || date,
    description: item.description ? { text: item.description, origin: "ared_editorial" } : null,
    place: { region: [], country: [item.country].filter(Boolean), place: [item.location].filter((x): x is string => !!x) },
    subjects: item.tags, taxonomy: { period: [], knowledgeAreas: [] },
    images: image ? [{ url: image, role: "primary" }] : [],
    source: { institution, itemUrl: sourceUrl, itemUrlKind: classifyLink(sourceUrl), catalogueUrl: null, retrievedAt: null },
    rights: { statement: clean(item.rights_note), licence: clean(item.licence), uri: null, holder: null, attribution: null, reuse: null },
    identifiers: { doi: null, isbn: null, accession: null, provider: null },
    citation: { subject: "catalogue_entry", metadata: { title: item.title, creator: item.creator, date, publisher: institution, url: permalink }, ...cite,
      exports: { ris: absoluteUrl(`/api/v1/records/${encodeURIComponent(id)}?format=ris`), bibtex: absoluteUrl(`/api/v1/records/${encodeURIComponent(id)}?format=bibtex`) } },
    permalink,
    related: { searchQuery: item.title.split(/[:—–(]/)[0]!.trim() || null },
  };
}

export async function getRecordDetail(rawId: string): Promise<RecordDetail | DetailError> {
  const id = rawId.trim().slice(0, 300);
  if (!id) return { status: 400, code: "invalid_reference", error: "Missing record reference" };
  const local = await getPublicArchiveRecord(id);
  if (local) return fromCatalogue(local);
  const ghana = id.match(/^ared-(gh-\d+)$/i);
  if (ghana) {
    const item = getGhanaItem(ghana[1]!.toLowerCase());
    if (item) return fromGhana(item, id);
  }
  const ref = parseReference(id);
  if (!ref) return { status: 404, code: "not_found", error: "Record not found in the AR/D archive" };
  let ext: External | "not_found" | "unsupported";
  try { ext = await resolveExternal(ref.provider, ref.providerId); }
  catch { return { status: 503, code: "provider_unavailable", error: `${PROVIDERS[ref.provider]} is not responding; try again later` }; }
  if (ext === "not_found") return { status: 404, code: "not_found", error: `${PROVIDERS[ref.provider]} no longer has this record` };
  if (ext === "unsupported") return { status: 503, code: "provider_unavailable", error: `${PROVIDERS[ref.provider]} records cannot be resolved right now` };
  const providerName = PROVIDERS[ref.provider]!;
  const subject: CitationSubject = ref.provider === "wc" ? "digital_image" : "original_work";
  const itemUrl = ext.itemUrl;
  const retrievedAt = new Date().toISOString();
  const cite = citations({ id, title: ext.title, creator: ext.creator, date: ext.date, recordType: ext.recordType, institution: ext.institution, accession: null,
    sourceName: providerName, sourceUrl: itemUrl, subject, collectionTitle: `via ${providerName}`, canonicalUrl: itemUrl || "" });
  const exportUrl = (format: string) => absoluteUrl(`/api/v1/records/${encodeURIComponent(id)}?format=${format}`);
  return {
    version: 1, id, status: "ok", origin: "external", recordType: ext.recordType,
    mediaType: mediaTypeOf(ext.recordType ? [ext.recordType] : [], !!ext.image),
    provider: { name: providerName, recordId: ref.providerId },
    catalogueRecordId: await catalogueMatch(ext, ref.provider, ref.providerId),
    title: ext.title, creator: ext.creator, contributors: ext.contributors ?? [], date: ext.date,
    description: ext.description ? { text: ext.description, origin: "source" } : null,
    place: { region: [], country: [], place: [] }, subjects: ext.subjects ?? [], taxonomy: { period: [], knowledgeAreas: [] },
    images: ext.image ? [{ url: ext.image, role: "primary" }] : [],
    source: { institution: ext.institution, itemUrl, itemUrlKind: classifyLink(itemUrl), catalogueUrl: null, retrievedAt },
    rights: { statement: null, licence: ext.licence ?? null, uri: ext.licenceUri ?? null, holder: null, attribution: ext.attribution ?? null, reuse: null },
    identifiers: { doi: ext.doi ?? null, isbn: ext.isbn ?? null, accession: null, provider: `${providerName}: ${ref.providerId}` },
    citation: { subject, metadata: { title: ext.title, creator: ext.creator, date: ext.date, publisher: ext.institution, url: itemUrl || "" }, ...cite, exports: { ris: exportUrl("ris"), bibtex: exportUrl("bibtex") } },
    permalink: null,
    related: { searchQuery: ext.title.split(/[:—–(]/)[0]!.trim() || null },
  };
}

/** RIS / BibTeX text for a resolved record, from the same citation engine. */
export function exportCitation(detail: RecordDetail, format: "ris" | "bibtex"): string {
  return generateCollectionCitation({
    itemType: "library_record", itemId: detail.id, collectionSlug: "archive",
    collectionTitle: detail.origin === "catalogue" ? "Decolonising Archive" : `via ${detail.provider?.name}`,
    title: detail.title, creator: detail.creator, date: detail.citation.metadata.date, recordType: detail.recordType,
    institution: detail.source.institution, accession: detail.identifiers.accession, sourceName: detail.provider?.name ?? detail.source.institution,
    sourceUrl: detail.source.itemUrl, canonicalPath: detail.citation.metadata.url,
  }, format, "").formatted;
}
