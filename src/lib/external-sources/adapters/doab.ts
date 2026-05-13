import type { ExternalArchiveRecord } from "../external-record-types";
import { getOpenAccessSourceById } from "../open-access-sources";
import { normalizeRights } from "../rights-normaliser";

const DOAB_SOURCE = () => getOpenAccessSourceById("doab");
const DOAB_META_LICENCE = "CC0 1.0";

type DoabValue = { value?: string; authority?: string; language?: string; place?: number };

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

/** Flatten DSpace-style metadata map to string arrays. */
export function extractDoabMetadata(raw: Record<string, unknown>): Record<string, string[]> {
  const md = raw.metadata;
  if (!md || typeof md !== "object" || Array.isArray(md)) return {};
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(md as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const strings: string[] = [];
    for (const entry of value) {
      if (entry && typeof entry === "object" && "value" in entry) {
        const v = String((entry as DoabValue).value ?? "").trim();
        if (v) strings.push(v);
      } else if (typeof entry === "string" && entry.trim()) strings.push(entry.trim());
    }
    if (strings.length) out[key] = strings;
  }
  return out;
}

function metaFirst(meta: Record<string, string[]>, keys: string[]): string | undefined {
  for (const key of keys) {
    const direct = meta[key];
    if (direct?.[0]) return direct[0];
    const foundKey = Object.keys(meta).find((k) => k.toLowerCase() === key.toLowerCase());
    if (foundKey && meta[foundKey]?.[0]) return meta[foundKey][0];
  }
  return undefined;
}

function metaAll(meta: Record<string, string[]>, keys: string[]): string[] {
  const acc: string[] = [];
  for (const key of keys) {
    const vals =
      meta[key] ||
      Object.entries(meta).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
    if (vals?.length) acc.push(...vals);
  }
  return [...new Set(acc.map((s) => s.trim()).filter(Boolean))];
}

function collectIndexableObjects(payload: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isRecord(node)) return;

    if (
      (node.type === "item" || node.type === "Item") &&
      node.metadata &&
      typeof node.metadata === "object"
    ) {
      const id = String(
        node.uuid || node.id || node.handle || metaFirst(extractDoabMetadata(node), ["dc.title"]) || ""
      );
      const key = id || JSON.stringify(Object.keys(node)).slice(0, 120);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(node);
      }
      return;
    }

    if (isRecord(node.indexableObject)) {
      visit(node.indexableObject);
      return;
    }

    if (isRecord(node._embedded)) {
      for (const v of Object.values(node._embedded)) visit(v);
    }

    for (const k of ["objects", "items", "searchResult", "dspaceItems"]) {
      if (Array.isArray((node as Record<string, unknown>)[k]))
        visit((node as Record<string, unknown>)[k]);
    }
  };

  visit(payload);
  return out;
}

