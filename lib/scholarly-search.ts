import {
  SEARCH_DEFAULT_PAGE_SIZE,
  clampPageSize,
} from "@/lib/search-pagination";

export type ScholarlyIndexSource =
  | "CORE"
  | "OpenAlex"
  | "Crossref"
  | "Europe PMC"
  | "DOAB"
  | "Open Access"
  | "Gemini";

export type ScholarlySearchResult = {
  id: string;
  title: string;
  creator: string;
  year: string;
  publisher?: string;
  journal?: string;
  doi?: string;
  url: string;
  abstract?: string;
  source: ScholarlyIndexSource;
  citationLine: string;
  openAccess?: boolean;
  verified?: boolean;
  rationale?: string;
  outsideArchive?: boolean;
};

export type ScholarlySourcesUsed = Partial<Record<ScholarlyIndexSource, number>>;

/** Append server-side OpenAlex auth params. Never use NEXT_PUBLIC_* for the API key. */
export function appendOpenAlexAuthParams(url: URL) {
  const apiKey = process.env.OPENALEX_API_KEY?.trim();
  const mailto = process.env.OPENALEX_MAILTO?.trim();

  if (apiKey) url.searchParams.set("api_key", apiKey);
  if (mailto) url.searchParams.set("mailto", mailto);
}

function logOpenAlexConfigDev() {
  if (process.env.NODE_ENV === "production") return;
  console.info("[OpenAlex] key configured:", Boolean(process.env.OPENALEX_API_KEY?.trim()));
  console.info("[OpenAlex] mailto configured:", Boolean(process.env.OPENALEX_MAILTO?.trim()));
}

function buildOpenAlexWorksUrl(query: string, perPage: number, cursor: string | null = "*") {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query.trim());
  url.searchParams.set("per_page", String(perPage));
  if (cursor) url.searchParams.set("cursor", cursor);
  appendOpenAlexAuthParams(url);
  return url;
}

export type OpenAlexWorksPage = {
  results: Record<string, unknown>[];
  totalCount: number;
  nextCursor: string | null;
};

function decodeOpenAlexAbstract(index: unknown): string {
  if (!index || typeof index !== "object") return "";
  const pairs = Object.entries(index as Record<string, number[]>)
    .flatMap(([word, positions]) =>
      Array.isArray(positions) ? positions.map((pos) => [pos, word] as const) : [],
    );
  return pairs
    .sort((a, b) => a[0] - b[0])
    .map(([, word]) => word)
    .join(" ");
}

async function fetchOpenAlexWorksPage(
  query: string,
  perPage: number,
  cursor: string | null = "*",
): Promise<OpenAlexWorksPage> {
  if (!query.trim()) return { results: [], totalCount: 0, nextCursor: null };

  logOpenAlexConfigDev();
  const url = buildOpenAlexWorksUrl(query, perPage, cursor || "*");

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      console.warn("OpenAlex authentication failed. Check OPENALEX_API_KEY.");
      return { results: [], totalCount: 0, nextCursor: null };
    }

    if (!response.ok) {
      const detail = await response.text();
      console.warn(`[OpenAlex] request failed (${response.status}): ${detail.slice(0, 160)}`);
      return { results: [], totalCount: 0, nextCursor: null };
    }

    const data = (await response.json()) as {
      results?: unknown[];
      meta?: { count?: number; next_cursor?: string | null };
      error?: string;
      message?: string;
    };
    if (data.error || /api key/i.test(String(data.message ?? ""))) {
      console.warn("OpenAlex authentication failed. Check OPENALEX_API_KEY.");
      return { results: [], totalCount: 0, nextCursor: null };
    }

    const results = asArray<Record<string, unknown>>(data.results);
    const totalCount = Number(data.meta?.count) || results.length;
    const nextCursor = data.meta?.next_cursor ?? null;
    return { results, totalCount, nextCursor };
  } catch (error) {
    console.warn("[OpenAlex] fetch error:", error instanceof Error ? error.message : String(error));
    return { results: [], totalCount: 0, nextCursor: null };
  }
}

async function fetchOpenAlexWorksJson(query: string, perPage: number): Promise<unknown[]> {
  const page = await fetchOpenAlexWorksPage(query, perPage, "*");
  return page.results;
}

export async function searchOpenAlexWorksPage(
  query: string,
  limit = SEARCH_DEFAULT_PAGE_SIZE,
  cursor: string | null = "*",
): Promise<{ results: ScholarlySearchResult[]; totalCount: number; nextCursor: string | null }> {
  const capped = clampPageSize(limit, SEARCH_DEFAULT_PAGE_SIZE);
  const batch = await fetchOpenAlexWorksPage(query, capped, cursor || "*");
  const results = batch.results
    .map((item, index) => mapOpenAlexWork(item, index))
    .filter((item): item is ScholarlySearchResult => Boolean(item));
  return { results, totalCount: batch.totalCount, nextCursor: batch.nextCursor };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function normalizeAuthors(authors: unknown) {
  return asArray<{ name?: string; givenName?: string; familyName?: string } | string>(authors)
    .map((author) => {
      if (typeof author === "string") return author;
      if (author?.name) return author.name;
      return [author?.givenName, author?.familyName].filter(Boolean).join(" ").trim();
    })
    .filter(Boolean)
    .join(", ");
}

export function formatApaCitationLine(input: {
  creator: string;
  year: string;
  title: string;
  journal?: string;
  publisher?: string;
  doi?: string;
  url?: string;
}) {
  const author = input.creator?.trim() || "Unknown author";
  const year = input.year?.trim() || "n.d.";
  const title = input.title?.trim() || "Untitled work";
  const container = input.journal?.trim() || input.publisher?.trim();
  const link = input.doi
    ? `https://doi.org/${input.doi.replace(/^https?:\/\/doi\.org\//i, "")}`
    : input.url?.trim();

  const parts = [
    `${author}.`,
    `(${year}).`,
    `${title}.`,
    container ? `${container}.` : "",
    link,
  ].filter(Boolean);

  return parts.join(" ");
}

function normalizeDoi(value: string) {
  return value.replace(/^https?:\/\/doi\.org\//i, "").trim();
}

function dedupeKey(result: ScholarlySearchResult) {
  if (result.doi) return `doi:${normalizeDoi(result.doi).toLowerCase()}`;
  return `title:${result.title.trim().toLowerCase()}|${result.creator.trim().toLowerCase()}`;
}

export function dedupeScholarlyResults(results: ScholarlySearchResult[], limit?: number) {
  const seen = new Map<string, ScholarlySearchResult>();
  for (const result of results) {
    const key = dedupeKey(result);
    if (!seen.has(key)) seen.set(key, result);
  }
  const deduped = [...seen.values()];
  if (limit == null || !Number.isFinite(limit) || limit < 1) return deduped;
  return deduped.slice(0, limit);
}

function mapCoreItem(item: Record<string, unknown>, index: number): ScholarlySearchResult | null {
  const title = firstText(item.title);
  if (!title) return null;

  const creator = normalizeAuthors(item.authors) || "Unknown author";
  const year = firstText(item.year_published, item.yearPublished);
  const doi = firstText(item.doi);
  const coreId = firstText(item.id);
  const publisher =
    typeof item.publisher === "string"
      ? item.publisher
      : firstText((item.publisher as { name?: string })?.name);
  const journal = firstText(asArray<{ title?: string }>(item.journals)[0]?.title);
  const url = coreId
    ? `https://core.ac.uk/works/${coreId}`
    : doi
      ? `https://doi.org/${normalizeDoi(doi)}`
      : "";
  if (!url) return null;

  const abstract = firstText(item.abstract);
  const openAccess = /^(true|1|yes|open|oa)$/i.test(firstText(item.is_oa, item.open_access));

  const mapped: ScholarlySearchResult = {
    id: `core-${coreId || index}`,
    title,
    creator,
    year,
    publisher: publisher || undefined,
    journal: journal || undefined,
    doi: doi ? normalizeDoi(doi) : undefined,
    url,
    abstract: abstract || undefined,
    source: "CORE",
    openAccess,
    citationLine: "",
  };
  mapped.citationLine = formatApaCitationLine(mapped);
  return mapped;
}

function mapOpenAlexWork(work: Record<string, unknown>, index: number): ScholarlySearchResult | null {
  const title = firstText(work.display_name, work.title);
  if (!title) return null;

  const creator =
    asArray<{ author?: { display_name?: string } }>(work.authorships)
      .map((entry) => entry.author?.display_name)
      .filter(Boolean)
      .join(", ") || "Unknown author";
  const year = firstText(work.publication_year);
  const doiRaw = firstText(work.doi);
  const doi = doiRaw ? normalizeDoi(doiRaw) : undefined;
  const journal = firstText(
    (work.primary_location as { source?: { display_name?: string } })?.source?.display_name,
  );
  const publisher = firstText(
    (work.primary_location as { source?: { host_organization_name?: string } })?.source
      ?.host_organization_name,
  );
  const url = doi ? `https://doi.org/${doi}` : firstText(work.id) || "";
  if (!url) return null;

  const abstract =
    firstText(work.abstract) || decodeOpenAlexAbstract(work.abstract_inverted_index);
  const openAccess = Boolean((work.open_access as { is_oa?: boolean })?.is_oa);

  const mapped: ScholarlySearchResult = {
    id: `openalex-${firstText(work.id).replace(/^https:\/\/openalex\.org\//, "") || index}`,
    title,
    creator,
    year,
    publisher: publisher || undefined,
    journal: journal || undefined,
    doi,
    url,
    abstract: abstract || undefined,
    source: "OpenAlex",
    openAccess,
    citationLine: "",
  };
  mapped.citationLine = formatApaCitationLine(mapped);
  return mapped;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCoreJson(url: string, apiKey: string, attempt = 1): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.ok) return response.json();

  const text = await response.text();
  if (attempt < 2 && response.status >= 500) {
    await sleep(700);
    return fetchCoreJson(url, apiKey, attempt + 1);
  }

  throw new Error(text || `CORE request failed (${response.status})`);
}

export async function searchCoreWorks(query: string, limit = SEARCH_DEFAULT_PAGE_SIZE): Promise<ScholarlySearchResult[]> {
  const apiKey = process.env.CORE_API_KEY?.trim();
  if (!apiKey || !query.trim()) return [];

  const capped = clampPageSize(limit, SEARCH_DEFAULT_PAGE_SIZE);
  const url =
    `https://api.core.ac.uk/v3/search/works` +
    `?q=${encodeURIComponent(query.trim())}` +
    `&limit=${capped}`;

  try {
    const data = (await fetchCoreJson(url, apiKey)) as { results?: unknown[] };
    return asArray<Record<string, unknown>>(data.results)
      .map((item, index) => mapCoreItem(item, index))
      .filter((item): item is ScholarlySearchResult => Boolean(item));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isCoreUnavailableError(message)) {
      throw new Error("CORE_API_KEY_INVALID");
    }
    return [];
  }
}