function safeBitstreamUrl(base: string, bs: Record<string, unknown>): string | undefined {
  const links = bs._links;
  const href =
    isRecord(links) && isRecord(links.content) && typeof links.content.href === "string"
      ? links.content.href
      : typeof (bs as { contentLink?: string }).contentLink === "string"
        ? String((bs as { contentLink?: string }).contentLink)
        : typeof bs.retrieveUrl === "string"
          ? String(bs.retrieveUrl)
          : "";
  if (href && /^https?:\/\//i.test(href)) return href;
  const id = typeof bs.uuid === "string" ? bs.uuid : typeof bs.id === "string" ? bs.id : "";
  if (!id) return undefined;
  const root = base.replace(/\/$/, "");
  return `${root}/server/api/core/bitstreams/${encodeURIComponent(id)}/content`;
}

function extractDownloadUrl(raw: Record<string, unknown>): string | undefined {
  const base = DOAB_SOURCE()?.baseUrl || "https://directory.doabooks.org";
  const candidates: unknown[] = [];

  if (isRecord(raw._embedded)) {
    const emb = raw._embedded as Record<string, unknown>;
    if (Array.isArray(emb.bitstreams)) candidates.push(...emb.bitstreams);
  }
  if (Array.isArray(raw.bitstreams)) candidates.push(...raw.bitstreams);

  for (const c of candidates) {
    if (!isRecord(c)) continue;
    const mime = String(c.mimeType || c.mime || "").toLowerCase();
    const name = String(c.name || "").toLowerCase();
    const bundle = String((c as { bundleName?: string }).bundleName || "").toLowerCase();
    const isPdf = mime.includes("pdf") || name.endsWith(".pdf");
    const isOriginal = bundle.includes("original");
    if (isPdf || isOriginal) {
      const url = safeBitstreamUrl(base, c);
      if (url) return url;
    }
  }
  for (const c of candidates) {
    if (!isRecord(c)) continue;
    const url = safeBitstreamUrl(base, c);
    if (url) return url;
  }
  return undefined;
}

function buildHandleUri(handle: string | undefined, uri: string | undefined): string {
  const base = DOAB_SOURCE()?.baseUrl || "https://directory.doabooks.org";
  if (uri && /^https?:\/\//i.test(uri)) return uri;
  if (handle) return `${base.replace(/\/$/, "")}/handle/${handle.replace(/^\//, "")}`;
  return base;
}

export function normaliseDoabRecord(rawRecord: Record<string, unknown>): ExternalArchiveRecord {
  const meta = extractDoabMetadata(rawRecord);
  const title =
    metaFirst(meta, ["dc.title", "dc.title.alternative"]) ||
    (typeof rawRecord.name === "string" ? rawRecord.name : "Untitled");
  const creator =
    metaFirst(meta, ["dc.contributor.author", "dc.creator", "dc.contributor"]) ||
    metaAll(meta, ["dc.contributor.author", "dc.creator"]).join(", ") ||
    undefined;
  const description =
    metaFirst(meta, ["dc.description.abstract", "dc.description"]) ||
    metaAll(meta, ["dc.description.abstract"]).join("\n\n") ||
    undefined;
  const publisher = metaFirst(meta, ["dc.publisher", "publisher.name"]);
  const publicationDate = metaFirst(meta, ["dc.date.issued", "dc.date.issued_dt"]);
  const handle =
    metaFirst(meta, ["handle"]) || (typeof rawRecord.handle === "string" ? rawRecord.handle : undefined);
  const uri = metaFirst(meta, ["dc.identifier.uri"]);
  const doi = metaFirst(meta, ["dc.identifier.doi", "dc.identifier.doi_uri"]);
  const isbn = metaAll(meta, ["dc.identifier.isbn"]);
  const subjects = metaAll(meta, ["dc.subject", "dc.subject.classification"]);
  const language = metaAll(meta, ["dc.language", "dc.language.iso", "dc.language.rfc3066"]);
  const rightsRaw = metaAll(meta, ["dc.rights"]).join("; ");
  const rightsUri = metaFirst(meta, ["dc.rights.uri"]);

  const sourceUrl = buildHandleUri(handle, uri);
  const downloadUrl = extractDownloadUrl(rawRecord);

  const nr = normalizeRights(rightsRaw, `${rightsRaw} ${rightsUri || ""}`.trim(), "doab", {
    openAccessHint: true,
    metadataLicence: DOAB_META_LICENCE,
    accessDefault: DOAB_SOURCE()?.accessDefault || "Free online",
    rightsDefault: DOAB_SOURCE()?.rightsDefault,
  });

  const externalId =
    handle ||
    (typeof rawRecord.uuid === "string" && rawRecord.uuid) ||
    (typeof rawRecord.id === "string" && rawRecord.id) ||
    String(metaFirst(meta, ["dc.identifier.uri"]) || title).slice(0, 200);

  const id = `doab-${String(externalId).replace(/[^a-zA-Z0-9._-]+/g, "-")}`;

  return {
    id,
    externalId: String(externalId),
    sourceId: "doab",
    sourceLabel: DOAB_SOURCE()?.label || "Directory of Open Access Books",
    sourceType: "open_access_books",
    sourceCategoryGroup: "open_access_books",
    title,
    creator,
    description,
    publisher,
    publicationDate,
    sourceUrl,
    downloadUrl,
    licence: rightsRaw || undefined,
    licenceUri: rightsUri,
    rightsLabel: nr.rightsLabel,
    licenceLabel: nr.licenceLabel,
    accessLabel: nr.accessLabel,
    reviewLabel: nr.reviewLabel,
    caution: nr.caution || DOAB_SOURCE()?.rightsCaution,
    isbn: isbn.length ? isbn : undefined,
    doi,
    subjects: subjects.length ? subjects : undefined,
    language: language.length ? language : undefined,
    region: "global",
    country: "international",
    metadataLicence: DOAB_META_LICENCE,
    metadataJson: rawRecord,
    resultMode: "external_record",
    recordTypeLabel: "Open access book",
  };
}

export async function searchDoab(query: string, limit = 15): Promise<ExternalArchiveRecord[]> {
  const q = query.trim();
  if (!q) return [];
  const max = Math.min(Math.max(limit, 1), 20);
  const url = `https://directory.doabooks.org/rest/search?${new URLSearchParams({
    query: q,
    expand: "metadata,bitstreams",
    limit: String(max),
  }).toString()}`;

  const controller = new AbortController();
  // Lowered from 12s to 6s — DOAB is allowed to be a late/optional source
  // rather than blocking the whole external search for long stretches.
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn("[DOAB] HTTP", res.status);
      return [];
    }
    const json = (await res.json()) as unknown;
    const items = collectIndexableObjects(json);
    return items.slice(0, max).map((item) => normaliseDoabRecord(item));
  } catch (e) {
    console.warn("[DOAB] search failed", e instanceof Error ? e.message : e);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