export async function searchOpenAlexWorks(query: string, limit = SEARCH_DEFAULT_PAGE_SIZE): Promise<ScholarlySearchResult[]> {
  if (!query.trim()) return [];

  const capped = clampPageSize(limit, SEARCH_DEFAULT_PAGE_SIZE);
  const items = await fetchOpenAlexWorksJson(query, capped);

  return asArray<Record<string, unknown>>(items)
    .map((item, index) => mapOpenAlexWork(item, index))
    .filter((item): item is ScholarlySearchResult => Boolean(item));
}

function crossrefAuthors(item: Record<string, unknown>) {
  return asArray<{ given?: string; family?: string; name?: string }>(item.author)
    .map((author) => {
      if (author.name) return author.name;
      return [author.given, author.family].filter(Boolean).join(" ").trim();
    })
    .filter(Boolean)
    .join(", ");
}

function crossrefYear(item: Record<string, unknown>) {
  const parts =
    (item["published-print"] as { "date-parts"?: number[][] })?.["date-parts"]?.[0] ??
    (item["published-online"] as { "date-parts"?: number[][] })?.["date-parts"]?.[0] ??
    (item.issued as { "date-parts"?: number[][] })?.["date-parts"]?.[0];
  return parts?.[0] ? String(parts[0]) : "";
}

function mapCrossrefItem(item: Record<string, unknown>, index: number): ScholarlySearchResult | null {
  const title = firstText(asArray<string>(item.title)[0], item.title);
  if (!title) return null;
  const creator = crossrefAuthors(item) || "Unknown author";
  const year = crossrefYear(item);
  const doi = item.DOI ? normalizeDoi(String(item.DOI)) : undefined;
  const journal = firstText(asArray<string>(item["container-title"])[0]);
  const publisher = firstText(item.publisher);
  const url = doi ? `https://doi.org/${doi}` : firstText(item.URL) || "";
  if (!url) return null;

  const mapped: ScholarlySearchResult = {
    id: `crossref-${doi || index}`,
    title,
    creator,
    year,
    journal: journal || undefined,
    publisher: publisher || undefined,
    doi,
    url,
    source: "Crossref",
    openAccess: false,
    citationLine: "",
  };
  mapped.citationLine = formatApaCitationLine(mapped);
  return mapped;
}

export async function searchCrossrefWorks(query: string, limit = SEARCH_DEFAULT_PAGE_SIZE): Promise<ScholarlySearchResult[]> {
  if (!query.trim()) return [];
  const capped = clampPageSize(limit, SEARCH_DEFAULT_PAGE_SIZE);
  const mailto = process.env.OPENALEX_MAILTO?.trim() || "decolonising-archive@research.local";
  const url =
    `https://api.crossref.org/works` +
    `?query=${encodeURIComponent(query.trim())}` +
    `&rows=${capped}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": `DecolonisingArchive/1.0 (mailto:${mailto})`,
      },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      message?: { items?: unknown[] };
    };
    return asArray<Record<string, unknown>>(data.message?.items)
      .map((item, index) => mapCrossrefItem(item, index))
      .filter((item): item is ScholarlySearchResult => Boolean(item));
  } catch {
    return [];
  }
}

function mapEuropePmcItem(item: Record<string, unknown>, index: number): ScholarlySearchResult | null {
  const title = firstText(item.title);
  if (!title) return null;
  const bookDetails = item.bookOrReportDetails as { publisher?: string } | undefined;
  const creator = firstText(item.authorString) || "Unknown author";
  const year = firstText(item.firstPublicationDate, item.pubYear)?.slice(0, 4) || "";
  const doi = item.doi ? normalizeDoi(String(item.doi)) : undefined;
  const journal = firstText(item.journalTitle, bookDetails?.publisher);
  const url =
    doi ? `https://doi.org/${doi}` : firstText(item.pmcid ? `https://europepmc.org/article/MED/${item.pmid}` : "");
  if (!url) return null;

  const mapped: ScholarlySearchResult = {
    id: `epmc-${item.id || item.pmid || index}`,
    title,
    creator,
    year,
    journal: journal || undefined,
    doi,
    url,
    abstract: firstText(item.abstractText) || undefined,
    source: "Europe PMC",
    openAccess: /open access/i.test(firstText(item.isOpenAccess, item.inEPMC)),
    citationLine: "",
  };
  mapped.citationLine = formatApaCitationLine(mapped);
  return mapped;
}

export async function searchEuropePmcWorks(query: string, limit = 10): Promise<ScholarlySearchResult[]> {
  if (!query.trim()) return [];
  const capped = Math.min(Math.max(limit, 1), 25);
  const url =
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search` +
    `?query=${encodeURIComponent(query.trim())}` +
    `&format=json&pageSize=${capped}&resultType=core`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      resultList?: { result?: unknown[] };
    };
    return asArray<Record<string, unknown>>(data.resultList?.result)
      .map((item, index) => mapEuropePmcItem(item, index))
      .filter((item): item is ScholarlySearchResult => Boolean(item));
  } catch {
    return [];
  }
}

function mapDoabRecord(
  record: {
    id: string;
    title: string;
    creator?: string;
    contributors?: string[];
    publicationDate?: string;
    publisher?: string;
    sourceUrl: string;
    doi?: string;
    description?: string;
  },
  index: number,
): ScholarlySearchResult {
  const mapped: ScholarlySearchResult = {
    id: `doab-${record.id || index}`,
    title: record.title,
    creator: record.creator || record.contributors?.join(", ") || "Unknown author",
    year: record.publicationDate?.slice(0, 4) || "",
    publisher: record.publisher,
    doi: record.doi ? normalizeDoi(record.doi) : undefined,
    url: record.sourceUrl,
    abstract: record.description,
    source: "DOAB",
    openAccess: true,
    citationLine: "",
  };
  mapped.citationLine = formatApaCitationLine(mapped);
  return mapped;
}

export async function searchDoabWorks(query: string, limit = 10): Promise<ScholarlySearchResult[]> {
  if (!query.trim()) return [];
  try {
    const { searchDoab } = await import("@/src/lib/external-sources/adapters/doab");
    const capped = Math.min(Math.max(limit, 1), 20);
    const records = await searchDoab(query.trim(), capped);
    return records.map((record, index) => mapDoabRecord(record, index));
  } catch {
    return [];
  }
}

function mapOpenAccessRecord(
  record: {
    id: string;
    title: string;
    creator?: string;
    contributors?: string[];
    publicationDate?: string;
    publisher?: string;
    sourceUrl: string;
    doi?: string;
    description?: string;
    sourceId: string;
    sourceLabel: string;
  },
  index: number,
): ScholarlySearchResult {
  const mapped: ScholarlySearchResult = {
    id: record.id || `oa-${index}`,
    title: record.title,
    creator: record.creator || record.contributors?.join(", ") || "Unknown author",
    year: record.publicationDate?.slice(0, 4) || "",
    publisher: record.publisher,
    doi: record.doi ? normalizeDoi(record.doi) : undefined,
    url: record.sourceUrl,
    abstract: record.description,
    source: "Open Access",
    openAccess: true,
    citationLine: "",
  };
  mapped.citationLine = formatApaCitationLine(mapped);
  return mapped;
}

export async function searchCachedOpenAccessWorks(
  query: string,
  limit = 10,
): Promise<ScholarlySearchResult[]> {
  if (!query.trim()) return [];
  try {
    const { searchExternalSources } = await import("@/src/lib/external-sources/external-search");
    const capped = Math.min(Math.max(limit, 1), 20);
    const { externalRecords } = await searchExternalSources(query.trim());
    return externalRecords
      .filter((record) => record.resultMode === "external_record" && record.sourceId !== "doab")
      .slice(0, capped)
      .map((record, index) =>
        mapOpenAccessRecord(
          {
            id: record.id,
            title: record.title,
            creator: record.creator,
            contributors: record.contributors,
            publicationDate: record.publicationDate,
            publisher: record.publisher,
            sourceUrl: record.sourceUrl,
            doi: record.doi,
            description: record.description,
            sourceId: record.sourceId,
            sourceLabel: record.sourceLabel,
          },
          index,
        ),
      );
  } catch {
    return [];
  }
}

function isCoreUnavailableError(message: string) {
  return /CORE_API_KEY_INVALID|401|403|unauthorized|trial|expired|license/i.test(message);
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

export async function searchScholarlySources(query: string, limit = 60) {
  const perSource = clampPageSize(limit, SEARCH_DEFAULT_PAGE_SIZE);
  const warnings: string[] = [];

  let coreSkipped = false;

  const corePromise = (async () => {
    if (!process.env.CORE_API_KEY?.trim()) {
      coreSkipped = true;
      return [];
    }
    try {
      return await searchCoreWorks(query, perSource);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isCoreUnavailableError(message)) {
        coreSkipped = true;
      }
      return [];
    }
  })();

  const settled = await Promise.allSettled([
    searchOpenAlexWorks(query, perSource),
    searchCrossrefWorks(query, perSource),
    searchEuropePmcWorks(query, perSource),
    searchDoabWorks(query, perSource),
    searchCachedOpenAccessWorks(query, Math.min(perSource, 10)),
    corePromise,
  ]);

  const openAlex = settledValue(settled[0], [] as ScholarlySearchResult[]);
  const crossref = settledValue(settled[1], [] as ScholarlySearchResult[]);
  const europePmc = settledValue(settled[2], [] as ScholarlySearchResult[]);
  const doab = settledValue(settled[3], [] as ScholarlySearchResult[]);
  const openAccess = settledValue(settled[4], [] as ScholarlySearchResult[]);
  const core = settledValue(settled[5], [] as ScholarlySearchResult[]);

  const sourcesUsed: ScholarlySourcesUsed = {
    CORE: core.length,
    OpenAlex: openAlex.length,
    Crossref: crossref.length,
    "Europe PMC": europePmc.length,
    DOAB: doab.length,
    "Open Access": openAccess.length,
  };

  const results = dedupeScholarlyResults(
    [...core, ...openAlex, ...crossref, ...europePmc, ...doab, ...openAccess],
    limit,
  );

  if (coreSkipped && results.length > 0) {
    warnings.push(
      "CORE is unavailable (missing or expired key). Results include OpenAlex, Crossref, Europe PMC, DOAB, and other open indexes.",
    );
  } else if (!process.env.CORE_API_KEY?.trim() && results.length > 0) {
    warnings.push("CORE is not configured. Other open scholarly indexes are still searched.");
  }

  if (results.length === 0) {
    warnings.push("No scholarly records matched. Try broader keywords or a paper title.");
  }

  return { results, warnings, sourcesUsed };
}

export type ScholarlySourceBundle = {
  source: ScholarlyIndexSource;
  query: string;
  count: number | null;
  displayedCount: number;
  nextCursor: string | null;
  nextOffset: number | null;
  results: ScholarlySearchResult[];
  error: string | null;
};

function bundleFromResults(
  source: ScholarlyIndexSource,
  query: string,
  results: ScholarlySearchResult[],
  meta?: { count?: number | null; nextCursor?: string | null; nextOffset?: number | null; error?: string | null },
): ScholarlySourceBundle {
  return {
    source,
    query,
    count: meta?.count ?? results.length,
    displayedCount: results.length,
    nextCursor: meta?.nextCursor ?? null,
    nextOffset: meta?.nextOffset ?? null,
    results,
    error: meta?.error ?? null,
  };
}

/** Per-index bundles for workbench / APIs — no cross-source merge cap. */
export async function searchScholarlySourceBundles(query: string, pageSize = SEARCH_DEFAULT_PAGE_SIZE) {
  const size = clampPageSize(pageSize, SEARCH_DEFAULT_PAGE_SIZE);
  const warnings: string[] = [];
  const trimmed = query.trim();

  if (!trimmed) {
    return { bundles: {} as Partial<Record<ScholarlyIndexSource, ScholarlySourceBundle>>, warnings };
  }

  let coreSkipped = false;
  const corePromise = (async () => {
    if (!process.env.CORE_API_KEY?.trim()) {
      coreSkipped = true;
      return bundleFromResults("CORE", trimmed, []);
    }
    try {
      const results = await searchCoreWorks(trimmed, size);
      return bundleFromResults("CORE", trimmed, results, { count: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isCoreUnavailableError(message)) coreSkipped = true;
      return bundleFromResults("CORE", trimmed, [], { error: message });
    }
  })();

  const openAlexPromise = searchOpenAlexWorksPage(trimmed, size, "*").then((batch) =>
    bundleFromResults("OpenAlex", trimmed, batch.results, {
      count: batch.totalCount,
      nextCursor: batch.nextCursor,
    }),
  );

  const settled = await Promise.allSettled([
    openAlexPromise,
    searchCrossrefWorks(trimmed, size).then((results) => bundleFromResults("Crossref", trimmed, results)),
    searchEuropePmcWorks(trimmed, size).then((results) => bundleFromResults("Europe PMC", trimmed, results)),
    searchDoabWorks(trimmed, size).then((results) => bundleFromResults("DOAB", trimmed, results)),
    searchCachedOpenAccessWorks(trimmed, size).then((results) =>
      bundleFromResults("Open Access", trimmed, results),
    ),
    corePromise,
  ]);

  const openAlex = settledValue(
    settled[0],
    bundleFromResults("OpenAlex", trimmed, [], { error: "OpenAlex search failed" }),
  );
  const crossref = settledValue(settled[1], bundleFromResults("Crossref", trimmed, []));
  const europePmc = settledValue(settled[2], bundleFromResults("Europe PMC", trimmed, []));
  const doab = settledValue(settled[3], bundleFromResults("DOAB", trimmed, []));
  const openAccess = settledValue(settled[4], bundleFromResults("Open Access", trimmed, []));
  const core = settledValue(settled[5], bundleFromResults("CORE", trimmed, []));

  const bundles: Partial<Record<ScholarlyIndexSource, ScholarlySourceBundle>> = {
    CORE: core,
    OpenAlex: openAlex,
    Crossref: crossref,
    "Europe PMC": europePmc,
    DOAB: doab,
    "Open Access": openAccess,
  };

  if (coreSkipped) {
    warnings.push(
      "CORE is unavailable (missing or expired key). Other open indexes are still searched.",
    );
  }

  return { bundles, warnings };
}
