/* ─── Archive v5 styles — static CSS file, no build required ─── */
(function injectArchiveStylesV5() {
  if (document.getElementById('archive-styles-v5')) return;
  const link = document.createElement('link');
  link.id = 'archive-styles-v5';
  link.rel = 'stylesheet';
  link.href = '/assets/css/archive-v5.css?v=20260701-action-row-reset-v6';
  document.head.appendChild(link);
})();

/* ─── Admin analytics event logger ─────────────────────────────────
   Fires-and-forgets a POST to /api/analytics/activity.
   Never throws — all errors are swallowed so a logging failure
   never breaks the user-facing archive.
   ─────────────────────────────────────────────────────────────── */
(function setupAnalytics() {
  let _sessionId = null;

  function getOrCreateSessionId() {
    if (_sessionId) return _sessionId;
    try {
      const stored = sessionStorage.getItem('_ared_sid');
      if (stored) { _sessionId = stored; return _sessionId; }
      _sessionId = 'sid_' + Math.random().toString(36).slice(2) + '_' + Date.now();
      sessionStorage.setItem('_ared_sid', _sessionId);
    } catch (_) {
      _sessionId = 'sid_' + Math.random().toString(36).slice(2);
    }
    return _sessionId;
  }

  window.__logArchiveEvent = function logArchiveEvent(payload) {
    try {
      const body = {
        ...payload,
        sessionId: getOrCreateSessionId(),
        path: window.location.pathname + window.location.search,
        referrer: document.referrer || null,
      };
      fetch('/api/analytics/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => undefined);
    } catch (_) { /* never throw */ }
  };
})();

const DISCOVERY_PAGE_SIZE = 25;
const DISCOVERY_PREVIEW_SIZE = 8;

let coreTotalHits = 0;
let coreOffset = DISCOVERY_PAGE_SIZE;
let coreLimit = DISCOVERY_PAGE_SIZE;

const DISCOVERY_SECTION_ORDER = ["openalex", "core", "crossref", "semantic-scholar", "wikidata", "library-of-congress", "smithsonian", "openAccess", "previews", "handoffs"];
const DISCOVERY_SECTION_LABELS = {
  openalex: { title: "OpenAlex scholarly results", loadMore: "Load more OpenAlex results" },
  core: { title: "CORE open access results", loadMore: "Load more CORE results" },
  crossref: { title: "Crossref publication metadata", loadMore: "Load more Crossref results" },
  "semantic-scholar": { title: "Semantic Scholar papers", loadMore: "Load more Semantic Scholar results" },
  wikidata: { title: "Wikidata entities", loadMore: "Load more Wikidata entities" },
  "library-of-congress": { title: "Library of Congress media & archives", loadMore: "Load more Library of Congress results" },
  smithsonian: { title: "Smithsonian Open Access", loadMore: "Load more Smithsonian results" },
  openAccess: { title: "Open access & OER", loadMore: "Load more open access results" },
  previews: { title: "Additional catalogue previews", loadMore: "Load more catalogue previews", preview: true },
  handoffs: { title: "External source handoffs", loadMore: null },
};

function emptyDiscoverySection() {
  return {
    results: [],
    count: null,
    displayedCount: 0,
    nextCursor: null,
    nextOffset: null,
    state: "idle",
    error: null,
    loadingMore: false,
  };
}

let discoverySections = Object.fromEntries(
  DISCOVERY_SECTION_ORDER.map((id) => [id, emptyDiscoverySection()]),
);

function resetDiscoverySections() {
  discoverySections = Object.fromEntries(
    DISCOVERY_SECTION_ORDER.map((id) => [id, emptyDiscoverySection()]),
  );
  coreOffset = DISCOVERY_PAGE_SIZE;
  coreTotalHits = 0;
  openAccessReleasedCount = 0;
}

const PREVIEW_ADAPTER_IDS = ["openlibrary", "met", "wikimedia"];
const PRIMARY_LIVE_ADAPTER_IDS = ["openalex", "core", "crossref", "semantic-scholar", "wikidata", "library-of-congress"];
const ALWAYS_ON_LIVE_ADAPTER_IDS = ["openAccess"];
const OPTIONAL_LIVE_ADAPTER_IDS = ["smithsonian", "aodl"];
const HANDOFF_ADAPTER_IDS = [
  "britishmuseum", "unilever", "uac", "britishlibrary", "trove",
  "googlebooks", "worldcat", "nlsa", "ufh", "nigeriaarchives",
  "zimbabwearchives", "ugandaarchives", "bodleian",
];
const UNIFIED_PAGINATED_SECTION_IDS = ["openalex", "core", "crossref", "semantic-scholar", "wikidata", "library-of-congress", "smithsonian"];
const FUTURE_SOURCE_PAGINATION = [
  { source: "trove", label: "Trove", connected: false },
];

let archiveSearchPool = [];
let archiveLoadedCount = 0;
let openAccessReleasedCount = 0;
let sourcePaginationStates = [];

function mapAdapterIdToDiscoverySection(adapterId) {
  if (adapterId === "aodl") return "handoffs";
  if (DISCOVERY_SECTION_ORDER.includes(adapterId)) return adapterId;
  if (PREVIEW_ADAPTER_IDS.includes(adapterId)) return "previews";
  return "handoffs";
}

function syncLiveResultsFromDiscoverySections() {
  const combined = [];
  for (const sectionId of DISCOVERY_SECTION_ORDER) {
    const section = discoverySections[sectionId];
    if (!section?.results?.length) continue;
    combined.push(...section.results);
  }
  liveResults = safeArray(dedupeBlendedResults(combined, getEffectiveSearchQuery() || libraryQuery));
  externalDiscovery = safeArray(liveResults).filter((item) => getResultMode(item) === "external_handoff");
}

function applyDiscoverySection(sectionId, patch, { append = false } = {}) {
  const current = discoverySections[sectionId] || emptyDiscoverySection();
  const nextResults = append ? [...current.results, ...(patch.results || [])] : patch.results ?? current.results;
  discoverySections[sectionId] = {
    ...current,
    ...patch,
    results: nextResults,
    displayedCount: nextResults.length,
    previewPagination:
      patch.previewPagination !== undefined ? patch.previewPagination : current.previewPagination,
    metObjectIds: patch.metObjectIds !== undefined ? patch.metObjectIds : current.metObjectIds,
  };
  if (sectionId === "openAccess" && patch.results && !append) {
    openAccessReleasedCount = Math.min(DISCOVERY_PAGE_SIZE, patch.results.length);
  }
  syncLiveResultsFromDiscoverySections();
}

/** Unified library result stream (display window — fetched results kept in memory). */
const UNIFIED_STREAM_INITIAL = 50;
const UNIFIED_STREAM_STEP = 50;
const UNIFIED_STREAM_SECTION_IDS = ["openalex", "core", "crossref", "semantic-scholar", "wikidata", "library-of-congress", "smithsonian", "openAccess", "previews"];
const UNIFIED_SOURCE_FILTERS = [
  { id: "all", label: "All" },
  { id: "archive", label: "Archive" },
  { id: "openalex", label: "OpenAlex" },
  { id: "core", label: "CORE" },
  { id: "wikidata", label: "Wikidata" },
  { id: "library-of-congress", label: "Library of Congress" },
  { id: "smithsonian", label: "Smithsonian" },
  { id: "openaccess", label: "Open access" },
  { id: "scholarly", label: "Scholarly" },
  { id: "archival", label: "Archival" },
];

const UNIFIED_SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "newest", label: "Newest" },
  { id: "cited", label: "Most cited" },
  { id: "source", label: "Source" },
];
const UNIFIED_SOURCE_SORT_ORDER = [
  "archive",
  "openalex",
  "core",
  "crossref",
  "semantic-scholar",
  "wikidata",
  "library-of-congress",
  "smithsonian",
  "openaccess",
  "archival-external",
  "handoff",
  "external",
];

let unifiedStreamFilter = "all";
let unifiedStreamSort = "relevance";
let unifiedStreamVisibleCount = UNIFIED_STREAM_INITIAL;
let unifiedStreamLoadingMore = false;

function resetUnifiedStreamUi() {
  unifiedStreamFilter = "all";
  unifiedStreamSort = "relevance";
  unifiedStreamVisibleCount = UNIFIED_STREAM_INITIAL;
  unifiedStreamLoadingMore = false;
  refreshArchiveSearchPool();
  archiveLoadedCount = Math.min(DISCOVERY_PAGE_SIZE, archiveSearchPool.length);
  openAccessReleasedCount = 0;
  sourcePaginationStates = [];
}

function refreshArchiveSearchPool() {
  archiveSearchPool = filterDisplayedRecords(localResults);
}

function getInternalResultsForMerge() {
  refreshArchiveSearchPool();
  return archiveSearchPool.slice(0, archiveLoadedCount);
}

function loadMoreArchivePage() {
  const next = Math.min(archiveLoadedCount + DISCOVERY_PAGE_SIZE, archiveSearchPool.length);
  archiveLoadedCount = next;
}

function canLoadMoreArchive() {
  refreshArchiveSearchPool();
  return archiveLoadedCount < archiveSearchPool.length;
}

function loadMoreOpenAccessReleased() {
  const total = discoverySections.openAccess?.results?.length || 0;
  openAccessReleasedCount = Math.min(openAccessReleasedCount + DISCOVERY_PAGE_SIZE, total);
}

function canLoadMoreOpenAccessReleased() {
  const section = discoverySections.openAccess;
  if (!section?.results?.length || section.state === "error") return false;
  return openAccessReleasedCount < section.results.length;
}

function getFilteredUnifiedRanked(effectiveQuery) {
  const rankedAll = filterDisplayedRecords(
    mergeAndRankSearchResults({
      query: effectiveQuery || libraryQuery,
      internalResults: getInternalResultsForMerge(),
      includeHandoffs: sourceMode,
    }),
  );
  return rankedAll.filter((record) => matchesUnifiedStreamFilter(record, unifiedStreamFilter));
}

function syncSourcePaginationStates() {
  refreshArchiveSearchPool();
  const states = [];

  states.push({
    source: "archive",
    label: "Archive",
    hasMore: archiveLoadedCount < archiveSearchPool.length,
    loading: false,
    error: null,
    offset: archiveLoadedCount,
    total: archiveSearchPool.length,
    loadedCount: archiveLoadedCount,
    connected: true,
  });

  for (const sectionId of UNIFIED_PAGINATED_SECTION_IDS) {
    const section = discoverySections[sectionId];
    const label = DISCOVERY_SECTION_LABELS[sectionId]?.title?.replace(/ scholarly results| open access results| publication metadata/gi, "") ||
      sectionId;
    const shortLabel =
      sectionId === "openalex"
        ? "OpenAlex"
        : sectionId === "core"
          ? "CORE"
          : sectionId === "crossref"
            ? "Crossref"
            : sectionId === "semantic-scholar"
              ? "Semantic Scholar"
              : sectionId === "wikidata"
                ? "Wikidata"
                : sectionId === "library-of-congress"
                  ? "Library of Congress"
                  : sectionId === "smithsonian"
                    ? "Smithsonian"
                    : sectionId;
    const loaded = section?.displayedCount || 0;
    const hasMore = canLoadMoreDiscoverySection(sectionId);
    states.push({
      source: sectionId,
      label: shortLabel,
      hasMore,
      loading: Boolean(section?.loadingMore),
      error: section?.state === "error" ? section.error || "unavailable" : null,
      cursor: section?.nextCursor ?? null,
      offset: section?.nextOffset ?? loaded,
      total: section?.count ?? null,
      loadedCount: loaded,
      connected: true,
    });
  }

  const oa = discoverySections.openAccess;
  states.push({
    source: "openaccess",
    label: "Open access",
    hasMore: canLoadMoreOpenAccessReleased(),
    loading: Boolean(oa?.loadingMore),
    error: oa?.state === "error" ? oa.error || "unavailable" : null,
    offset: openAccessReleasedCount,
    total: oa?.results?.length ?? null,
    loadedCount: openAccessReleasedCount,
    connected: true,
  });

  const previews = discoverySections.previews;
  const previewAdapterLabels = {
    wikimedia: "Wikimedia",
    openlibrary: "Open Library",
    met: "The Met",
  };
  for (const adapterId of PREVIEW_ADAPTER_IDS) {
    const loaded = (previews?.results || []).filter(
      (record) => String(record.liveSourceHint || "").toLowerCase() === adapterId,
    ).length;
    const pag = previews?.previewPagination?.[adapterId];
    states.push({
      source: adapterId,
      label: previewAdapterLabels[adapterId] || adapterId,
      hasMore: Boolean(pag?.hasMore),
      loading: Boolean(previews?.loadingMore),
      error: previews?.state === "error" ? previews.error || "unavailable" : null,
      loadedCount: loaded,
      total: null,
      connected: true,
    });
  }

  for (const future of FUTURE_SOURCE_PAGINATION) {
    states.push({
      source: future.source,
      label: future.label,
      hasMore: false,
      loading: false,
      error: null,
      loadedCount: 0,
      total: null,
      connected: false,
    });
  }

  sourcePaginationStates = states;
  return states;
}

function isSourceDiagnosticsEnabled() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("sourceDiagnostics") === "1") return true;
    return window.localStorage?.getItem("archiveSourceDiagnostics") === "true";
  } catch {
    return false;
  }
}

function formatSourcePaginationChip(state) {
  if (state.connected === false) return `${state.label}: not connected`;
  if (state.error) {
    if (isSourceDiagnosticsEnabled()) return `${state.label}: ${state.error}`;
    return "";
  }
  if (!state.loadedCount && state.source !== "archive") {
    if (isSourceDiagnosticsEnabled()) {
      if (state.source === "core") return "CORE: empty";
      return `${state.label}: empty`;
    }
    return "";
  }
  if (!state.hasMore && state.loadedCount > 0) return `${state.label}: all loaded`;
  if (state.total != null && state.total > state.loadedCount) {
    return `${state.label}: ${state.loadedCount} of ${Number(state.total).toLocaleString()}`;
  }
  return `${state.label}: ${state.loadedCount} loaded`;
}

function renderUnifiedSourceChips() {
  const states = syncSourcePaginationStates();
  if (!states.length) return "";
  return `<div class="library-unified-source-chips" aria-label="Results loaded by source">${states
    .map((state) => {
      const chipClass = [
        "library-unified-source-chip",
        state.error ? "is-error" : "",
        state.connected === false ? "is-disconnected" : "",
        !state.hasMore && state.loadedCount ? "is-exhausted" : "",
        state.loading ? "is-loading" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const chipText = formatSourcePaginationChip(state);
      if (!chipText) return "";
      return `<span class="${chipClass}">${escapeHtml(chipText)}</span>`;
    })
    .join("")}</div>`;
}

function getUnifiedSourceKey(record) {
  const mode = getResultMode(record);
  if (mode === "local" || mode === "hybrid") return "archive";
  if (mode === "external_handoff") return "handoff";
  const hint = String(record.liveSourceHint || "").toLowerCase();
  if (hint === "openalex") return "openalex";
  if (hint === "core") return "core";
  if (hint === "crossref") return "crossref";
  if (hint === "semantic-scholar") return "semantic-scholar";
  if (hint === "wikidata") return "wikidata";
  if (hint === "library-of-congress") return "library-of-congress";
  if (hint === "smithsonian") return "smithsonian";
  if (hint === "openaccesspack" || isOpenAccessDiscoveryRecord(record)) return "openaccess";
  if (["openlibrary", "loc", "loc-catalog", "met", "wikimedia"].includes(hint)) return "archival-external";
  return "external";
}

function getUnifiedSourceLabel(sourceKey) {
  const labels = {
    archive: "Archive",
    openalex: "OpenAlex",
    core: "CORE",
    crossref: "Crossref",
    "semantic-scholar": "Semantic Scholar",
    wikidata: "Wikidata",
    openaccess: "Open access",
    handoff: "Source handoff",
    external: "External",
    "library-of-congress": "Library of Congress",
    smithsonian: "Smithsonian",
    "archival-external": "Catalogue",
  };
  return labels[sourceKey] || "External";
}

function getResultKind(record) {
  const preset = record?.resultKind;
  if (preset === "primary" || preset === "entity" || preset === "handoff" || preset === "collection") {
    return preset;
  }

  const mode = getResultMode(record);
  if (mode === "external_handoff") return "handoff";

  const id = String(record?.id || "");
  if (/^handoff-/i.test(id)) return "handoff";

  const category = String(record?.sourceCategoryGroup || "").toLowerCase();
  if (category === "source_handoffs") return "handoff";
  if (category === "australian_open_collections") return "collection";

  const type = String(record?.type || "").toLowerCase();
  const cat = String(record?.cat || "").toLowerCase();
  const collection = String(record?.collection || "").toLowerCase();
  const title = String(record?.title || "").trim();

  if (
    type.includes("external handoff") ||
    cat.includes("handoff") ||
    collection.includes("source handoff") ||
    collection.includes("external source handoff")
  ) {
    return "handoff";
  }

  if (
    type.includes("archive pathway") ||
    cat.includes("external source pathways") ||
    collection.includes("open collection") ||
    collection.includes("external source handoffs")
  ) {
    return "collection";
  }

  if (/^search .+/i.test(title) && !record?.doi && !record?.abstract) {
    return "handoff";
  }

  const hint = String(record?.liveSourceHint || "").toLowerCase();
  if (hint === "handoff") return "handoff";
  if (hint === "wikidata" || /^live-wikidata-/i.test(id) || /^Q\d+$/i.test(id)) return "entity";

  return "primary";
}

function getResultRankGroup(record) {
  const kind = getResultKind(record);
  return kind === "handoff" || kind === "collection" ? 1 : 0;
}

function ensureResultKind(record) {
  if (!record || typeof record !== "object") return record;
  record.resultKind = getResultKind(record);
  return record;
}

function extractRecordDoi(record) {
  const raw = record.doi || record.DOI || "";
  if (raw) return String(raw).replace(/^https?:\/\/doi\.org\//i, "").trim().toLowerCase();
  const links = Array.isArray(record.externalLinks) ? record.externalLinks : [];
  const doiLink = links.find((link) => /doi\.org/i.test(String(link?.url || "")));
  if (doiLink?.url) return String(doiLink.url).replace(/^https?:\/\/doi\.org\//i, "").trim().toLowerCase();
  return "";
}

function unifiedDedupeKey(record) {
  const doi = extractRecordDoi(record);
  if (doi) return `doi:${doi}`;
  const id = String(record.recordIdentifier || record.id || "");
  if (/openalex\.org\/W/i.test(id) || /^live-openalex-/i.test(record.id)) {
    return `openalex:${id.replace(/^https?:\/\/openalex\.org\//i, "")}`;
  }
  if (/^core-/i.test(record.id)) return `core:${record.id}`;
  if (/^live-semantic-scholar-/i.test(record.id)) {
    return `semantic-scholar:${id.replace(/^live-semantic-scholar-/i, "")}`;
  }
  if (/^live-wikidata-/i.test(record.id) || /^Q\d+$/i.test(id)) {
    return `wikidata:${id.replace(/^live-wikidata-/i, "").toUpperCase()}`;
  }
  if (/^live-smithsonian-/i.test(record.id)) {
    return `smithsonian:${id.replace(/^live-smithsonian-/i, "")}`;
  }
  return `title:${normalizeComparable(record.title || "")}|${normalizeComparable(record.period || "")}`;
}

function getRecordYear(record) {
  const raw = record.period ?? record.year ?? "";
  const year = Number.parseInt(String(raw).slice(0, 4), 10);
  return Number.isFinite(year) ? year : 0;
}

function getCitationCount(record) {
  if (typeof record.citedByCount === "number") return record.citedByCount;
  if (typeof record.citationCount === "number") return record.citationCount;
  const description = Array.isArray(record.description)
    ? record.description.join(" ")
    : String(record.description || "");
  const match = description.match(/Citations:\s*(\d+)/i);
  return match ? Number.parseInt(match[1], 10) || 0 : 0;
}

function gatherSearchResultFields(record) {
  const description = Array.isArray(record.description)
    ? record.description.join(" ")
    : String(record.description || "");
  const authors = [record.creator, ...(record.contributors || [])].filter(Boolean).join(" ");
  const keywords = [
    ...(record.tags || []),
    ...(record.keywords || []),
    ...(record.concepts || []),
    ...(record.themes || []),
  ].join(" ");
  const geo = [record.country, record.region, record.community, ...(record.countries || []), ...(record.regions || [])]
    .filter(Boolean)
    .join(" ");
  const languages = (record.language || []).join(" ");
  const sourceLabels = [record.source, record.sourceName, record.institution, record.collection, record.liveSourceHint]
    .filter(Boolean)
    .join(" ");

  return {
    title: foldText(record.title),
    authors: foldText(authors),
    summary: foldText([record.abstract, record.summary].filter(Boolean).join(" ")),
    description: foldText(description),
    keywords: foldText(keywords),
    geo: foldText(geo),
    languages: foldText(languages),
    sourceLabels: foldText(sourceLabels),
    fullText: foldText(
      [record.title, authors, record.abstract, record.summary, description, keywords, geo, languages, sourceLabels]
        .filter(Boolean)
        .join(" "),
    ),
  };
}

function countQueryTokenHits(text, tokens) {
  return tokens.reduce((count, token) => (text.includes(token) ? count + 1 : count), 0);
}

function fuzzyPartialMatchBoost(text, token) {
  if (!token || token.length < 4 || text.includes(token)) return 0;
  if (token.length >= 5) {
    const prefix = token.slice(0, Math.max(4, token.length - 1));
    if (text.includes(prefix)) return 2;
  }
  return 0;
}

function scoreSearchResult(record, query, options = {}) {
  const context = buildQueryContext(query);
  if (!context.raw) return 0;

  const fields = gatherSearchResultFields(record);
  const queryFold = foldText(query);
  const tokens = context.tokens;
  const sourceKey = options.sourceKey || getUnifiedSourceKey(record);
  let score = 0;

  if (queryFold && fields.title === queryFold) score += 100;
  else if (queryFold && fields.title.includes(queryFold)) score += 72;

  if (tokens.length) {
    const titleHits = countQueryTokenHits(fields.title, tokens);
    if (titleHits === tokens.length) score += 58;
    else score += titleHits * 14;
  }

  if (queryFold && (fields.authors === queryFold || fields.authors.includes(` ${queryFold} `))) {
    score += 78;
  } else if (tokens.length && tokens.every((token) => fields.authors.includes(token))) {
    score += 52;
  } else {
    score += countQueryTokenHits(fields.authors, tokens) * 16;
  }

  for (const phrase of context.phrases) {
    const foldedPhrase = foldText(phrase);
    if (!foldedPhrase) continue;
    if (fields.title.includes(foldedPhrase)) score += 42;
    else if (fields.fullText.includes(foldedPhrase)) score += 24;
    if (fields.keywords.includes(foldedPhrase)) score += 32;
  }

  if (tokens.length >= 2) {
    const joined = tokens.join(" ");
    if (fields.keywords.includes(joined)) score += 36;
    if (fields.fullText.includes(joined)) score += 30;
    if (fields.title.includes(joined)) score += 48;
  }

  Object.entries(SEMINAL_AUTHOR_BOOSTS).forEach(([concept, authors]) => {
    const conceptNorm = normalizeComparable(concept);
    if (!context.normalized.includes(conceptNorm) && !tokens.every((token) => conceptNorm.includes(token))) return;
    authors.forEach((author) => {
      if (fields.authors.includes(author)) score += 50;
      if (fields.keywords.includes(author)) score += 24;
    });
  });

  if (String(record.abstract || "").trim().length > 80) score += 8;
  else if (String(record.id || "").startsWith("live-") && !String(record.summary || "").trim()) score -= 6;

  for (const token of tokens) {
    if (fields.summary.includes(token)) score += 9;
    if (fields.description.includes(token)) score += 8;
    if (fields.keywords.includes(token)) score += 11;
    if (fields.geo.includes(token)) score += 7;
    if (fields.languages.includes(token)) score += 6;
    if (fields.sourceLabels.includes(token)) score += 5;
    score += fuzzyPartialMatchBoost(fields.title, token);
    score += fuzzyPartialMatchBoost(fields.authors, token);
  }

  const apiScore = Number(record.unifiedRelevanceScore ?? record.relevanceScore ?? 0);
  if (apiScore > 0) score += Math.min(apiScore * 0.35, 24);

  const citations = getCitationCount(record);
  if (citations > 0) score += Math.min(Math.log10(citations + 1) * 4, 12);

  const isOpenAccess =
    options.isOpenAccess ??
    Boolean(record.is_oa || record.open_access?.is_oa || isOpenAccessDiscoveryRecord(record));
  if (isOpenAccess) score += 4;

  if (sourceKey === "library-of-congress") {
    const mediaTypes = (record.mediaTypes || []).join(" ").toLowerCase();
    const hasMedia = Boolean(record.audioUrl || record.videoUrl || record.imageUrl || (record.images || []).length);
    if (hasMedia) score += 10;
    if (/audio|video|oral history|sound|recording|film|photograph/.test(mediaTypes)) score += 8;
    if (record.decolonialSignal) score += 14;
    if (options.decolonialMode && record.decolonialSignal) score += 12;
  }

  if (sourceKey === "archive") score += 8;
  if (sourceKey === "handoff") score -= 15;
  if (sourceKey === "archival-external") score += 6;
  if (sourceKey === "smithsonian") score += 6;
  if (sourceKey === "library-of-congress") score += 6;

  return score;
}

function compareUnifiedEntries(a, b, query) {
  const groupDiff = getResultRankGroup(a.record) - getResultRankGroup(b.record);
  if (groupDiff) return groupDiff;

  const sortMode = unifiedStreamSort || "relevance";

  if (sortMode === "newest") {
    return (
      getRecordYear(b.record) - getRecordYear(a.record) ||
      b.score - a.score ||
      String(a.record.title || "").localeCompare(String(b.record.title || ""))
    );
  }

  if (sortMode === "cited") {
    return (
      getCitationCount(b.record) - getCitationCount(a.record) ||
      b.score - a.score ||
      String(a.record.title || "").localeCompare(String(b.record.title || ""))
    );
  }

  if (sortMode === "source") {
    const order = (key) => {
      const index = UNIFIED_SOURCE_SORT_ORDER.indexOf(String(key || ""));
      return index === -1 ? UNIFIED_SOURCE_SORT_ORDER.length : index;
    };
    return (
      order(a.sourceKey) - order(b.sourceKey) ||
      b.score - a.score ||
      String(a.record.title || "").localeCompare(String(b.record.title || ""))
    );
  }

  const scoreDiff = b.score - a.score;
  if (scoreDiff) return scoreDiff;

  const archiveDiff = (a.sourceKey === "archive" ? 1 : 0) - (b.sourceKey === "archive" ? 1 : 0);
  if (archiveDiff) return archiveDiff;

  const yearDiff = getRecordYear(b.record) - getRecordYear(a.record);
  if (yearDiff) return yearDiff;

  const citationDiff = getCitationCount(b.record) - getCitationCount(a.record);
  if (citationDiff) return citationDiff;

  return String(a.record.title || "").localeCompare(String(b.record.title || ""));
}

function scoreUnifiedResult(record, query) {
  const sourceKey = getUnifiedSourceKey(record);
  return scoreSearchResult(record, query, { sourceKey, decolonialMode: getDecolonialMode() });
}

function matchesUnifiedStreamFilter(record, filterId) {
  if (!filterId || filterId === "all") return true;
  const key = getUnifiedSourceKey(record);
  if (filterId === "scholarly") return ["openalex", "core", "crossref", "semantic-scholar"].includes(key);
  if (filterId === "archival") return key === "archive" || key === "archival-external" || key === "library-of-congress" || key === "smithsonian";
  if (filterId === "openaccess") return key === "openaccess" || isOpenAccessDiscoveryRecord(record);
  if (filterId === "library-of-congress") return key === "library-of-congress";
  return key === filterId;
}

function collectDiscoveryLiveRecords() {
  const items = [];
  for (const sectionId of UNIFIED_STREAM_SECTION_IDS) {
    const section = discoverySections[sectionId];
    if (!section?.results?.length) continue;
    let records = section.results;
    if (sectionId === "openAccess") {
      records = section.results.slice(0, openAccessReleasedCount);
    }
    for (const record of records) {
      if (getResultMode(record) === "live") items.push(record);
    }
  }
  return items;
}

function collectDiscoveryBottomLayerRecords() {
  const items = [];
  const seen = new Set();

  const add = (record) => {
    if (!record || getResultRankGroup(record) === 0) return;
    const key = String(record.id || unifiedDedupeKey(record));
    if (seen.has(key)) return;
    seen.add(key);
    items.push(record);
  };

  for (const record of discoverySections.handoffs?.results || []) add(record);

  const openAccessSection = discoverySections.openAccess;
  if (openAccessSection?.results?.length) {
    for (const record of openAccessSection.results.slice(0, openAccessReleasedCount)) {
      add(record);
    }
  }

  return items;
}

function mergeAndRankSearchResults({ query, internalResults, includeHandoffs = false }) {
  const entries = [];
  for (const record of internalResults || []) {
    entries.push({ record: ensureResultKind(record), sourceKey: "archive", score: 0 });
  }
  if (sourceMode) {
    for (const record of collectDiscoveryLiveRecords()) {
      entries.push({ record: ensureResultKind(record), sourceKey: getUnifiedSourceKey(record), score: 0 });
    }
    if (includeHandoffs) {
      for (const record of collectDiscoveryBottomLayerRecords()) {
        entries.push({ record: ensureResultKind(record), sourceKey: getUnifiedSourceKey(record), score: 0 });
      }
    }
  }

  for (const entry of entries) {
    entry.score = scoreSearchResult(entry.record, query, { sourceKey: entry.sourceKey, decolonialMode: getDecolonialMode() });
  }
  entries.sort((a, b) => compareUnifiedEntries(a, b, query));

  const seen = new Map();
  const merged = [];

  const pushEntry = (entry) => {
    const key = unifiedDedupeKey(entry.record);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, entry);
      merged.push(entry);
      return;
    }
    if (entry.sourceKey === "archive" && existing.sourceKey !== "archive") {
      const alternates = existing.record.alternateSources || [
        getUnifiedSourceLabel(existing.sourceKey),
      ];
      seen.set(key, entry);
      entry.record = {
        ...entry.record,
        alternateSources: alternates.filter(Boolean),
      };
      const idx = merged.findIndex((item) => unifiedDedupeKey(item.record) === key);
      if (idx >= 0) merged[idx] = entry;
      else merged.push(entry);
    }
  };

  for (const entry of entries) pushEntry(entry);

  return merged.map((entry) => {
    entry.record.unifiedSourceKey = entry.sourceKey;
    entry.record.unifiedSourceLabel = getUnifiedSourceLabel(entry.sourceKey);
    entry.record.unifiedRelevanceScore = entry.score;
    entry.record.resultKind = getResultKind(entry.record);
    return entry.record;
  });
}

function estimateUnifiedTotalCount(rankedAll) {
  let total = rankedAll.length;
  for (const sectionId of ["openalex", "core", "crossref", "semantic-scholar", "smithsonian"]) {
    const section = discoverySections[sectionId];
    if (section?.count != null && section.count > total) total = section.count;
  }
  return total;
}

function getUnifiedSourceNames(rankedAll) {
  const names = new Set();
  for (const record of rankedAll) {
    names.add(getUnifiedSourceLabel(getUnifiedSourceKey(record)));
  }
  return [...names];
}

function canLoadMorePreviewsSection() {
  const pag = discoverySections.previews?.previewPagination;
  if (!pag) return false;
  return PREVIEW_ADAPTER_IDS.some((id) => pag[id]?.hasMore);
}

function canLoadMoreUnifiedStream(filteredRanked) {
  if (unifiedStreamVisibleCount < filteredRanked.length) return true;
  if (canLoadMoreArchive()) return true;
  if (canLoadMoreOpenAccessReleased()) return true;
  if (canLoadMorePreviewsSection()) return true;
  return UNIFIED_PAGINATED_SECTION_IDS.some((id) => canLoadMoreDiscoverySection(id));
}

function isUnifiedStreamExhausted(filteredRanked) {
  return !canLoadMoreUnifiedStream(filteredRanked) && filteredRanked.length > 0;
}

function getDiscoverySourcesStatusLine() {
  const parts = ["Archive active"];
  if (!sourceMode) return parts.join(" · ");
  const labels = {
    openalex: "OpenAlex",
    core: "CORE",
    crossref: "Crossref",
    "semantic-scholar": "Semantic Scholar",
    wikidata: "Wikidata",
    "library-of-congress": "Library of Congress",
    smithsonian: "Smithsonian",
    openAccess: "Open access",
    previews: "Catalogues",
  };
  for (const [id, label] of Object.entries(labels)) {
    const section = discoverySections[id];
    if (!section) continue;
    if (section.state === "loading") parts.push(`${label} loading`);
    else if (section.error) parts.push(`${label} unavailable`);
    else if (section.displayedCount > 0) parts.push(`${label} active`);
    else if (id !== "previews") parts.push(`${label} empty`);
  }
  if (discoverySections.previews?.displayedCount > 0) {
    const previewCounts = PREVIEW_ADAPTER_IDS.map((adapterId) => {
      const n = (discoverySections.previews.results || []).filter(
        (record) => String(record.liveSourceHint || "").toLowerCase() === adapterId,
      ).length;
      if (!n) return null;
      const name =
        adapterId === "wikimedia"
          ? "Wikimedia"
          : adapterId === "openlibrary"
            ? "Open Library"
            : adapterId === "met"
              ? "The Met"
              : adapterId;
      return `${name} ${n}`;
    }).filter(Boolean);
    if (previewCounts.length) parts.push(previewCounts.join(", "));
  }
  return parts.join(" · ");
}

let mobileFiltersOpen = false;
const COLLECTIONS = [
  {id:"c001",title:"West African Oral Traditions",icon:"◎",count:847,region:"West Africa",desc:"Oral histories, praise poetry, and spoken knowledge systems — Ifa corpus, griots, and community testimony."},
  {id:"c002",title:"Decolonial Theory Canon",icon:"◈",count:1203,region:"Global",desc:"Foundational texts by Fanon, Cabral, Nkrumah, Wiredu, Gyekye, Mbembe, Santos, Escobar, and beyond."},
  {id:"c003",title:"African Material Culture",icon:"▣",count:3421,region:"Pan-Africa",desc:"Textiles, artefacts, ceramics, metals, and objects as knowledge carriers — including documentation of looted and repatriated works."},
  {id:"c004",title:"Liberation Movement Graphics",icon:"▤",count:912,region:"Southern Africa",desc:"Posters, pamphlets, and visual materials from African independence and liberation movements, 1950s–1990s."},
  {id:"c005",title:"Manuscripts & Precolonial Texts",icon:"▦",count:2100,region:"West / North Africa",desc:"Manuscripts in Arabic, Ajami, Ge'ez, and other writing systems documenting precolonial African scholarship."},
  {id:"c006",title:"Architecture Beyond Colonialism",icon:"▧",count:654,region:"Pan-Africa",desc:"Precolonial, vernacular, and Indigenous African architectural traditions from Great Zimbabwe to the Swahili coast."},
  {id:"c007",title:"African Philosophy Working Library",icon:"◬",count:0,region:"Africa / Global",desc:"Expanded local shelf of African philosophy, political thought, music, literature, religion, and adjacent working-library texts imported for static search."}
];

const THEMES = ["Decolonising Knowledges","Decolonial Theory","Visual Sovereignty","Cultural Memory","Archival Recovery","Indigenous Epistemologies","Oral Traditions","Liberation Movements","Precolonial Knowledge","Diaspora","Pan-Africanism","Reparative History","Material Culture","Design & Making","Language & Script","Repatriation","African Philosophy","Ubuntu","Sankofa","Black Consciousness","Political Thought","Religion & Cosmology","Gender Studies","Music & Performance"];

const SOURCES = [
  {id:"s001",name:"PRAAD",region:"Ghana / West Africa",type:"African-Priority",access:"linked",desc:"Public Records and Archives Administration Department. Colonial and postcolonial Ghanaian state records.",url:"https://praad.gov.gh"},
  {id:"s002",name:"sourceAFRICA",region:"Pan-Africa",type:"African-Priority",access:"linked",desc:"Open-source investigative documents from African newsrooms and civic archives.",url:"https://sourceafrica.net"},
  {id:"s003",name:"AODL — African Online Digital Library",region:"Pan-Africa",type:"African-Priority",access:"linked",desc:"Michigan State University aggregation of digitised African archives and collections.",url:"https://aodl.org"},
  {id:"s004",name:"Open Restitution Africa",region:"Pan-Africa",type:"African-Priority",access:"linked",desc:"Database of African cultural objects held in European and North American collections.",url:"https://openrestitution.africa"},
  {id:"s005",name:"SAHO — South African History Online",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"South African history resource with images, oral testimonies, and documents.",url:"https://sahistory.org.za"},
  {id:"s006",name:"SAHA — South African History Archive",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"Human rights and justice archive with apartheid-era records and community collections.",url:"https://saha.org.za"},
  {id:"s007",name:"SAHRIS — South African Heritage Resources",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"National heritage resources information system with registered sites and archaeological records.",url:"https://sahris.sahra.org.za"},
  {id:"s008",name:"NARSSA",region:"Southern Africa",type:"African-Priority",access:"partner",desc:"National Archives and Records Service of South Africa. State records from colonial and apartheid eras.",url:"https://www.nationalarchives.gov.za"},
  {id:"s009",name:"Ahmed Baba Institute",region:"West Africa / Sahel",type:"African-Priority",access:"partner",desc:"Repository of the Timbuktu manuscripts and related Sahelian documentary traditions.",url:"https://www.ahmed-baba.ml"},
  {id:"s010",name:"WIReDSpace",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"Wits institutional repository with African research and decolonial scholarship.",url:"https://wiredspace.wits.ac.za"},
  {id:"s011",name:"OpenUCT",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"University of Cape Town open access repository for African studies and social research.",url:"https://open.uct.ac.za"},
  {id:"s012",name:"Ghana Digital Archives (ISSER)",region:"West Africa",type:"African-Priority",access:"partner",desc:"Historical surveys and social data from the Institute of Statistical, Social and Economic Research.",url:"https://www.isser.edu.gh"},
  {id:"s013",name:"KNUST Repository",region:"West Africa",type:"African-Priority",access:"linked",desc:"Kwame Nkrumah University of Science and Technology institutional repository.",url:"https://ir.knust.edu.gh"},
  {id:"s014",name:"Kenya National Archives",region:"East Africa",type:"African-Priority",access:"partner",desc:"State records including colonial-era documents, Mau Mau files, and early independence records.",url:"https://www.kenyaarchives.go.ke"},
  {id:"s015",name:"Endangered Archives Programme (EAP)",region:"Pan-Africa / Global South",type:"African-Priority",access:"linked",desc:"Digitised endangered archives from across Africa and the Global South.",url:"https://eap.bl.uk"},
  {id:"s016",name:"Digital Innovation South Africa (DISA)",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"Digitised liberation-era South African newspapers, pamphlets, and movement papers.",url:"https://disa.ukzn.ac.za"},
  {id:"s017",name:"AfricArXiv",region:"Pan-Africa",type:"African-Priority",access:"linked",desc:"Preprint server for African research across sciences, humanities, and design.",url:"https://africaarxiv.org"},
  {id:"s018",name:"CODESRIA Publications",region:"Pan-Africa",type:"African-Priority",access:"linked",desc:"Open access monographs and journals from the Council for the Development of Social Science Research in Africa.",url:"https://www.codesria.org/publications"},
  {id:"s019",name:"Pan-African Music Archive (PAMA)",region:"Pan-Africa",type:"African-Priority",access:"partner",desc:"Oral tradition recordings, griot lineages, and field recordings from across the continent.",url:""},
  {id:"s020",name:"Internet Archive",region:"Global",type:"Search-Ready",access:"search",desc:"Extensive digitised African texts, periodicals, posters, and archival documents.",url:"https://archive.org",searchTemplate:"https://archive.org/search?query="},
  {id:"s021",name:"Open Library",region:"Global",type:"Search-Ready",access:"search",desc:"Book discovery interface with strong African and diaspora literature coverage.",url:"https://openlibrary.org",searchTemplate:"https://openlibrary.org/search?q="},
  {id:"s022",name:"V&A Collections",region:"Global",type:"Search-Ready",access:"search",desc:"Material culture, textiles, ceramics, and object records.",url:"https://collections.vam.ac.uk",searchTemplate:"https://collections.vam.ac.uk/search/?q="},
  {id:"s023",name:"The Metropolitan Museum of Art",region:"Global",type:"Search-Ready",access:"search",desc:"Open collection search including African art and global material culture.",url:"https://www.metmuseum.org/art/collection",searchTemplate:"https://www.metmuseum.org/art/collection/search?q="},
  {id:"s024",name:"Art Institute of Chicago",region:"Global",type:"Search-Ready",access:"search",desc:"Search-ready public collection including African and diaspora works.",url:"https://www.artic.edu/collection",searchTemplate:"https://www.artic.edu/search?q="},
  {id:"s025",name:"Wellcome Collection",region:"Global",type:"Search-Ready",access:"search",desc:"Health, science, and culture records, including African ethnographic photographs and archives.",url:"https://wellcomecollection.org",searchTemplate:"https://wellcomecollection.org/search/works?query="},
  {id:"s026",name:"Gallica — BnF",region:"Global",type:"Search-Ready",access:"search",desc:"French colonial-era Africa documentation, photographs, newspapers, and books.",url:"https://gallica.bnf.fr",searchTemplate:"https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&query="},
  {id:"s027",name:"Library of Congress",region:"Global",type:"Search-Ready",access:"search",desc:"Photograph collections, maps, and diaspora research materials.",url:"https://www.loc.gov",searchTemplate:"https://www.loc.gov/search/?q="},
  {id:"s028",name:"Europeana",region:"Global / Europe",type:"Search-Ready",access:"search",desc:"Aggregated museum and library records from Europe with African holdings.",url:"https://www.europeana.eu",searchTemplate:"https://www.europeana.eu/en/search?query="},
  {id:"s029",name:"DPLA — Digital Public Library of America",region:"Americas",type:"Search-Ready",access:"search",desc:"African American collections, diaspora archives, and US-held African cultural materials.",url:"https://dp.la",searchTemplate:"https://dp.la/search?q="},
  {id:"s030",name:"Smithsonian — NMAFA",region:"Americas",type:"Search-Ready",access:"search",desc:"National Museum of African Art holdings and related Smithsonian collections.",url:"https://africa.si.edu",searchTemplate:"https://www.si.edu/search?edan_q="},
  {id:"s031",name:"British Museum Collection",region:"Global",type:"Search-Ready",access:"search",desc:"African object records including Benin, West African, and East African holdings.",url:"https://www.britishmuseum.org/collection",searchTemplate:"https://www.britishmuseum.org/collection/search?keyword="},
  {id:"s032",name:"Wikimedia Commons (Africa)",region:"Global",type:"Search-Ready",access:"search",desc:"Open image and media discovery pathway for African cultural content.",url:"https://commons.wikimedia.org",searchTemplate:"https://commons.wikimedia.org/w/index.php?search="},
  {id:"s033",name:"OpenAlex",region:"Global",type:"Search-Ready",access:"search",desc:"Open scholarly graph for African and decolonial academic literature.",url:"https://openalex.org",searchTemplate:"https://openalex.org/works?search="},
  {id:"s034",name:"BASE — Bielefeld Academic Search Engine",region:"Global",type:"Search-Ready",access:"search",desc:"Academic document discovery with strong repository coverage.",url:"https://www.base-search.net",searchTemplate:"https://www.base-search.net/Search/Results?lookfor="},
  {id:"s035",name:"DOAJ — Directory of Open Access Journals",region:"Global",type:"Search-Ready",access:"search",desc:"Open access journal discovery for African studies and decolonial theory.",url:"https://doaj.org",searchTemplate:"https://doaj.org/search/articles/"},
  {id:"s036",name:"JSTOR Global Plants",region:"Global",type:"Search-Ready",access:"search",desc:"Specimen records and ethnobotanical documentation from African plant knowledge traditions.",url:"https://plants.jstor.org",searchTemplate:"https://plants.jstor.org/?q="},
  {id:"s037",name:"Anansi API (Custom)",region:"Pan-Africa",type:"Search-Ready",access:"partner",desc:"Experimental aggregation layer for African digital archives.",url:""},
  {id:"s038",name:"CrossRef — African Publishers",region:"Global",type:"Search-Ready",access:"search",desc:"DOI and publisher metadata for African research outputs.",url:"https://search.crossref.org",searchTemplate:"https://search.crossref.org/?q="},
  {id:"s039",name:"Google Books",region:"Global",type:"Search-Ready",access:"search",desc:"Broad book discovery layer that is useful when a title exists in multiple editions or scans.",url:"https://books.google.com",searchTemplate:"https://books.google.com/books?q="},
  {id:"s040",name:"Google Scholar",region:"Global",type:"Search-Ready",access:"search",desc:"Scholarly discovery pathway for citations, articles, chapters, and book references.",url:"https://scholar.google.com",searchTemplate:"https://scholar.google.com/scholar?q="},
  {id:"s041",name:"JSTOR",region:"Global",type:"Search-Ready",access:"search",desc:"Search-ready scholarly archive for journals, books, and primary sources.",url:"https://www.jstor.org",searchTemplate:"https://www.jstor.org/action/doBasicSearch?Query="},
  {id:"s042",name:"HathiTrust",region:"Global",type:"Search-Ready",access:"search",desc:"Large-scale library discovery for scanned books and catalogue records.",url:"https://catalog.hathitrust.org",searchTemplate:"https://catalog.hathitrust.org/Search/Home?lookfor="},
  {id:"s043",name:"WorldCat",region:"Global",type:"Search-Ready",access:"search",desc:"Union catalogue useful for locating editions, holdings, and bibliographic variants.",url:"https://search.worldcat.org",searchTemplate:"https://search.worldcat.org/search?q="},
  {id:"s044",name:"Semantic Scholar",region:"Global",type:"Search-Ready",access:"search",desc:"Research discovery pathway for scholarly works and citation networks.",url:"https://www.semanticscholar.org",searchTemplate:"https://www.semanticscholar.org/search?q="},
  {id:"s045",name:"Project MUSE",region:"Global",type:"Search-Ready",access:"search",desc:"Books and journals in the humanities and social sciences, useful for African studies and philosophy.",url:"https://muse.jhu.edu",searchTemplate:"https://muse.jhu.edu/search?action=search&query="}
];

const BASE_RECORDS = [
  {id:"l001",title:"Kente Cloth and the Architecture of Akan Identity",type:"Textile",creator:"Asante Weavers, Bonwire",region:"West Africa",country:"Ghana",community:"Akan / Ashanti",period:"18th–21st c.",concepts:["visual sovereignty","cultural memory","indigenous epistemologies"],summary:"Kente is not merely decorative cloth. Each named pattern encodes cosmology, genealogy, and social ethics — a visual text within the Akan world.",tags:["kente","Ashanti","Ghana","textile","Akan"],rights:"Community Custodianship",provenance:"Bonwire, Ashanti Region, Ghana.",source:"Local Bank",cat:"Material Culture"},
  {id:"l002",title:"The Wretched of the Earth",type:"Book",creator:"Frantz Fanon",region:"North Africa / Diaspora",country:"Algeria / Martinique",community:"Algerian independence movement",period:"1961",concepts:["decolonisation","anti-colonial theory","liberation"],summary:"Fanon's foundational text on the psychology and politics of colonialism and decolonisation. Indispensable to decolonial thought.",tags:["Fanon","Algeria","decolonisation","political theory"],rights:"Rights Reserved",provenance:"Francois Maspero, Paris, 1961.",source:"Local Bank",cat:"Books & Texts"},
  {id:"l003",title:"Decolonising Design in Africa",type:"Book",creator:"Yaw Ofosu-Asare",region:"Africa / Global",country:"Ghana / Australia",community:"Design studies",period:"2024",concepts:["decolonial design","African design pedagogy","Sankofa methodology"],summary:"Maps the epistemological stakes of design education across the African continent through Sankofa methodology and decolonial critique.",tags:["design","Africa","decolonisation","pedagogy","Sankofa"],rights:"Rights Reserved",provenance:"Routledge, 2024.",source:"Local Bank",cat:"Books & Texts"},
  {id:"l004",title:"African Design Futures",type:"Book",creator:"Yaw Ofosu-Asare",region:"Africa / Global",country:"Ghana / Australia",community:"Design studies",period:"2024",concepts:["African design futures","decolonial pedagogy","spatial practice"],summary:"A programmatic framework for reimagining African design practice, pedagogy, and spatial production beyond colonial inheritance.",tags:["design","Africa","futures","pedagogy","spatial justice"],rights:"Rights Reserved",provenance:"Palgrave Macmillan, 2024.",source:"Local Bank",cat:"Books & Texts"},
  {id:"l005",title:"Yoruba Ifa Oral Corpus",type:"Oral History",creator:"Yoruba Babalawo tradition",region:"West Africa",country:"Nigeria / Benin / Cuba / Brazil",community:"Yoruba",period:"Pre-colonial — present",concepts:["indigenous epistemologies","oral knowledge systems","diasporic knowledge"],summary:"One of the world's most extensive oral knowledge archives — a comprehensive cosmological, philosophical, and ethical system transmitted through Babalawo lineages.",tags:["Yoruba","Nigeria","oral history","Ifa","indigenous knowledge"],rights:"Community Custodianship",provenance:"UNESCO Intangible Cultural Heritage.",source:"Local Bank",cat:"Oral Histories"},
  {id:"l006",title:"Benin Bronzes: A Documentation Record",type:"Artefact",creator:"Edo craftspeople, Benin City",region:"West Africa",country:"Nigeria",community:"Edo / Benin Kingdom",period:"13th–19th c.",concepts:["visual sovereignty","cultural memory","repatriation","archival recovery"],summary:"Among the most technically sophisticated metal artworks ever produced. Looted by British forces in 1897, thousands remain scattered across European and North American institutions.",tags:["Benin","Nigeria","bronze","repatriation","colonial plunder","Edo"],rights:"Community Custodianship — held externally",provenance:"Looted by British Punitive Expedition, 1897. British Museum (900+), Ethnologisches Museum Berlin, and others.",source:"Local Bank",cat:"Artefacts"},
  {id:"l007",title:"Great Zimbabwe: Architectural Documentation",type:"Architecture",creator:"Shona builders (Kingdom of Zimbabwe)",region:"Southern Africa",country:"Zimbabwe",community:"Shona",period:"11th–15th c.",concepts:["precolonial urbanism","indigenous epistemologies","architectural sovereignty"],summary:"The largest precolonial stone structure in sub-Saharan Africa. Colonial authorities suppressed its African origin. Its recovery as a symbol of African civilisation is central to Zimbabwean identity.",tags:["Zimbabwe","architecture","precolonial","Shona","urbanism"],rights:"UNESCO — open record",provenance:"Masvingo Province, Zimbabwe.",source:"Local Bank",cat:"Architecture"},
  {id:"l008",title:"Consciencism: Philosophy and Ideology for De-colonization",type:"Book",creator:"Kwame Nkrumah",region:"West Africa",country:"Ghana",community:"Pan-African political movement",period:"1964",concepts:["African socialism","pan-Africanism","philosophical decolonisation"],summary:"Nkrumah's philosophical framework synthesising African communalist tradition, Islam, and Euro-Christian inheritance into a foundation for African socialist politics.",tags:["Nkrumah","Ghana","pan-Africanism","philosophy","socialism"],rights:"Rights Reserved",provenance:"Heinemann, London, 1964.",source:"Local Bank",cat:"Books & Texts"},
  {id:"l009",title:"Mau Mau Testimonies: Oral Archive",type:"Oral History",creator:"Kenya Human Rights Commission / Kenya National Archives",region:"East Africa",country:"Kenya",community:"Gikuyu / Embu / Meru",period:"1952–1960",concepts:["archival recovery","reparative history","colonial violence"],summary:"Testimonies from survivors of British colonial detention camps during the Mau Mau uprising — accounts documentary records were designed to erase.",tags:["Kenya","Mau Mau","oral history","colonial violence","East Africa"],rights:"Archival — conditional access",provenance:"Kenya National Archives / KHRC oral testimony collections.",source:"Local Bank",cat:"Oral Histories"},
  {id:"l010",title:"Anti-Apartheid Movement Poster Archive",type:"Poster",creator:"ANC, PAC, UDF, COSATU",region:"Southern Africa",country:"South Africa",community:"Anti-apartheid movement",period:"1960–1990",concepts:["visual sovereignty","political graphics","cultural memory"],summary:"Political posters produced by South African liberation movements — a significant archive of decolonial visual culture produced under censorship.",tags:["South Africa","apartheid","posters","liberation","visual culture"],rights:"Mixed — movement organisations",provenance:"South African National Gallery, SOAS Digital Collections, and community archives.",source:"Local Bank",cat:"Visual Culture"},
  {id:"l011",title:"Timbuktu Manuscripts: West African Islamic Scholarship",type:"Archival Document",creator:"Various Malian and West African scholars",region:"West Africa / Sahel",country:"Mali",community:"Timbuktu scholars / Songhai / Tuareg",period:"13th–17th c.",concepts:["indigenous epistemologies","Islamic scholarship","archival recovery"],summary:"Approximately 400,000 manuscripts document West African mathematics, astronomy, medicine, jurisprudence, and philosophy — a counter-archive to colonial narratives of a pre-literate Africa.",tags:["Mali","Timbuktu","manuscripts","Islam","precolonial","scholarship"],rights:"Community Custodianship",provenance:"Ahmed Baba Institute, Timbuktu. Some digitised via Hamburg University.",source:"Local Bank",cat:"Archival Documents"},
  {id:"l012",title:"Ndebele Wall Painting: Visual Knowledge Traditions",type:"Image",creator:"Ndebele women artists, Mpumalanga",region:"Southern Africa",country:"South Africa",community:"Ndebele",period:"19th c. — present",concepts:["visual sovereignty","indigenous design","women's knowledge"],summary:"A visual language developed and transmitted by women. Geometric patterns encode social status, identity, and cosmological knowledge — intensified as cultural resistance during apartheid.",tags:["Ndebele","South Africa","wall painting","women","geometric","design"],rights:"Community Custodianship",provenance:"Mpumalanga Province, South Africa.",source:"Local Bank",cat:"Visual Culture"},
  {id:"l013",title:"Return to the Source: Selected Speeches of Amilcar Cabral",type:"Archival Document",creator:"Amilcar Cabral",region:"West Africa",country:"Guinea-Bissau / Cape Verde",community:"PAIGC / African liberation movements",period:"1966–1972",concepts:["anti-colonial theory","cultural identity","decolonial epistemology"],summary:"Cabral's speeches articulate culture as a force of liberation — culture as the foundation of political freedom and the site of decolonisation.",tags:["Cabral","Guinea-Bissau","liberation","culture","political theory"],rights:"Rights Reserved",provenance:"Monthly Review Press, New York, 1973.",source:"Local Bank",cat:"Archival Documents"},
  {id:"l014",title:"Ubuntu Philosophy: A Communal Ethics",type:"Philosophy & Theory",creator:"Various African philosophy scholars",region:"Southern / Eastern Africa",country:"South Africa / Zimbabwe / Tanzania",community:"Nguni / Bantu language communities",period:"Pre-colonial — present",concepts:["African philosophy","communalism","indigenous epistemologies"],summary:"Ubuntu — 'I am because we are' — frames communal personhood, ethical reciprocity, and shared humanity across much of sub-Saharan African social thought.",tags:["Ubuntu","philosophy","ethics","South Africa","communalism","African humanism"],rights:"Open — community knowledge",provenance:"Living tradition.",source:"Local Bank",cat:"Philosophy & Theory"},
  {id:"l015",title:"Lamu Old Town: Swahili Coast Architecture",type:"Architecture",creator:"Swahili master builders",region:"East Africa",country:"Kenya",community:"Swahili",period:"14th–19th c.",concepts:["precolonial urbanism","Indian Ocean networks","architectural sovereignty"],summary:"The oldest and best-preserved Swahili settlement in East Africa demonstrates an urban tradition shaped through Indian Ocean trade networks long before European colonialism.",tags:["Lamu","Kenya","Swahili","architecture","Indian Ocean","heritage"],rights:"UNESCO — open record",provenance:"Lamu County, Kenya. UNESCO World Heritage Site since 2001.",source:"Local Bank",cat:"Architecture"},
  {id:"l016",title:"Sankofa Methodology in Design Education",type:"Philosophy & Theory",creator:"Yaw Ofosu-Asare",region:"Africa / Global",country:"Ghana / Australia",community:"Design pedagogy",period:"2020–2024",concepts:["Sankofa","decolonial pedagogy","African futures","design education"],summary:"Sankofa — 'it is not wrong to go back for what you forgot' — is used here as a methodological framework for recovering precolonial knowledge architectures as generative design tools.",tags:["Sankofa","Ghana","pedagogy","design","decolonisation","methodology"],rights:"Author",provenance:"Melbourne, Australia.",source:"Local Bank",cat:"Philosophy & Theory"},
  {id:"l017",title:"Dialogues of Liberation: Fanon, Cabral, and Nkrumah",type:"Journal Article",creator:"Yaw Ofosu-Asare",region:"Africa / Global",country:"Ghana / Australia",community:"African studies / Design research",period:"2025",concepts:["liberation theory","decolonial epistemology","African philosophy"],summary:"Comparative reading of Fanon, Cabral, and Nkrumah as a unified philosophical project — tracing convergences in their theories of culture, consciousness, and political transformation.",tags:["Fanon","Cabral","Nkrumah","liberation","African philosophy","decolonisation"],rights:"Author",provenance:"African Identities, 2025.",source:"Local Bank",cat:"Books & Texts"},
  {id:"l018",title:"PRAAD: Public Records and Archives Administration",type:"Institutional Record",creator:"Government of Ghana",region:"West Africa",country:"Ghana",community:"Ghanaian public institutions",period:"Colonial era — present",concepts:["archival recovery","institutional memory","colonial documentation"],summary:"The national repository for Ghana's public records includes colonial administrative documents, treaties, maps, photographs, and land records from the Gold Coast era onward.",tags:["Ghana","archives","PRAAD","colonial records","West Africa"],rights:"Archival — institutional access",provenance:"Public Records and Archives Administration Department, Accra, Ghana.",source:"PRAAD",cat:"Archival Documents"},
  {id:"l019",title:"Adinkra Symbols: A Visual Philosophy of the Akan",type:"Visual Culture",creator:"Akan artisans, Ashanti Region",region:"West Africa",country:"Ghana",community:"Akan",period:"Pre-colonial — present",concepts:["indigenous epistemologies","visual sovereignty","African philosophy"],summary:"Adinkra symbols encode proverbs, philosophical concepts, and historical events in visual form — a system of pictographic communication used in textiles, pottery, metalwork, and architecture.",tags:["Adinkra","Ghana","Akan","philosophy","visual culture","symbols"],rights:"Community Custodianship",provenance:"Ntonso and surrounding communities, Ashanti Region, Ghana.",source:"Local Bank",cat:"Visual Culture"},
  {id:"l020",title:"Steve Biko: I Write What I Like",type:"Book",creator:"Steve Biko",region:"Southern Africa",country:"South Africa",community:"Black Consciousness Movement",period:"1978",concepts:["Black Consciousness","anti-apartheid","decolonial epistemology"],summary:"Collected writings of Steve Biko — the foundational text of Black Consciousness philosophy in South Africa, arguing for psychological decolonisation as the precondition for liberation.",tags:["Biko","South Africa","Black Consciousness","liberation","philosophy","anti-apartheid"],rights:"Rights Reserved",provenance:"Bowerdean Press, London, 1978.",source:"Local Bank",cat:"Books & Texts"}
];

const RECORD_ENRICHMENTS = {
  l001:{
    alternateTitle:"Named Kente patterns as social text",
    abstract:"Kente functions as a textile archive of Akan political memory and moral philosophy. Pattern names, colour systems, and weaving sequences communicate rank, kinship, diplomacy, grief, and public ethics.",
    description:[
      "This entry treats Kente as both material culture and epistemic infrastructure. Rather than approaching the cloth as surface ornament, it frames weaving practice as a structured archive in which pattern names, ceremonial use, and transmission lineages store historical and social knowledge.",
      "The record foregrounds cloth as a living medium: produced, interpreted, and renewed through use in festivals, funerals, courts, and rites of passage. The archive value lies not only in surviving textiles but also in the vocabularies and relationships that keep those meanings legible."
    ],
    institution:"Bonwire weaving communities",
    collection:"African Material Culture",
    language:["Twi","English"],
    material:"Silk and cotton textile",
    medium:"Handwoven strip cloth",
    themes:["Visual Sovereignty","Material Culture"],
    keywords:["pattern names","Asante court culture","weaving knowledge"],
    notes:["Some knowledge is ceremonial or lineage-specific and should not be detached from community context.","Community custodianship takes priority over extractive image capture or reproduction."],
    archiveIdentifier:"DA-TEXTILE-001",
    recordIdentifier:"AKAN-KENTE-001"
  },
  l002:{
    alternateTitle:"Les Damnes de la Terre",
    abstract:"A foundational anti-colonial text analysing colonial violence, political subject formation, and the difficult psychic work of national liberation.",
    description:[
      "This record centres Fanon's argument that colonialism reorganises both institutions and interior life. The book remains central because it does not treat decolonisation as administrative transfer alone: it reads liberation as a struggle over political imagination, violence, class formation, and the remaking of social relations.",
      "Within the archive, the text operates as a major theoretical hinge linking liberation movements in Africa to broader decolonial discourse across the Global South and diaspora. It is frequently cited alongside Nkrumah, Cabral, and Biko."
    ],
    institution:"Open Library discovery pathway",
    sourceUrl:"https://openlibrary.org/search?q=The%20Wretched%20of%20the%20Earth",
    sourceActionLabel:"Open discovery page",
    collection:"Decolonial Theory Canon",
    language:["French","English"],
    keywords:["colonial violence","national culture","liberation struggle"],
    externalLinks:[{label:"Open Library search",url:"https://openlibrary.org/search?q=The%20Wretched%20of%20the%20Earth"}],
    notes:["Different editions and translations vary in apparatus, forewords, and pagination."],
    archiveIdentifier:"DA-BOOK-002",
    recordIdentifier:"FANON-WE-1961"
  },
  l003:{
    abstract:"A contemporary study of decolonial design education across Africa, using Sankofa as both analytic lens and design method.",
    description:[
      "This record documents a recent intervention in design studies that repositions African knowledge systems as generative rather than supplementary. It addresses curriculum, institutional structures, and the persistence of colonial design canons within contemporary education.",
      "The text is useful as both research source and programmatic framework. It links historical critique to pedagogical practice, making it especially relevant for design schools, archive workers, and cultural institutions rethinking methodological foundations."
    ],
    institution:"Routledge",
    sourceUrl:"https://www.routledge.com",
    sourceActionLabel:"Visit publisher",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["design education","African methodologies","curriculum reform"],
    notes:["Useful companion record for Sankofa-focused entries and related design pedagogy material."],
    archiveIdentifier:"DA-BOOK-003",
    recordIdentifier:"YOA-DDA-2024"
  },
  l004:{
    abstract:"A speculative and strategic framework for African design futures beyond inherited colonial planning models.",
    description:[
      "This record expands the archive from critique into proposition. It asks what design practice can become when grounded in African social thought, public space, and material histories rather than imported development templates.",
      "Its archive value lies in bringing futures discourse into conversation with decolonial method, spatial justice, and institutional change. The text is especially useful when paired with entries on Sankofa methodology and African philosophy."
    ],
    institution:"Palgrave Macmillan",
    sourceUrl:"https://link.springer.com",
    sourceActionLabel:"Visit publisher",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["African futures","spatial justice","design strategy"],
    archiveIdentifier:"DA-BOOK-004",
    recordIdentifier:"YOA-ADF-2024"
  },
  l005:{
    alternateTitle:"Corpus of Ifa divination verses",
    abstract:"A distributed oral archive of Yoruba cosmology, ethics, memory, and interpretive practice carried across priestly lineages and diasporic routes.",
    description:[
      "The Ifa corpus is treated here as a sophisticated knowledge system rather than as folklore or isolated ritual fragment. Verses, praise poetry, and interpretive protocols form a durable archival structure, even when transmission occurs orally rather than through a fixed manuscript repository.",
      "Because the corpus moves through ceremony, apprenticeship, migration, and translation, this entry also foregrounds questions of access and custodianship. Not all knowledge is meant for unrestricted circulation, and the record therefore emphasises responsible contextualisation over extraction."
    ],
    institution:"Yoruba Babalawo lineages",
    collection:"West African Oral Traditions",
    language:["Yoruba","English"],
    themes:["Oral Traditions","Indigenous Epistemologies"],
    keywords:["divination","oriki","diaspora transmission"],
    notes:["Open summary metadata is appropriate; restricted ritual knowledge should remain within community protocols."],
    archiveIdentifier:"DA-ORAL-005",
    recordIdentifier:"IFA-CORPUS-001"
  },
  l006:{
    abstract:"A documentation record for Benin bronze plaques, heads, and court objects as dispersed evidence of Edo political and artistic sovereignty.",
    description:[
      "This record emphasises two linked histories: the sophistication of Benin court metallurgy and the archival violence of their dispersal after the 1897 British punitive expedition. It therefore functions as both art-historical entry and provenance dossier.",
      "Rather than collapsing the bronzes into museum objecthood alone, the page treats them as evidence of court memory, diplomatic representation, and technical knowledge. The archive value extends to restitution debates, collection trails, and institutional accountability."
    ],
    institution:"Open Restitution Africa",
    sourceUrl:"https://openrestitution.africa",
    sourceActionLabel:"Visit restitution database",
    collection:"African Material Culture",
    material:"Brass and bronze",
    medium:"Cast plaques, heads, and court objects",
    themes:["Repatriation","Material Culture"],
    keywords:["provenance research","museum restitution","court art"],
    externalLinks:[{label:"Open Restitution Africa",url:"https://openrestitution.africa"}],
    notes:["Location data changes as restitution agreements and transfers continue.","Institutional catalogues often describe holdings differently; provenance fields should be read comparatively."],
    archiveIdentifier:"DA-ARTEFACT-006",
    recordIdentifier:"BENIN-DOC-1897"
  },
  l007:{
    abstract:"Architectural record of a major precolonial urban complex whose African authorship was long denied under colonial scholarship.",
    description:[
      "This entry frames Great Zimbabwe as architectural evidence of African urbanism, engineering, and state formation. Its importance in the archive lies not only in the monument itself but also in the history of how colonial interpretation sought to displace African authorship.",
      "The record is therefore both site documentation and historiographic correction. It is relevant for architecture, heritage studies, nation-building, and the politics of archaeological interpretation."
    ],
    institution:"UNESCO World Heritage pathway",
    sourceUrl:"https://whc.unesco.org",
    sourceActionLabel:"Visit heritage source",
    collection:"Architecture Beyond Colonialism",
    material:"Dry-stone masonry",
    medium:"Architectural complex",
    keywords:["heritage politics","dry stone architecture","archaeological interpretation"],
    archiveIdentifier:"DA-ARCH-007",
    recordIdentifier:"GZIM-SITE-001"
  },
  l008:{
    abstract:"Nkrumah's attempt to articulate a postcolonial philosophical basis for African socialism and political reconstruction.",
    description:[
      "This record is important because it treats philosophy as statecraft. Nkrumah asks how inherited religious, cultural, and colonial formations can be metabolised rather than merely denied in the making of a decolonised political order.",
      "Within the archive it is a core reference for readers tracing the relationship between pan-Africanism, socialism, and philosophical decolonisation across the mid-twentieth century."
    ],
    institution:"Open Library discovery pathway",
    sourceUrl:"https://openlibrary.org/search?q=Consciencism",
    sourceActionLabel:"Open discovery page",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["African socialism","postcolonial state","pan-African philosophy"],
    archiveIdentifier:"DA-BOOK-008",
    recordIdentifier:"NKR-CONSC-1964"
  },
  l009:{
    abstract:"Oral testimony record for survivors of the Mau Mau emergency, foregrounding memory against colonial detention archives.",
    description:[
      "This entry positions testimony as archival repair. Where colonial documents often classified, silenced, or distorted detainee experience, survivor accounts restore agency, specificity, and embodied memory to the record.",
      "The page is designed for research continuity: testimony, institutional custody, and rights restrictions are presented together so users can understand both the value and the conditions of access."
    ],
    institution:"Kenya National Archives / Kenya Human Rights Commission",
    sourceUrl:"https://www.kenyaarchives.go.ke",
    sourceActionLabel:"Visit source institution",
    collection:"West African Oral Traditions",
    contributors:["Survivors and families","Oral historians","Archive staff"],
    language:["English","Gikuyu","Swahili"],
    themes:["Reparative History","Oral Traditions"],
    keywords:["detention camps","survivor testimony","state violence"],
    notes:["Access conditions may vary depending on testimony sensitivity and institutional policy."],
    archiveIdentifier:"DA-ORAL-009",
    recordIdentifier:"MAUMAU-TEST-001"
  },
  l010:{
    abstract:"Visual archive of political posters produced within South Africa's anti-apartheid struggle, preserved as evidence of graphic resistance.",
    description:[
      "The record captures posters as both campaign media and public pedagogy. Typography, symbol systems, and reproduction methods were inseparable from movement organising under censorship and surveillance.",
      "In archive terms, the posters matter as distributed, fragile, and often community-held objects. Documentation of provenance, reprint history, and holding institutions remains essential to interpreting them responsibly."
    ],
    institution:"DISA / community archives",
    sourceUrl:"https://disa.ukzn.ac.za",
    sourceActionLabel:"Visit source institution",
    collection:"Liberation Movement Graphics",
    material:"Paper and screen-printed ephemera",
    medium:"Poster archive",
    themes:["Visual Sovereignty","Liberation Movements"],
    keywords:["graphic protest","movement media","print culture"],
    archiveIdentifier:"DA-POSTER-010",
    recordIdentifier:"AAP-POST-001"
  },
  l011:{
    abstract:"A major manuscript archive documenting West African scholarship in science, law, philosophy, medicine, and theology.",
    description:[
      "This record rejects the colonial fiction of an intellectually undocumented precolonial Africa by foregrounding a dense manuscript tradition rooted in Timbuktu and the wider Sahel. The manuscripts testify to scholarly production, circulation, and preservation across centuries.",
      "The archive entry also acknowledges vulnerability: conflict, climate, dispersal, and rescue efforts shape how these manuscripts are now described, digitised, and accessed."
    ],
    institution:"Ahmed Baba Institute",
    sourceUrl:"https://www.ahmed-baba.ml",
    sourceActionLabel:"Visit source institution",
    collection:"Manuscripts & Precolonial Texts",
    language:["Arabic","Ajami","French","English"],
    medium:"Manuscript archive",
    themes:["Precolonial Knowledge","Language & Script"],
    keywords:["Ajami","Islamic scholarship","Sahel archives"],
    notes:["Descriptions often represent collection-level rather than item-level detail.","Digitisation status varies across holding institutions and rescue projects."],
    archiveIdentifier:"DA-MANUSCRIPT-011",
    recordIdentifier:"TIMB-MSS-001"
  },
  l012:{
    abstract:"Record of Ndebele wall painting as women's visual knowledge practice, social sign system, and resistant design tradition.",
    description:[
      "This entry reads painted domestic surfaces as archive. Pattern systems communicate affiliation, ceremony, labour, and continuity, while also documenting the adaptive visual strategies developed under apartheid pressure.",
      "The record therefore bridges design, anthropology, gendered knowledge, and architecture. It is particularly valuable for users tracing the relationship between everyday making and political endurance."
    ],
    institution:"Community custodianship",
    collection:"African Material Culture",
    material:"Pigment on plastered domestic surfaces",
    medium:"Wall painting",
    themes:["Visual Sovereignty","Design & Making"],
    keywords:["women's knowledge","domestic surfaces","pattern language"],
    archiveIdentifier:"DA-IMAGE-012",
    recordIdentifier:"NDEBELE-WALL-001"
  },
  l013:{
    abstract:"A selected record of Cabral's speeches on culture, liberation, and the ethical demands of anti-colonial struggle.",
    description:[
      "Cabral's speeches occupy a central place in the archive because they insist that culture is neither decorative nor secondary to politics. Instead, culture becomes a practical terrain through which domination and liberation are both organised.",
      "This entry is especially useful alongside Fanon, Nkrumah, and Biko records, where different but overlapping accounts of liberation consciousness can be traced."
    ],
    institution:"Open Library discovery pathway",
    sourceUrl:"https://openlibrary.org/search?q=Return%20to%20the%20Source%20Amilcar%20Cabral",
    sourceActionLabel:"Open discovery page",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["national culture","PAIGC","revolutionary theory"],
    archiveIdentifier:"DA-DOCUMENT-013",
    recordIdentifier:"CABRAL-RTTS-1973"
  },
  l014:{
    abstract:"A synthetic archive entry for Ubuntu as ethical and social philosophy across multiple African contexts.",
    description:[
      "Ubuntu is presented here as a conceptual archive rather than a single authored text. The record gathers a living vocabulary of relation, reciprocity, and personhood that circulates through oral tradition, philosophy, public discourse, and jurisprudence.",
      "Because Ubuntu is frequently flattened into slogan form, the entry keeps emphasis on its depth, plurality, and community-grounded interpretation."
    ],
    institution:"Living tradition / secondary scholarship",
    collection:"Decolonial Theory Canon",
    language:["Zulu","Xhosa","Shona","English"],
    themes:["African Philosophy","Communal Ethics"],
    keywords:["personhood","reciprocity","communal ethics"],
    notes:["Terminology and emphasis vary across language communities and scholarly traditions."],
    archiveIdentifier:"DA-THEORY-014",
    recordIdentifier:"UBUNTU-CONCEPT-001"
  },
  l015:{
    abstract:"Architectural and urban heritage record for Lamu Old Town as a Swahili coastal knowledge environment.",
    description:[
      "Lamu is documented here as more than preserved built fabric. The entry highlights the town as a living archive of Indian Ocean trade, Islamic learning, craft labour, and Swahili urban form.",
      "Its archive significance lies in the continuity of spatial practice: streets, courtyards, carved timber, coral rag construction, and domestic arrangements all speak to a historically deep urban tradition beyond colonial planning frames."
    ],
    institution:"UNESCO World Heritage pathway",
    sourceUrl:"https://whc.unesco.org",
    sourceActionLabel:"Visit heritage source",
    collection:"Architecture Beyond Colonialism",
    material:"Coral stone, mangrove timber, lime plaster",
    medium:"Urban architectural fabric",
    keywords:["Swahili coast","Indian Ocean trade","urban heritage"],
    archiveIdentifier:"DA-ARCH-015",
    recordIdentifier:"LAMU-OLDTOWN-001"
  },
  l016:{
    abstract:"A methodological record for Sankofa as a way of returning to historical knowledge in order to design forward differently.",
    description:[
      "This entry treats Sankofa not as a slogan but as a disciplined method for historical retrieval. It is especially relevant to archive work because it frames return, recovery, and critical reuse as creative acts rather than nostalgic ones.",
      "The record is intended to support curriculum design, archival interpretation, and practice-led research grounded in African philosophical resources."
    ],
    institution:"Independent archive research",
    sourceUrl:"https://www.rmit.edu.au",
    sourceActionLabel:"Visit institution",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["historical retrieval","design method","pedagogy"],
    archiveIdentifier:"DA-THEORY-016",
    recordIdentifier:"SANKOFA-METHOD-001"
  },
  l017:{
    abstract:"A comparative reading that stages Fanon, Cabral, and Nkrumah as a shared liberation conversation rather than isolated traditions.",
    description:[
      "This journal record is useful because it draws different strands of anti-colonial philosophy into deliberate contact. Rather than reading these thinkers as separate national canons, it traces a common concern with culture, consciousness, and political transformation.",
      "The entry is especially valuable for teaching and research because it helps users move laterally across the archive, connecting theory records through argument rather than chronology alone."
    ],
    institution:"African Identities",
    sourceUrl:"https://www.tandfonline.com",
    sourceActionLabel:"Visit journal publisher",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["comparative philosophy","liberation discourse","African intellectual history"],
    archiveIdentifier:"DA-ARTICLE-017",
    recordIdentifier:"YOA-DOL-2025"
  },
  l018:{
    abstract:"Institutional record for Ghana's central public archive, documenting its role in preserving both colonial and postcolonial state documentation.",
    description:[
      "This page is intentionally infrastructural. It describes PRAAD not as a single collection item but as a key archival institution through which legal, administrative, and territorial memory is organised in Ghana.",
      "Including institutional records allows users to move from individual documents to the custody systems that shape access, description, and provenance."
    ],
    institution:"Public Records and Archives Administration Department",
    institutionUrl:"https://praad.gov.gh",
    sourceUrl:"https://praad.gov.gh",
    sourceActionLabel:"Visit source institution",
    collection:"Manuscripts & Precolonial Texts",
    language:["English"],
    keywords:["state archives","Gold Coast records","public memory"],
    notes:["Collection access policies may differ between reading-room use, digitised material, and restricted records."],
    archiveIdentifier:"DA-INSTITUTION-018",
    recordIdentifier:"PRAAD-ACCRA-001"
  },
  l019:{
    abstract:"Akan visual symbol system encoding proverb, ethics, and historical memory through repeatable graphic marks.",
    description:[
      "Adinkra is treated here as a visual philosophy rather than decorative motif bank. Symbols operate as compact carriers of historical reference, moral instruction, and social relation across cloth, architecture, print, and everyday making.",
      "The record is particularly useful for users interested in how visual systems preserve knowledge across media and across generations."
    ],
    institution:"Akan artisan communities",
    collection:"African Material Culture",
    material:"Stamped cloth, pottery, architecture, metalwork",
    medium:"Symbol system",
    themes:["Visual Sovereignty","African Philosophy"],
    keywords:["proverb system","graphic language","Akan knowledge"],
    archiveIdentifier:"DA-VISUAL-019",
    recordIdentifier:"ADINKRA-SYMBOL-001"
  },
  l020:{
    abstract:"Collected writings of Steve Biko, central to Black Consciousness and to theories of psychological decolonisation in South Africa.",
    description:[
      "This record matters because Biko locates liberation in the remaking of self-perception, not only in formal political transition. The book remains a key point of entry into Black Consciousness thought and its wider resonance for decolonial praxis.",
      "It is frequently used alongside Fanon and anti-apartheid movement records, especially when tracing the relationship between writing, student organising, and collective political identity."
    ],
    institution:"Open Library discovery pathway",
    sourceUrl:"https://openlibrary.org/search?q=I%20Write%20What%20I%20Like",
    sourceActionLabel:"Open discovery page",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["psychological liberation","South African thought","student politics"],
    archiveIdentifier:"DA-BOOK-020",
    recordIdentifier:"BIKO-IWWIL-1978"
  }
};

const WORKING_LIBRARY_FILES = [
  "A Companion to African Philosophy - Kwasi Wiredu.pdf",
  "A Companion to Modern African Art - Gitti Salami.pdf",
  "A Companion to Philosophy of Religion - Charles Taliaferro & Paul Draper & Philip L. Quinn.pdf",
  "A Dance of Masks_ Senghor, Achebe, Soyinka - Jonathan Peters.pdf",
  "A Dying Colonialism - Frantz Fanon.pdf",
  "A Kì Í_ Yorùbá Proscriptive and Prescriptive Proverbs - Oyekan Owomoyela.pdf",
  "A Political Economy of Africa - Claude Ake.pdf",
  "A Primal Perspective on the Philosophy of Religion - Arvind Sharma.pdf",
  "A Roadmap for Understanding African Politics - Victor Oguejiofor Okafor.pdf",
  "A Short History of African Philosophy - Barry Hallen.pdf",
  "A Short History of African Philosophy, Second Edition - Barry Hallen.pdf",
  "A Study of Xenophobia in South and Africa and Nigeria - Unknown.pdf",
  "A Theory of Political Integration - Claude Ake.pdf",
  "Achieving Our Humanity_ The Idea of the Postracial Future - Emmanuel Chukwudi Eze.pdf",
  "Africa and the Fourth Industrial Revolution_ Curse or Cure_ - Everisto Benyera.pdf",
  "Africa, Human Rights, and the Global System_ The Political Econg World - Eileen Mccarthy-Arnolds & David Penna & Joy Sobrepena.pdf",
  "African American Female Mysticism_ Nineteenth-Century Religious Activism - Joy R. Bostic.pdf",
  "African Anarchism - Sam Mbah & I. E. Igariwey.epub",
  "African Biblical Studies_ Unmasking Embedded Racism and Colonialism in Biblical Studies - Andrew M. Mbuvi.pdf",
  "African Cinema_ Postcolonial and Feminist Readings - Kenneth W. Harrow.pdf",
  "African Communication Systems and the Digital Age - Eno Ime Akpabio.epub",
  "African Cosmology of the Bântu-Kôngo_ Tying the Spiritual KnotPrinciples of Life & Living - Kimbwandende Kia Bunseki Fu-Kiau.pdf",
  "African Culture and Global Politics_ Language, Philosophies, anre in Africa and the Diaspora - Toyin Falola & Danielle Sanchez.pdf",
  "African Culture and the Christian Church_ An Introduction to Social and Pastoral Anthropology - Aylward Shorter.pdf",
  "African Diaspora_ A Musical Perspective - Ingrid Monson.pdf",
  "African Education and Identity_ Proceedings of the 5th Session ernational Congress of Africanists (5th_ 1985_ Ibadan, Nigeria).pdf",
  "African Epistemology_ Essays on Being and Knowledge - Peter Aloysius Ikhane.pdf",
  "African Ethics and Death_ Moral Status and Human Dignity in Ubuntu Thinking - Motsamai Molefe & Elphus Muade.pdf",
  "African Feminism_ The Politics of Survival in Sub-Saharan Africa - Gwendolyn Mikell.pdf",
  "African Gender Studies_ A Reader - Oyèrónké Oyěwùmí.pdf",
  "African Gods_ Contemporary Rituals and Beliefs - Daniel Laine.pdf",
  "African Identities_ Race, Nation and Culture in Ethnography, Pan-Africanism and Black Literatures - Kadiatu Kanneh.pdf",
  "African Intellectuals_ Rethinking Politics, Language, Gender and Development - Thandika Mkandawire.pdf",
  "African Literature as Political Philosophy - Mary Stella Chika Okolo.pdf",
  "African Literature, Animism and Politics - Caroline Rooney.pdf",
  "African Music - Francis Bebey.epub",
  "African Music_ A People_s Art - Francis Bebey.pdf",
  "African Musical Aesthetics - John Murungi.pdf",
  "African Pasts, Presents, and Futures_ Generational Shifts in Afen_s Literature, Film, and Internet Discourse - Touria Khannous.pdf",
  "African Perspectives on Colonialism - A. Adu Boahen.pdf",
  "African Philosophy Essential Read - Tsenay Serequeberhan.pdf",
  "African Philosophy and Thought Systems_ A Search for a Culture  Philosophy of Belonging - Munyaradzi Mawere & Tapuwa R. Mubaya.pdf",
  "African Philosophy and the Epistemic Marginalization of Women - Jonathan O. Chimakonam & Louise du Toit.pdf",
  "African Philosophy in Search of Identity - D. A. Masolo.pdf",
  "African Philosophy_ A Classical Approach - Parker English.pdf",
  "African Philosophy_ A Historico-Hermeneutical Investigation of the Conditions of Its Possibility - Theophilus Okere.pdf",
  "African Philosophy_ Emancipation and Practice - Pascah Mungwini.pdf",
  "African Philosophy_ Myth and Reality - Paulin J. Hountondji.pdf",
  "African philosophies - Séverine Kodjo-Grandvaux.epub",
  "African philosophy _ an anthology - Emmanuel Chukwudi Eze.pdf",
  "Copy_A Companion to African Philosophy - Kwasi Wiredu copy.pdf",
  "The Wretched Of The Earth (1).pdf"
];

const COUNTRY_TERRITORIES = [
  "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Republic","Chad","Comoros","Democratic Republic of the Congo","Republic of the Congo","Cote d'Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","Sao Tome and Principe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe",
  "Martinique","Guadeloupe","Haiti","Jamaica","Trinidad and Tobago","Barbados","Cuba","Dominican Republic","Puerto Rico","Bahamas","Belize","Brazil","Colombia","Suriname","Guyana","French Guiana","Venezuela","Panama","United States","Canada","United Kingdom","France","Portugal","Spain","Netherlands","Belgium","Germany","Italy","Denmark","Sweden","Norway","Ireland","Curacao","Aruba","Reunion","Mayotte","Canary Islands","Madeira","Azores","Zanzibar","Gold Coast","Rhodesia","Sahel","Horn of Africa","Indian Ocean","Atlantic World"
];

const LANGUAGE_INDEX = [
  "Akan","Amazigh","Amharic","Arabic","Bambara","Bemba","Berber languages","Chewa","Creole","Dinka","Duala","Dutch","English","Ewe","Fang","Fante","Fon","French","Fulfulde","Ga","Ge'ez","German","Gikuyu","Haitian Creole","Hausa","Herero","Igbo","isiNdebele","isiXhosa","isiZulu","Italian","Kabyle","Kikongo","Kinyarwanda","Kirundi","Kiswahili","Lingala","Luo","Luganda","Malagasy","Mandarin","Mandinka","Mende","Mossi","Ndebele","Neapolitan Arabic","Nguni languages","Nigerian Pidgin","Oromo","Pidgin English","Portuguese","Pulaar","Sango","Sesotho","Setswana","Shona","Somali","Spanish","Swati","Tamasheq","Tigrinya","Tshivenda","Twi","Wolof","Xhosa","Yoruba","Zulu","Ajami","Arabic script traditions","Creole French","Multilingual metadata"
];

const FEATURED_THEME_TERMS = ["African Philosophy","Decolonial Theory","Visual Sovereignty","Archival Recovery","Pan-Africanism","Sankofa","Ubuntu","Restitution","Political Thought","Sonic Archives","Language Politics","Indigenous Futurisms","Ritual Aesthetics","Design Pedagogy","Precolonial Urbanism","Reparative History","Gender Studies","Museum Critique"];

const FEATURED_COLLECTION_TITLES = [
  "West African Oral Traditions",
  "Decolonial Theory Canon",
  "African Material Culture",
  "Liberation Movement Graphics",
  "Manuscripts & Precolonial Texts",
  "Architecture Beyond Colonialism",
  "African Philosophy Working Library",
  "West Africa: Political Thought"
];

const FEATURED_QUERY_SUGGESTIONS = [
  "African philosophy",
  "critical consciousness",
  "Paulo Freire",
  "pedagogy of the oppressed",
  "Kwasi Wiredu",
  "Paulin Hountondji",
  "Claude Ake",
  "African epistemology",
  "Ubuntu ethics",
  "Pan-Africanism",
  "Ritual aesthetics",
  "Political graphics",
  "Museum restitution",
  "Sonic archives",
  "Indigenous futurisms"
];

const EXPANDED_THEME_GROUPS = {
  archive_practice:["community archiving","metadata repair","provenance tracing","custodial ethics","finding aid recovery","record restitution","repair logics","annotation politics","declassification","archival silences","counter-archiving","memory infrastructures","cataloguing justice","record migration"],
  design_pedagogy:["design justice","speculative repair","community-led making","graphic sovereignty","vernacular interfaces","embodied pedagogy","knowledge co-production","critical making","design historiography","studio reform","curriculum transformation","poster pedagogy","public design histories","pedagogies of repair"],
  philosophy:["African metaphysics","African ethics","African aesthetics","African humanism","communal personhood","epistemic plurality","decolonial phenomenology","postcolonial reason","philosophical translation","conceptual decolonisation","ontology and relation","indigenous logic","liberation philosophy","ethics of relation"],
  politics:["independence movements","socialist imaginaries","anti-imperial solidarity","radical federalism","state violence","border regimes","popular sovereignty","revolutionary education","movement strategy","decolonial governance","constitutional memory","anti-authoritarian practice","public dissent","grassroots political education"],
  material:["beadwork","ceramics","metalwork","print cultures","poster histories","carved forms","domestic objects","dress and adornment","craft lineages","makers archives","sacred objects","everyday infrastructures","textile repertoires","material memory"],
  architecture:["sacred architecture","coastal urbanism","courtyard systems","earth construction","stone settlements","climate-responsive building","settlement memory","housing resistance","land and territory","water infrastructures","vernacular planning","sacred landscapes","dwelling systems","infrastructural repair"],
  gender_care:["queer archives","care infrastructures","reproductive justice","women's knowledge systems","kinship politics","disability and care","intimate publics","embodied resistance","intergenerational care","healing justice","domestic labour histories","matrilineal memory","care pedagogies","feminist knowledge practice"],
  language:["multilingual archives","translation justice","Ajami traditions","Arabic script","Ge'ez manuscripts","oral transcription","naming systems","lexical sovereignty","language revival","transliteration","code-switching metadata","colonial lexicons","language families","script politics"],
  spirituality:["divination systems","ancestral memory","liturgy and resistance","shrine archives","sacred sound","pilgrimage routes","healing traditions","church histories","Islamic scholarship","indigenous religion","ceremonial design","ritual performance","sacred geographies","cosmological knowledge"],
  ecology:["more-than-human knowledge","river archives","seed sovereignty","forest memory","environmental justice","ecological repair","pastoral knowledge","agrarian histories","extractive modernity","mineral frontiers","oceanic worlds","climate adaptation","land stewardship","watershed memory"],
  media:["radio histories","film cultures","photography","broadcasting publics","community media","cassette circulations","print networks","newspapers","documentary practice","visual essays","digital humanities","interface criticism","media archaeology","sound circulation"],
  diaspora:["black Atlantic","Indian Ocean worlds","Afro-Caribbean thought","Afro-Latin archives","migration memory","return imaginaries","maroon histories","diaspora publishing","abolitionist lineages","transnational solidarities","oceanic routes","exile archives","creole worlds","diaspora pedagogy"],
  education:["school archives","university reform","student movements","public scholarship","textbook critique","teacher training","knowledge commons","community classrooms","workshop cultures","apprenticeship","literacy politics","radical libraries","study circles","learning infrastructures","critical consciousness","paulo freire","liberation pedagogy","pedagogy of the oppressed"],
  restitution:["collection violence","looting records","return negotiations","museum metadata","exhibition politics","display ethics","ethnographic collections","object biographies","holding institutions","restitution law","deaccession practices","repatriation ethics","collection custody","museum accountability"],
  economy_labour:["labour histories","cooperative economies","platform cooperativism","market women networks","labour migration","industrialisation","economic sovereignty","debt and development","trade routes","informal infrastructures","union cultures","resource extraction","value chains","commons governance"],
  identity:["self-representation","portraiture","racial formation","national culture","memory politics","public monuments","iconography","cultural citizenship","representational justice","visual self-fashioning","identity repair","nation and narration","symbolic power","diasporic self-fashioning"],
  health_body:["public health archives","medical anthropology","disability histories","healing ecologies","body politics","epidemic memory","psychiatric archives","reproductive health","embodiment","biopolitics","care work","therapeutic knowledge","hospital records","anatomy and colonialism"],
  futures:["emancipatory infrastructures","speculative governance","repair futures","post-extractivist transition","future archives","technology critique","platform sovereignty","infrastructural imagination","worldmaking","postcolonial space","collective dreaming","decolonial futures","indigenous futurisms","future literacy"],
  black_studies:["black studies","black feminist thought","black internationalism","racial capitalism","diasporic solidarity","abolitionist futures","black publics","black political imagination","black radical tradition","black print culture","diasporic aesthetics","transatlantic critique","self-determination","liberation media"]
};

THEMES.push(...uniqueValues(Object.values(EXPANDED_THEME_GROUPS).flat()));

const COLLECTION_REGION_SETS = ["West Africa","East Africa","Central Africa","Southern Africa","North Africa","Sahel","Horn of Africa","Indian Ocean","Diaspora","Atlantic World","Caribbean","Global South"];
const COLLECTION_TRACKS = [
  {title:"Oral Traditions",icon:"◎",desc:"Oral testimony, praise poetry, performance memory, and spoken knowledge systems across {region}.",terms:["oral traditions","testimony","praise poetry","memory"]},
  {title:"Political Thought",icon:"◈",desc:"Political philosophy, liberation theory, state critique, and movement strategy connected to {region}.",terms:["political thought","liberation","philosophy","state critique"]},
  {title:"Material Culture",icon:"▣",desc:"Textiles, objects, craft lineages, and material archives associated with {region}.",terms:["material culture","craft","objects","textiles"]},
  {title:"Liberation Graphics",icon:"▤",desc:"Posters, newspapers, pamphlets, and graphic publics shaped through {region}.",terms:["posters","graphics","newspapers","pamphlets"]},
  {title:"Architecture & Settlement",icon:"▧",desc:"Architectural knowledge, settlement memory, and spatial practices rooted in {region}.",terms:["architecture","urbanism","settlement","spatial"]},
  {title:"Manuscripts & Textual Worlds",icon:"▦",desc:"Books, manuscripts, script traditions, and textual histories linked to {region}.",terms:["manuscripts","books","script","textual"]},
  {title:"Music & Sonic Archives",icon:"◉",desc:"Radio, music, listening practices, and sonic memory recorded across {region}.",terms:["music","sonic archives","radio","listening"]},
  {title:"Pedagogy & Institutions",icon:"◇",desc:"Schools, universities, study circles, and knowledge institutions in {region}.",terms:["education","institutions","pedagogy","libraries"]},
  {title:"Restitution & Museum Histories",icon:"▨",desc:"Museum holdings, provenance disputes, and restitution pathways tied to {region}.",terms:["restitution","museum critique","provenance","collections"]},
  {title:"Language, Translation & Script",icon:"◬",desc:"Language politics, multilingual metadata, and script traditions circulating through {region}.",terms:["language politics","translation","script","multilingual"]}
];

function buildExpandedCollections() {
  return COLLECTION_REGION_SETS.flatMap((region, regionIndex) =>
    COLLECTION_TRACKS.map((track, trackIndex) => ({
      id:`cx${String(regionIndex + 1).padStart(2,"0")}${String(trackIndex + 1).padStart(2,"0")}`,
      title:`${region}: ${track.title}`,
      icon:track.icon,
      count:0,
      region,
      desc:track.desc.replace("{region}", region),
      searchTerms:[region, track.title, ...(track.terms || [])],
      featured:false
    }))
  );
}

COLLECTIONS.push(...buildExpandedCollections());

const EXTRA_SEARCH_READY_SOURCES = [
  {id:"s046",name:"CORE",region:"Global",type:"Search-Ready",access:"search",desc:"Aggregator of open access research papers and repository content across the world.",url:"https://core.ac.uk",searchTemplate:"https://core.ac.uk/search?q="},
  {id:"s047",name:"OAPEN",region:"Global",type:"Search-Ready",access:"search",desc:"Open access books platform with strong humanities and social science coverage.",url:"https://www.oapen.org",searchTemplate:"https://www.oapen.org/search?identifier="},
  {id:"s048",name:"DOAB",region:"Global",type:"Search-Ready",access:"search",desc:"Directory of Open Access Books for monographs, edited volumes, and scholarly books.",url:"https://www.doabooks.org",searchTemplate:"https://www.doabooks.org/en/search?query="},
  {id:"s049",name:"OpenAIRE Explore",region:"Global",type:"Search-Ready",access:"search",desc:"Pan-European open research discovery layer connecting papers, datasets, and projects.",url:"https://explore.openaire.eu",searchTemplate:"https://explore.openaire.eu/search/find?keyword="},
  {id:"s050",name:"Zenodo",region:"Global",type:"Search-Ready",access:"search",desc:"Open repository for papers, datasets, images, and cultural documentation.",url:"https://zenodo.org",searchTemplate:"https://zenodo.org/search?page=1&size=20&q="},
  {id:"s051",name:"arXiv",region:"Global",type:"Search-Ready",access:"search",desc:"Preprint repository useful for adjacent technical, media, and computational scholarship.",url:"https://arxiv.org",searchTemplate:"https://arxiv.org/search/?query="},
  {id:"s052",name:"SSRN",region:"Global",type:"Search-Ready",access:"search",desc:"Scholarly working papers and social science research discovery layer.",url:"https://www.ssrn.com",searchTemplate:"https://papers.ssrn.com/sol3/results.cfm?RequestTimeout=50000000&txtKey_Words="},
  {id:"s053",name:"PhilPapers",region:"Global",type:"Search-Ready",access:"search",desc:"Major philosophy index useful for African philosophy and related debates.",url:"https://philpapers.org",searchTemplate:"https://philpapers.org/s/"},
  {id:"s054",name:"PhilArchive",region:"Global",type:"Search-Ready",access:"search",desc:"Open archive for philosophy papers including decolonial and African thought.",url:"https://philarchive.org",searchTemplate:"https://philarchive.org/search?new=1&sqc=&q="},
  {id:"s055",name:"Trove",region:"Australia / Global",type:"Search-Ready",access:"search",desc:"Books, newspapers, images, and archives discovery platform with strong diaspora holdings.",url:"https://trove.nla.gov.au",searchTemplate:"https://trove.nla.gov.au/search?keyword="},
  {id:"s056",name:"Biodiversity Heritage Library",region:"Global",type:"Search-Ready",access:"search",desc:"Historical books and illustrations relevant to botanical and ecological knowledge systems.",url:"https://www.biodiversitylibrary.org",searchTemplate:"https://www.biodiversitylibrary.org/search?searchTerm="},
  {id:"s057",name:"Getty Research Portal",region:"Global",type:"Search-Ready",access:"search",desc:"Digitised art history books and visual culture publications.",url:"https://portal.getty.edu",searchTemplate:"https://portal.getty.edu/search?q="},
  {id:"s058",name:"UNESCO Digital Library",region:"Global",type:"Search-Ready",access:"search",desc:"Institutional reports, heritage documents, and policy materials.",url:"https://unesdoc.unesco.org",searchTemplate:"https://unesdoc.unesco.org/search/"},
  {id:"s059",name:"OpenEdition",region:"Global",type:"Search-Ready",access:"search",desc:"Books and journals in the humanities and social sciences, including African studies.",url:"https://www.openedition.org",searchTemplate:"https://search.openedition.org/?q="},
  {id:"s060",name:"HAL",region:"Global / Francophone",type:"Search-Ready",access:"search",desc:"Open archive for scholarly documents with strong Francophone coverage.",url:"https://hal.science",searchTemplate:"https://hal.science/search/index/?q="},
  {id:"s061",name:"ERIC",region:"Global",type:"Search-Ready",access:"search",desc:"Education research database useful for pedagogy and curriculum histories.",url:"https://eric.ed.gov",searchTemplate:"https://eric.ed.gov/?q="},
  {id:"s062",name:"UK National Archives Discovery",region:"United Kingdom / Global",type:"Search-Ready",access:"search",desc:"Colonial, diplomatic, and administrative records discovery platform.",url:"https://discovery.nationalarchives.gov.uk",searchTemplate:"https://discovery.nationalarchives.gov.uk/results/r?_q="},
  {id:"s063",name:"Calisphere",region:"Americas",type:"Search-Ready",access:"search",desc:"California-focused digital collections with diaspora and visual culture relevance.",url:"https://calisphere.org",searchTemplate:"https://calisphere.org/search/?q="},
  {id:"s064",name:"DigitalNZ",region:"Aotearoa / Pacific",type:"Search-Ready",access:"search",desc:"Digital collections aggregator with Indigenous and comparative colonial holdings.",url:"https://digitalnz.org",searchTemplate:"https://digitalnz.org/records?text="},
  {id:"s065",name:"Figshare",region:"Global",type:"Search-Ready",access:"search",desc:"Open repository for datasets, images, and supplementary research material.",url:"https://figshare.com",searchTemplate:"https://figshare.com/search?search="}
,

  {id:"s090",name:"British Museum Collection Online",region:"Global / Africa",type:"Search-Ready",access:"search",desc:"Searchable collection records including African objects, diaspora materials, and restitution-relevant holdings.",url:"https://www.britishmuseum.org/collection",searchTemplate:"https://www.britishmuseum.org/collection/search?keyword="},
  {id:"s091",name:"Unilever Archives",region:"Global / Africa",type:"Search-Ready",access:"search",desc:"Corporate archive with records, photographs, publicity, and historical documentation including African collections and UAC materials.",url:"https://archives-unilever.com",searchTemplate:"https://archives-unilever.com/discover/search?q="},
  {id:"s092",name:"United Africa Company Archive Pathway",region:"West Africa / Global",type:"Search-Ready",access:"search",desc:"Query-based pathway into United Africa Company and related records held in Unilever Archives and partner catalogues.",url:"https://archives-unilever.com/discover/resources/uac-united-africa-company/page/1/view_as/grid",searchTemplate:"https://archives-unilever.com/discover/search?q="},
  {id:"s093",name:"UK National Archives Discovery — UAC",region:"West Africa / UK",type:"Search-Ready",access:"search",desc:"Discovery pathway for United Africa Company records and related colonial commercial documentation.",url:"https://discovery.nationalarchives.gov.uk",searchTemplate:"https://discovery.nationalarchives.gov.uk/results/r?_q="}

,

  {id:"s094",name:"British Library",region:"Global / Africa / Asia",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"Searchable library holdings, manuscripts, maps, newspapers, sound, and archives with major colonial and African collections.",url:"https://www.bl.uk",searchTemplate:"https://explore.bl.uk/primo_library/libweb/action/search.do?fn=search&ct=search&vl(freeText0)="},
  {id:"s095",name:"Trove",region:"Australia / Global",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"National Library of Australia discovery platform for books, images, newspapers, archives, and digitised records.",url:"https://trove.nla.gov.au",searchTemplate:"https://trove.nla.gov.au/search?keyword="},
  {id:"s096",name:"Smithsonian Open Access / Collections Search",region:"Global / Africa / Diaspora",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"Searchable Smithsonian collections including art, history, science, photographs, and objects.",url:"https://www.si.edu",searchTemplate:"https://www.si.edu/search?edan_q="},
  {id:"s097",name:"Google Books",region:"Global",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"Searchable global book metadata and previews where available.",url:"https://books.google.com",searchTemplate:"https://books.google.com/books?q="},
  {id:"s098",name:"WorldCat",region:"Global",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"Global library union catalogue for books, theses, audiovisual works, and archival materials.",url:"https://search.worldcat.org",searchTemplate:"https://search.worldcat.org/search?q="},
  {id:"s099",name:"National Library of South Africa",region:"Southern Africa",type:"African-Priority",access:"search",theme:"Decolonising Knowledges",desc:"National documentary heritage, books, manuscripts, and special collections of South Africa.",url:"https://www.nlsa.ac.za",searchTemplate:"https://www.nlsa.ac.za/search/node/"},
  {id:"s100",name:"University of Fort Hare / ANC Archives",region:"Southern Africa",type:"African-Priority",access:"search",theme:"Decolonising Knowledges",desc:"Liberation struggle records and ANC-related archival holdings.",url:"https://www.ufh.ac.za",searchTemplate:"https://www.ufh.ac.za/search/node/"},
  {id:"s101",name:"National Archives of Nigeria Pathway",region:"West Africa",type:"African-Priority",access:"search",theme:"Decolonising Knowledges",desc:"Search pathway for Nigerian national archival records and related documentary holdings.",url:"https://nationalarchives.gov.ng",searchTemplate:"https://www.google.com/search?q=site%3Anationalarchives.gov.ng+"},
  {id:"s102",name:"National Archives of Zimbabwe Pathway",region:"Southern Africa",type:"African-Priority",access:"search",theme:"Decolonising Knowledges",desc:"Search pathway for Zimbabwean archival and documentary heritage records.",url:"https://www.archives.gov.zw",searchTemplate:"https://www.google.com/search?q=site%3Aarchives.gov.zw+"},
  {id:"s103",name:"Uganda National Archives Pathway",region:"East Africa",type:"African-Priority",access:"search",theme:"Decolonising Knowledges",desc:"Search pathway into Ugandan archival and documentary collections.",url:"https://www.nationalarchives.go.ug",searchTemplate:"https://www.google.com/search?q=site%3Anationalarchives.go.ug+"},
  {id:"s104",name:"Bodleian / Rhodes House African Studies Pathway",region:"Africa / UK",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"African studies archives, manuscripts, photographs, and colonial records held in Oxford collections.",url:"https://www.bodleian.ox.ac.uk",searchTemplate:"https://solo.bodleian.ox.ac.uk/discovery/search?query=any,contains,"}

];

const INTERNAL_ARCHITECTURE_PATHWAYS = [
  ["Local archive index","Static-hosted core search index for records bundled directly with the archive."],
  ["Internal enriched records","Record layer with expanded summaries, provenance, citations, and related-record linking."],
  ["Working-library filename import","Local shelf import used to widen book and philosophy discovery in a static environment."],
  ["Static metadata normalisation layer","Normalises heterogeneous fields into a consistent record model."],
  ["Rights and provenance enrichment","Adds rights, custodianship, and provenance context where available."],
  ["Related search expansion engine","Generates adjacent discovery routes from knowledge areas, places, languages, and source pathways."],
  ["Variant spelling resolver","Supports alternate spellings, transliteration differences, and naming variations."],
  ["Multilingual alias layer","Maps language, community, and regional variants into shared discovery pathways."],
  ["Collection pathway builder","Constructs editorial browse routes from regional, thematic, and format taxonomies."],
  ["Knowledge area registry","Maintains the expanded intellectual taxonomy that drives discovery and browse."],
  ["Historical geography mapper","Links current countries, territories, and historical geographies in search logic."],
  ["Language family registry","Supports language-aware discovery across multilingual metadata and script traditions."],
  ["Institution lookup cache","Stores source institution descriptors for outbound routing and context."],
  ["Citation enrichment layer","Builds portable citation text for local and imported records."],
  ["Related-record graph","Connects records by knowledge area, tag, concept, region, and collection."],
  ["Media fallback layer","Ensures missing images or media do not break the detail layout."],
  ["Static search index builder","Bundles search-friendly metadata directly into the shipped HTML."],
  ["Zero-result recovery layer","Uses related searches and source handoffs to recover from dead-end queries."],
  ["Source handoff router","Sends users to external institutions without blocking the local archive flow."],
  ["Manual curation pathway","Editorial intake route for hand-built records and curated summaries."],
  ["Archive quality review","Internal pathway for checking metadata consistency, duplication, and gaps."],
  ["Record link resolver","Coordinates internal record detail links and outbound source links."],
  ["Query expansion dictionary","Expands core archive terms into nearby intellectual and regional vocabularies."],
  ["Collection coverage estimator","Derives collection scale from record, theme, and source overlap."],
  ["Taxonomy maintenance pathway","Keeps knowledge areas, collections, countries, and languages aligned as the archive grows."]
].map((item, index) => ({
  id:`si${String(index + 1).padStart(3,"0")}`,
  name:item[0],
  region:"Internal architecture",
  type:"Internal Architecture",
  access:"internal",
  desc:item[1],
  url:""
}));

const PARTNER_SOURCE_PATHWAYS = [
  ["Community submission intake","Pathway for community-contributed metadata, contextual notes, and archival references."],
  ["Oral history deposit route","Partner route for testimony projects, interview collections, and listening archives."],
  ["Museum restitution dossier intake","Pathway for provenance files, restitution notes, and collection correspondence."],
  ["Archive classroom submissions","Route for teaching collections, student research clusters, and learning archives."],
  ["Regional repository partnership","Partner pathway for institution-to-institution metadata exchange."],
  ["Rights-limited reference layer","Stores references to sources that can be cited but not openly redistributed."],
  ["Private catalogue crosswalk","Partner route for matching local records with closed institutional catalogues."],
  ["Community review channel","Review path for custodial feedback on names, contexts, and restrictions."],
  ["Image reference registry","Partner pathway for image-led records where copies cannot be hosted locally."],
  ["Manuscript rescue network","Route for endangered manuscript documentation and custody tracing."],
  ["Broadcast archive partnership","Partner layer for radio, cassette, and television history material."],
  ["Liberation movement archive route","Connection path for movement documents held by NGOs and community archives."],
  ["Heritage inventory exchange","Partner route for site records, monument files, and heritage registers."],
  ["Diaspora memory network","Pathway linking diaspora archives, family history collections, and community projects."],
  ["Scholarly bibliography intake","Route for curated reference lists and citation clusters."],
  ["Exhibition dossier pathway","Partner route for exhibition histories, labels, and curatorial files."],
  ["Repatriation case tracker","Structured pathway for active repatriation and return case references."],
  ["Fieldwork notebook route","Partner path for notebooks, catalogues, and research documentation."],
  ["Institutional handoff queue","Route for deferred matching to external catalogues and repositories."],
  ["Regional translation pathway","Partner process for translating titles, tags, and summaries across languages."]
].map((item, index) => ({
  id:`sp${String(index + 1).padStart(3,"0")}`,
  name:item[0],
  region:"Partner and community pathways",
  type:"Partner & Community",
  access:"partner",
  desc:item[1],
  url:""
}));

SOURCES.push(...EXTRA_SEARCH_READY_SOURCES, ...INTERNAL_ARCHITECTURE_PATHWAYS, ...PARTNER_SOURCE_PATHWAYS);

const DISCOVERY_SOURCE_IDS = ["s021","s039","s043","s041","s040","s044","s045","s053","s054","s046","s047","s048","s049","s050","s059","s060","s061","s062","s020","s033","s035","s034","s042","s029","s030","s032","s027","s028","s038","s055","s057"];

let currentPage = "home";
let selectedRecordId = null;
let citationStyle = "apa";
let libraryQuery = "";
let localResults = [];
let metadataFilters = {};
let quickFilters = {
  openAccess:false,
  verified:false,
  hideSensitive:false,
  metadataOnly:false,
  needsReview:false
};
let sourceMode = true;
let externalDiscovery = [];
let debounceTimer = null;
let searchSuggestions = [];
let activeSuggestionIndex = -1;
let recentSearches = [];
let beyondLabelState = {
  open:false,
  recordId:"",
  activeStep:"archive",
  selectedNodeId:"source",
  selectedLens:"place",
  copyMessage:"",
  worksheet:{
    fromRecord:"",
    cannotAssume:"",
    needsSource:"",
    care:""
  }
};
let beyondDataMapState = {
  open:false,
  selectedRecordIds:[],
  removedRecordIds:[],
  removedNodeIds:[],
  activeMode:"interactive",
  activeClusterId:"",
  activeNodeId:"query",
  hoveredNodeId:"",
  activeLayout:"flow",
  activeGroupBy:"source_position",
  mapVersion:0,
  searchWithinMap:"",
  pendingConfirm:"",
  message:""
};
let beyondDataFlowEventsBound = false;
let recordCommunityDraftState = {
  recordId:"",
  action:"",
  noteId:""
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

const RECORD_COMMUNITY_NOTES_KEY = "da.recordCommunityNotes.v1";
const RECORD_COMMUNITY_ACTIONS = [
  {
    id:"note",
    label:"Add a note",
    title:"Add a community note",
    helper:"Add context, questions or reading guidance connected to this record.",
    placeholder:"What context should future readers consider?"
  },
  {
    id:"correction",
    label:"Suggest a correction",
    title:"Suggest a correction",
    helper:"Point out a possible metadata issue without overwriting the source record.",
    placeholder:"What label, date, source, spelling or framing needs correction?"
  },
  {
    id:"review",
    label:"Request community review",
    title:"Request community review",
    helper:"Explain why this record may need review by people connected to its place, practice or community.",
    placeholder:"What should be reviewed, and why?"
  },
  {
    id:"knowledge",
    label:"Share related knowledge",
    title:"Share related knowledge",
    helper:"Add a related source, term, pathway or contextual note for future readers.",
    placeholder:"What related knowledge, source or search pathway should be connected?"
  },
  {
    id:"sensitive",
    label:"Flag sensitive framing",
    title:"Flag sensitive framing",
    helper:"Flag language or context that may need cultural care, restriction or clearer source positioning.",
    placeholder:"What framing may be sensitive or incomplete?"
  }
];

function getCommunityActionMeta(action) {
  return RECORD_COMMUNITY_ACTIONS.find(item => item.id === action) || RECORD_COMMUNITY_ACTIONS[0];
}

function readRecordCommunityNotes() {
  try {
    const raw = window.localStorage?.getItem(RECORD_COMMUNITY_NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn("Unable to read community notes", error);
    return {};
  }
}

function writeRecordCommunityNotes(notesByRecord) {
  try {
    window.localStorage?.setItem(RECORD_COMMUNITY_NOTES_KEY, JSON.stringify(notesByRecord || {}));
  } catch (error) {
    console.warn("Unable to save community note", error);
  }
}

function getRecordCommunityNotes(recordId) {
  const notesByRecord = readRecordCommunityNotes();
  return safeArray(notesByRecord[String(recordId || "")]);
}

function saveRecordCommunityNote(recordId, action, payload) {
  const id = String(recordId || "");
  if (!id) return;
  const meta = getCommunityActionMeta(action);
  const notesByRecord = readRecordCommunityNotes();
  const current = safeArray(notesByRecord[id]);
  const note = {
    id:`community-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action:meta.id,
    label:meta.label,
    title:String(payload?.title || meta.title).trim(),
    body:String(payload?.body || "").trim(),
    contact:String(payload?.contact || "").trim(),
    createdAt:new Date().toISOString()
  };
  notesByRecord[id] = [note, ...current].slice(0, 20);
  writeRecordCommunityNotes(notesByRecord);
}

function updateRecordCommunityNote(recordId, noteId, payload) {
  const id = String(recordId || "");
  const targetId = String(noteId || "");
  if (!id || !targetId) return;
  const notesByRecord = readRecordCommunityNotes();
  const current = safeArray(notesByRecord[id]);
  const next = current.map(note => {
    if (note.id !== targetId) return note;
    const meta = getCommunityActionMeta(note.action || payload?.action || "note");
    return {
      ...note,
      action:meta.id,
      label:meta.label,
      title:String(payload?.title || meta.title).trim(),
      body:String(payload?.body || "").trim(),
      contact:String(payload?.contact || "").trim(),
      updatedAt:new Date().toISOString()
    };
  });
  notesByRecord[id] = next;
  writeRecordCommunityNotes(notesByRecord);
}

function deleteRecordCommunityNote(recordId, noteId) {
  const id = String(recordId || "");
  const targetId = String(noteId || "");
  if (!id || !targetId) return;
  const notesByRecord = readRecordCommunityNotes();
  const current = safeArray(notesByRecord[id]);
  notesByRecord[id] = current.filter(note => note.id !== targetId);
  if (!notesByRecord[id].length) delete notesByRecord[id];
  writeRecordCommunityNotes(notesByRecord);
}

const ADVANCED_SEARCH_SOURCES = [
  ["archive", "Internal archive"],
  ["openalex", "OpenAlex"],
  ["core", "CORE"],
  ["crossref", "Crossref"],
  ["semantic-scholar", "Semantic Scholar"],
  ["wikidata", "Wikidata"],
  ["library-of-congress", "Library of Congress"],
  ["smithsonian", "Smithsonian"],
  ["aodl", "AODL"],
  ["trove", "Trove"]
];
function getDecolonialMode() {
  return Boolean(advancedSearchState?.filters?.decolonialMode);
}

const ADVANCED_SEARCH_MIN_CONCEPTS = 1;
const ADVANCED_SEARCH_MAX_CONCEPTS = 8;
let advancedSearchOpen = false;
let advancedSearchState = {
  title:"Systematic review search",
  reviewQuestion:"",
  notes:"",
  concepts:[
    {label:"Concept 1", mainTerm:"", synonyms:"", exactPhrases:"", excludeTerms:""},
    {label:"Concept 2", mainTerm:"", synonyms:"", exactPhrases:"", excludeTerms:""},
    {label:"Concept 3", mainTerm:"", synonyms:"", exactPhrases:"", excludeTerms:""}
  ],
  filters:{
    yearFrom:"",
    yearTo:"",
    openAccessOnly:false,
    decolonialMode:false
  },
  sources:["archive","openalex","core","crossref","semantic-scholar","wikidata","library-of-congress","smithsonian","aodl","trove"],
  message:""
};
let recordWorkspaceState = {};
let cardListComposerState = {};
let cardWorkbenchComposerState = {};
let cardDrawerOpenState = {};

function dispatchMemberNavUpdate(detail) {
  try {
    window.dispatchEvent(new CustomEvent("member-nav:update", { detail }));
  } catch (error) {
    console.warn("Could not update member nav counts", error);
  }
}

let memberWorkspaceState = {status:"idle", authenticated:null, data:null, message:""};
let locationSearchHydrated = false;

const SOURCE_MAP = new Map(SOURCES.map(source => [source.name, source]));

const METADATA_VOCABULARY = {
  recordType:["Architecture / Built Work","Archival Document","Artefact","Book","Book Chapter","Exhibition Record","Image","Institutional Record","Journal Article","Manuscript","Oral History","Performance / Sonic Record","Poster","Reference Volume","Teaching Resource","Textile","Website / Digital Resource","Dataset / Metadata Record"],
  knowledgeAreas:["African Philosophy","Architecture and Space","Craft and Making","Decolonial Theory","Design History","Education and Pedagogy","Environmental Knowledge","Epistemology","Food Systems","Gender and Feminist Thought","Governance and Civic Life","Indigenous Knowledge Systems","Informal Economies","Language and Writing Systems","Material Culture","Music and Performance","Oral Tradition","Political Thought","Spiritual Practice","Textile Knowledge","Visual Culture"],
  region:["Africa-wide / Pan-African","North Africa","West Africa","Central Africa","East Africa","Southern Africa","Sahel","African Diaspora","Global / Comparative"],
  language:["English","French","Arabic","Portuguese","Yoruba","Hausa","Swahili","Akan / Twi","Amharic","Other African Language","Multiple Languages","Unknown"],
  script:["Latin","Arabic","Ajami","Ge'ez","Nsibidi","Tifinagh","N'Ko","Vai","Other","Unknown"],
  period:["Precolonial","Colonial","Independence Era","Postcolonial","Contemporary","Unknown / Undated"],
  curatedCollections:["African Philosophy Working Library","Decolonial Theory Canon","African Material Culture","Architecture Beyond Colonialism","Manuscripts & Precolonial Texts","West African Oral Traditions","Liberation Movement Graphics"],
  rightsStatus:["Public Domain","Creative Commons","Open Access","In Copyright","Permission Granted","Metadata Only","Link Only","Rights Unknown","Restricted / Sensitive","Review Required","Check source"],
  licence:["CC0","CC BY","CC BY 4.0","CC BY-SA","CC BY-NC","CC BY-NC-SA","CC BY-ND","CC BY-NC-ND","Public Domain Mark","RightsStatements.org URI","All Rights Reserved","Check source","Unknown","Custom / Other"],
  accessType:["Full Text Available","Download Available","Read Online","Image Available","Thumbnail Only","External Link Only","Metadata Only","Restricted Access","Requires Permission","Community Review Required","Check Source"],
  reusePermission:["Reuse Allowed with Attribution","Non-Commercial Reuse Only","Educational Use Only","No Reuse Without Permission","Check Original Source","Unknown"],
  culturalSensitivity:["Public","Context Required","Sensitive","Community Review Needed","Restricted","Do Not Display Media","Takedown / Review Requested"],
  communityReviewStatus:["Not Required","Not Reviewed","Review Requested","Community Reviewed","Restricted by Community","Do Not Publish"],
  verificationStatus:["Verified","Source Checked","Rights Checked","External Source","Metadata Reviewed","AI-Assisted, Needs Review","Community Submitted","Unverified","Provisional","Needs Correction","Duplicate Suspected","Takedown Requested"],
  sourceType:["Museum / Gallery","Library Catalogue","Archive","Journal Database","University Repository","Book Publisher","Community Submission","Government Source","NGO / Cultural Organisation","Researcher Submitted","Web Resource","AI-Assisted Discovery"]
};

const METADATA_FILTER_GROUPS = [
  {key:"sourceOrigin", label:"Source Origin", options:["Archive","External Source"]},
  {key:"recordType", label:"Record Type", options:METADATA_VOCABULARY.recordType},
  {key:"knowledgeAreas", label:"Knowledge Area", options:METADATA_VOCABULARY.knowledgeAreas},
  {key:"region", label:"Region", options:METADATA_VOCABULARY.region},
  {key:"country", label:"Country", dynamic:true},
  {key:"communityOrCulturalGroup", label:"Community / Cultural Group", dynamic:true},
  {key:"language", label:"Language", options:METADATA_VOCABULARY.language},
  {key:"script", label:"Script / Writing System", options:METADATA_VOCABULARY.script},
  {key:"period", label:"Date / Period", options:METADATA_VOCABULARY.period},
  {key:"curatedCollections", label:"Curated Collection", options:METADATA_VOCABULARY.curatedCollections},
  {key:"rightsStatus", label:"Rights Status", options:METADATA_VOCABULARY.rightsStatus},
  {key:"licence", label:"Licence", options:METADATA_VOCABULARY.licence},
  {key:"accessType", label:"Access Type", options:METADATA_VOCABULARY.accessType},
  {key:"reusePermission", label:"Reuse Permission", options:METADATA_VOCABULARY.reusePermission},
  {key:"culturalSensitivity", label:"Cultural Sensitivity", options:METADATA_VOCABULARY.culturalSensitivity},
  {key:"communityReviewStatus", label:"Community Review Status", options:METADATA_VOCABULARY.communityReviewStatus},
  {key:"verificationStatus", label:"Verification Status", options:METADATA_VOCABULARY.verificationStatus},
  {key:"sourceType", label:"Source Type", options:METADATA_VOCABULARY.sourceType}
];

const RIGHTS_RISK_STATUSES = new Set(["Rights Unknown","In Copyright","Restricted / Sensitive","Review Required","Check source","Check Source"]);
const CULTURAL_MEDIA_BLOCKERS = new Set(["Restricted","Do Not Display Media","Community Review Needed","Takedown / Review Requested"]);

function slugMetadataTerm(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function canonicalMetadataTerm(value) {
  const raw = String(value || "").trim();
  const key = raw.toLowerCase();
  const map = {
    "african philosophy":"African Philosophy",
    "african philosophy working library":"African Philosophy Working Library",
    "political thought":"Political Thought",
    "music & performance":"Music and Performance",
    "music and performance":"Music and Performance",
    "oral traditions":"Oral Tradition",
    "oral history":"Oral History",
    "indigenous epistemologies":"Indigenous Knowledge Systems",
    "language & script":"Language and Writing Systems",
    "design & making":"Craft and Making",
    "visual sovereignty":"Visual Culture",
    "visual culture":"Visual Culture",
    "material culture":"Material Culture",
    "decolonisation":"Decolonial Theory",
    "decolonial theory":"Decolonial Theory",
    "philosophy & theory":"African Philosophy",
    "history & theory":"Decolonial Theory",
    "architecture":"Architecture / Built Work",
    "books & texts":"Book",
    "twi":"Akan / Twi",
    "akan/twi":"Akan / Twi",
    "rights reserved":"In Copyright",
    "author":"In Copyright",
    "open — community knowledge":"Open Access",
    "unesco — open record":"Open Access",
    "community custodianship":"Restricted / Sensitive",
    "community custodianship — held externally":"Restricted / Sensitive",
    "archival — conditional access":"Requires Permission"
  };
  return map[key] || raw;
}

function metadataList(value) {
  if (Array.isArray(value)) return value.map(item => String(item || "").trim()).filter(Boolean);
  const single = String(value || "").trim();
  if (!single) return [];
  return single.split(/\s*(?:,|;|\s\/\s)\s*/).map(item => item.trim()).filter(Boolean);
}

function uniqueMetadataValues(values) {
  const seen = new Set();
  const output = [];
  metadataList(values).forEach(value => {
    const canonical = canonicalMetadataTerm(value);
    const key = slugMetadataTerm(canonical);
    if (seen.has(key)) return;
    seen.add(key);
    output.push(canonical);
  });
  return output;
}

function normalizeRegionValues(values) {
  const raw = metadataList(values);
  const output = [];
  raw.forEach(value => {
    const lower = value.toLowerCase();
    if (lower.includes("west")) output.push("West Africa");
    if (lower.includes("north")) output.push("North Africa");
    if (lower.includes("east")) output.push("East Africa");
    if (lower.includes("southern") || lower.includes("south africa")) output.push("Southern Africa");
    if (lower.includes("central")) output.push("Central Africa");
    if (lower.includes("sahel")) output.push("Sahel");
    if (lower.includes("diaspora")) output.push("African Diaspora");
    if (lower.includes("global") || lower.includes("comparative")) output.push("Global / Comparative");
    if (lower.includes("pan-africa") || lower.includes("pan africa") || lower.includes("africa / global")) output.push("Africa-wide / Pan-African");
  });
  return uniqueMetadataValues(output.length ? output : raw);
}

function normalizePeriodValues(values) {
  const raw = metadataList(values);
  const output = [];
  raw.forEach(value => {
    const lower = String(value).toLowerCase();
    if (lower.includes("pre") || /1[0-7]\d{2}|[1-9]th/.test(lower)) output.push("Precolonial");
    if (lower.includes("colonial") || /18\d{2}|19[0-4]\d/.test(lower)) output.push("Colonial");
    if (lower.includes("independence") || /195\d|196\d|197\d/.test(lower)) output.push("Independence Era");
    if (lower.includes("postcolonial") || /198\d|199\d/.test(lower)) output.push("Postcolonial");
    if (lower.includes("contemporary") || /20\d{2}|202\d|present/.test(lower)) output.push("Contemporary");
    if (lower.includes("unknown") || lower.includes("undated")) output.push("Unknown / Undated");
  });
  return uniqueMetadataValues(output.length ? output : raw).filter(value => METADATA_VOCABULARY.period.includes(value));
}

function normalizeLanguageScript(record) {
  const scripts = metadataList(record.script);
  const languages = [];
  metadataList(record.language).forEach(value => {
    if (String(value).toLowerCase() === "ajami") scripts.push("Ajami");
    else languages.push(value);
  });
  return {
    language: uniqueMetadataValues(languages.length ? languages : ["Unknown"]),
    script: uniqueMetadataValues(scripts)
  };
}

function canDisplayMedia(record) {
  return !RIGHTS_RISK_STATUSES.has(record.rightsStatus) && !CULTURAL_MEDIA_BLOCKERS.has(record.culturalSensitivity);
}

function sourceOriginValue(recordOrMode) {
  const mode = typeof recordOrMode === "string" ? recordOrMode : getResultMode(recordOrMode);
  return mode === "local" || mode === "hybrid" ? "Archive" : "External Source";
}

function sourceOriginLabel(recordOrMode) {
  return sourceOriginValue(recordOrMode).toUpperCase();
}

function firstText(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const hit = value.map(item => firstText(item)).find(Boolean);
      if (hit) return hit;
      continue;
    }
    if (value && typeof value === "object") {
      const hit = firstText(value.url, value.URL, value.href, value.value, value.name, value.label, value.license, value.licence);
      if (hit) return hit;
      continue;
    }
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function truthySourceFlag(value) {
  if (value === true) return true;
  if (typeof value === "number") return value > 0;
  return /^(true|yes|open|oa|1)$/i.test(String(value || "").trim());
}

function collectRightsText(record) {
  const ext = record.extmetadata || record.externalMetadata || {};
  return [
    record.licence,
    record.license,
    record.licenceUrl,
    record.licence_url,
    record.licenseUrl,
    record.license_url,
    record.rights,
    record.rightsStatus,
    record.rightsStatement,
    record.rights_statement,
    record.rightsUri,
    record.rights_uri,
    record.copyright,
    record.oaStatus,
    record.oa_status,
    record.openAccess?.license,
    record.openAccess?.licenseUrl,
    record.openAccess?.oa_status,
    record.openAccess?.is_oa,
    record.open_access?.license,
    record.open_access?.license_url,
    record.open_access?.oa_status,
    record.open_access?.is_oa,
    record.primary_location?.license,
    record.primary_location?.license_url,
    record.best_oa_location?.license,
    record.best_oa_location?.license_url,
    ext.LicenseShortName?.value,
    ext.License?.value,
    ext.UsageTerms?.value,
    ext.Copyrighted?.value,
    ext.Restrictions?.value
  ].map(value => firstText(value)).filter(Boolean).join(" ");
}

function normalizeExternalLicence(record) {
  const text = collectRightsText(record).toLowerCase();
  if (!text) return "";
  if (/creativecommons\.org\/publicdomain\/zero|creativecommons\.org\/publicdomain\/zero\/1\.0|cc0\b/.test(text)) return "CC0";
  if (/creativecommons\.org\/publicdomain\/mark|public domain mark/.test(text)) return "Public Domain Mark";
  if (/creativecommons\.org\/licenses\/by-nc-nd|cc[- ]?by[- ]?nc[- ]?nd/.test(text)) return "CC BY-NC-ND";
  if (/creativecommons\.org\/licenses\/by-nc-sa|cc[- ]?by[- ]?nc[- ]?sa/.test(text)) return "CC BY-NC-SA";
  if (/creativecommons\.org\/licenses\/by-sa|cc[- ]?by[- ]?sa/.test(text)) return "CC BY-SA";
  if (/creativecommons\.org\/licenses\/by-nc|cc[- ]?by[- ]?nc/.test(text)) return "CC BY-NC";
  if (/creativecommons\.org\/licenses\/by-nd|cc[- ]?by[- ]?nd/.test(text)) return "CC BY-ND";
  if (/creativecommons\.org\/licenses\/by\/4\.0|cc[- ]?by[- ]?4\.0/.test(text)) return "CC BY 4.0";
  if (/creativecommons\.org\/licenses\/by|cc[- ]?by\b|creative commons attribution/.test(text)) return "CC BY";
  if (/rightsstatements\.org/.test(text)) return "RightsStatements.org URI";
  if (/all rights reserved/.test(text)) return "All Rights Reserved";
  if (/custom|other|publisher licence|publisher license/.test(text)) return "Custom / Other";
  return "";
}

function externalUrlBundle(record) {
  const sourceUrl = safeUrl(record.sourceUrl || record.source_url || record.sourceURL || record.url || record.URL || "");
  const pdfUrl = safeUrl(record.pdfUrl || record.pdf_url || record.downloadUrl || record.download_url || "");
  const fullTextUrl = safeUrl(record.fullTextUrl || record.full_text_url || record.fulltextUrl || firstText(record.fullTextUrls, record.source_fulltext_urls) || "");
  const htmlUrl = safeUrl(record.htmlUrl || record.html_url || record.landingPageUrl || record.landing_page_url || "");
  return {sourceUrl, pdfUrl, fullTextUrl, htmlUrl};
}

function normalizeExternalRightsMetadata(record) {
  const collectedRightsText = collectRightsText(record);
  const rightsText = /^(external source rights apply|check original source before reuse\.?)$/i.test(collectedRightsText.trim()) ? "" : collectedRightsText;
  const rightsLower = rightsText.toLowerCase();
  const licence = normalizeExternalLicence(record);
  const urls = externalUrlBundle(record);
  const hasRightsMetadata = Boolean(rightsText || licence);
  const openAccessFlag = truthySourceFlag(record.is_oa) ||
    truthySourceFlag(record.openAccess?.is_oa) ||
    truthySourceFlag(record.open_access?.is_oa) ||
    /(^|\W)(open access|gold|green|bronze|hybrid|oa)(\W|$)/i.test(firstText(record.oaStatus, record.oa_status, record.openAccess?.oa_status, record.open_access?.oa_status));
  const publicDomainFlag = truthySourceFlag(record.public_domain) ||
    truthySourceFlag(record.publicDomain) ||
    /public domain/.test(rightsLower);

  let rightsStatus = "Check source";
  if (licence.startsWith("CC ")) rightsStatus = "Creative Commons";
  else if (licence === "CC0" || licence === "Public Domain Mark" || publicDomainFlag) rightsStatus = "Public Domain";
  else if (/rightsstatements\.org\/(?:vocab|page)\/inc|\/inc\//.test(rightsLower) || /in copyright|copyrighted|all rights reserved/.test(rightsLower)) rightsStatus = "In Copyright";
  else if (openAccessFlag) rightsStatus = "Open Access";
  else if (canonicalMetadataTerm(record.rightsStatus) && !["Unknown","Rights Unknown"].includes(canonicalMetadataTerm(record.rightsStatus))) rightsStatus = canonicalMetadataTerm(record.rightsStatus);

  let accessType = "Metadata Only";
  const rawAccess = firstText(record.accessType, record.access_type);
  if (rawAccess && !/^unknown$/i.test(rawAccess)) accessType = canonicalMetadataTerm(rawAccess);
  else if (urls.pdfUrl) accessType = "Download Available";
  else if (urls.fullTextUrl) accessType = "Full Text Available";
  else if (urls.htmlUrl) accessType = "Read Online";
  else if (urls.sourceUrl) accessType = "External Link Only";

  let verificationStatus = "Unverified";
  if (licence === "CC0" || licence === "Public Domain Mark" || licence.startsWith("CC ")) verificationStatus = "Rights Checked";
  else if (hasRightsMetadata || openAccessFlag || publicDomainFlag) verificationStatus = "Source Checked";

  const displayLicence = licence || (rightsStatus === "Open Access" ? "Check source" : "");
  return {
    rightsStatus,
    licence: displayLicence,
    accessType,
    verificationStatus,
    sourceUrl: urls.sourceUrl || urls.htmlUrl || urls.fullTextUrl || urls.pdfUrl || "",
    pdfUrl: urls.pdfUrl,
    fullTextUrl: urls.fullTextUrl,
    htmlUrl: urls.htmlUrl,
    hasConfirmedReuseRights: rightsStatus === "Creative Commons" || rightsStatus === "Public Domain" || (rightsStatus === "Open Access" && Boolean(licence))
  };
}

function inferSourceType(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("museum") || text.includes("gallery")) return "Museum / Gallery";
  if (text.includes("library") || text.includes("worldcat") || text.includes("open library")) return "Library Catalogue";
  if (text.includes("archive") || text.includes("praad")) return "Archive";
  if (text.includes("journal") || text.includes("jstor") || text.includes("doaj")) return "Journal Database";
  if (text.includes("university") || text.includes("repository")) return "University Repository";
  if (text.includes("routledge") || text.includes("publisher") || text.includes("press")) return "Book Publisher";
  if (text.includes("community")) return "Community Submission";
  if (text.includes("government")) return "Government Source";
  if (text.includes("ngo") || text.includes("cultural")) return "NGO / Cultural Organisation";
  return "Web Resource";
}

function rightsWarning(record) {
  const isLiveExternal =
    getResultMode(record) === "live" || String(record.id || "").startsWith("live-");
  if (record.rightsStatus === "Check source" || record.accessType === "Metadata Only") {
    if (isLiveExternal) {
      return "External scholarly record. Use the links below to open the paper on Semantic Scholar or via DOI. The preview text is bibliographic metadata, not hosted full media in this archive.";
    }
  }
  if (RIGHTS_RISK_STATUSES.has(record.rightsStatus)) {
    return "Rights are unclear or restricted for hosted media in this archive. Metadata and source links are shown instead.";
  }
  if (CULTURAL_MEDIA_BLOCKERS.has(record.culturalSensitivity)) return "Cultural protocol restricts media display. Use the source link or review channel for context.";
  if (record.accessType === "Thumbnail Only") return "Thumbnail-only access. Do not reuse media without checking the original source.";
  return "";
}

function currentArchiveReturnPath() {
  return `${window.location.pathname}${window.location.search || ""}`;
}

function memberSignInUrl() {
  return `/auth/sign-in?next=${encodeURIComponent(currentArchiveReturnPath())}`;
}

function redirectToMemberSignIn() {
  window.location.href = memberSignInUrl();
}

function canUseAdvancedSearch() {
  return memberWorkspaceState.authenticated === true;
}

let memberWorkspaceFetchInFlight = false;

function hydrateLibraryMemberAuthFromServer() {
  if (currentPage !== "library") return;
  const app = document.getElementById("app");
  const hint = app?.dataset?.memberSignedIn;
  if (hint !== "true" && hint !== "false") return;
  if (memberWorkspaceState.status !== "idle") return;
  memberWorkspaceState = {
    status: "ready",
    authenticated: hint === "true",
    data: null,
    message: "",
  };
  queueMicrotask(() => fetchMemberWorkspaceState(true));
}

function ensureLibraryMemberAuth() {
  hydrateLibraryMemberAuthFromServer();
  if (memberWorkspaceState.status === "idle") {
    queueMicrotask(() => fetchMemberWorkspaceState(true));
  }
}

async function fetchMemberWorkspaceState(force = false) {
  if (!force && memberWorkspaceFetchInFlight) return;
  if (!force && memberWorkspaceState.status === "ready" && memberWorkspaceState.data) return;
  const previousMessage = memberWorkspaceState.message || "";
  const previousAuthenticated = memberWorkspaceState.authenticated;
  memberWorkspaceFetchInFlight = true;
  memberWorkspaceState = {...memberWorkspaceState, status:"loading", message:""};
  try {
    const response = await fetch("/api/workspace/record-tools?mode=session", {
      headers: {Accept:"application/json"}
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Could not load member tools.");
    memberWorkspaceState = {
      status:"ready",
      authenticated: previousAuthenticated === true ? true : Boolean(data.authenticated),
      data,
      message:previousMessage
    };
  } catch (error) {
    memberWorkspaceState = {
      status: previousAuthenticated === true ? "ready" : "error",
      authenticated: previousAuthenticated === true ? true : false,
      data: memberWorkspaceState.data,
      message:error.message || "Member tools failed to load."
    };
  } finally {
    memberWorkspaceFetchInFlight = false;
  }
  render();
}

function getRecordWorkspaceState(recordId) {
  return recordWorkspaceState[recordId] || {status:"idle", authenticated:null, data:null, message:""};
}

function setRecordWorkspaceState(recordId, patch) {
  recordWorkspaceState[recordId] = {...getRecordWorkspaceState(recordId), ...patch};
}

function getCardListComposerOpen(recordId) {
  return Boolean(cardListComposerState[recordId]);
}

function setCardListComposerOpen(recordId, isOpen) {
  cardListComposerState[recordId] = Boolean(isOpen);
}

function getCardWorkbenchComposerOpen(recordId) {
  return Boolean(cardWorkbenchComposerState[recordId]);
}

function setCardWorkbenchComposerOpen(recordId, isOpen) {
  cardWorkbenchComposerState[recordId] = Boolean(isOpen);
}

function getCardDrawerOpen(recordId) {
  return Boolean(cardDrawerOpenState[recordId]);
}

function setCardDrawerOpen(recordId, isOpen) {
  cardDrawerOpenState[recordId] = Boolean(isOpen);
}

async function fetchRecordWorkspaceState(record) {
  if (!record || !record.id) return;
  const state = getRecordWorkspaceState(record.id);
  if (state.status === "loading" || state.status === "ready") return;
  setRecordWorkspaceState(record.id, {status:"loading", message:""});
  try {
    const params = new URLSearchParams({
      recordId: record.id,
      recordUrl: record.sourceUrl || record.id
    });
    const response = await fetch(`/api/workspace/record-tools?${params.toString()}`, {
      headers: {Accept:"application/json"}
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Could not load workspace tools.");
    setRecordWorkspaceState(record.id, {
      status:"ready",
      authenticated: Boolean(data.authenticated),
      data,
      message:""
    });
  } catch (error) {
    setRecordWorkspaceState(record.id, {
      status:"error",
      authenticated:false,
      message:error.message || "Workspace tools failed to load."
    });
  }
  if (currentPage === "record" && selectedRecordId === record.id) render();
}

function buildWorkspaceRecordSnapshot(record) {
  if (!record || typeof record !== "object") return {};
  const sourceUrl = record.sourceUrl || record.source_url || record.url || record.href || "";
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};

  return {
    id: record.id,
    title: record.title || record.name || record.display_title || record.displayTitle || "",
    name: record.name || "",
    author: record.author || record.creator || record.contributor || "",
    creator: record.creator || "",
    contributor: record.contributor || "",
    source: record.source || record.source_name || record.publisher || record.archive || "",
    source_name: record.source_name || record.sourceName || "",
    publisher: record.publisher || "",
    archive: record.archive || "",
    collection: record.collection || "",
    type: record.type || record.record_type || record.kind || "",
    record_type: record.record_type || "",
    year: record.year || record.date || record.published_at || record.period || "",
    date: record.date || record.published_at || record.period || "",
    url: sourceUrl,
    source_url: sourceUrl,
    sourceUrl,
    recordUrl: sourceUrl,
    href: sourceUrl,
    metadata: {
      title: metadata.title || record.title || record.name || "",
      author: metadata.author || record.author || record.creator || "",
      creator: metadata.creator || record.creator || "",
      contributor: metadata.contributor || record.contributor || "",
      source: metadata.source || record.source || record.source_name || "",
      publisher: metadata.publisher || record.publisher || "",
      year: metadata.year || record.year || "",
      date: metadata.date || record.date || record.published_at || "",
      url: metadata.url || sourceUrl
    }
  };
}

async function postRecordWorkspaceAction(record, payload) {
  if (!record || !record.id) return;
  memberWorkspaceState = {
    ...memberWorkspaceState,
    status:"saving",
    message:""
  };
  setRecordWorkspaceState(record.id, {
    ...getRecordWorkspaceState(record.id),
    status:"saving",
    message:""
  });
  render();
  let shouldRefreshRecordState = true;
  let shouldRefreshMemberState = true;
  try {
    const response = await fetch("/api/workspace/record-tools", {
      method:"POST",
      headers: {"Content-Type":"application/json", Accept:"application/json"},
      body: JSON.stringify({
        recordId: record.id,
        recordTitle: record.title,
        recordUrl: record.sourceUrl || record.id,
        record: buildWorkspaceRecordSnapshot(record),
        ...payload
      })
    });
    const data = await response.json();
    if (response.status === 401) {
      // Defensive reset before navigation so the UI cannot remain frozen
      // if the redirect is delayed or blocked.
      memberWorkspaceState = {
        ...memberWorkspaceState,
        status:"ready",
        authenticated:false,
        message:""
      };
      setRecordWorkspaceState(record.id, {
        ...getRecordWorkspaceState(record.id),
        status:"ready",
        authenticated:false,
        message:""
      });
      render();
      redirectToMemberSignIn();
      return;
    }
    if (!response.ok || !data.ok) throw new Error(data.error || "Action failed.");
    const isBookmarkToggle = payload.action === "bookmark" && typeof data.bookmarked === "boolean";
    if (isBookmarkToggle) {
      dispatchMemberNavUpdate({ bookmarksDelta: data.bookmarked ? 1 : -1 });
      const existingData = memberWorkspaceState.data || {};
      const bookmarkRecordIds = Array.isArray(existingData.bookmarkRecordIds)
        ? existingData.bookmarkRecordIds
        : [];
      const nextBookmarkRecordIds = data.bookmarked
        ? Array.from(new Set([...bookmarkRecordIds, record.id]))
        : bookmarkRecordIds.filter(id => id !== record.id);
      memberWorkspaceState = {
        ...memberWorkspaceState,
        authenticated:true,
        data:{
          ...existingData,
          bookmarkRecordIds:nextBookmarkRecordIds
        },
        message:""
      };
      const existingRecordState = getRecordWorkspaceState(record.id);
      const existingRecordData = existingRecordState.data || {};
      setRecordWorkspaceState(record.id, {
        ...existingRecordState,
        authenticated:true,
        data:{
          ...existingRecordData,
          bookmark:data.bookmarked
            ? {...(existingRecordData.bookmark || {}), note: payload.note || null}
            : null
        },
        message:""
      });
      shouldRefreshRecordState = false;
      shouldRefreshMemberState = false;
    } else {
      memberWorkspaceState = {
        ...memberWorkspaceState,
        authenticated:true,
        message:""
      };
      setRecordWorkspaceState(record.id, {
        status:"idle",
        authenticated:true,
        data:null,
        message:""
      });
      if (payload.action === "create_reading_list") {
        setCardListComposerOpen(record.id, false);
      }
      if (payload.action === "workbench_add_record" || payload.action === "workbench_create_project") {
        setCardWorkbenchComposerOpen(record.id, false);
      }
    }
    if (shouldRefreshRecordState) await fetchRecordWorkspaceState(record);
    if (shouldRefreshMemberState) await fetchMemberWorkspaceState(true);
  } catch (error) {
    console.error("Record workspace action failed:", error);
    memberWorkspaceState = {
      ...memberWorkspaceState,
      message:error.message || "Action failed."
    };
    setRecordWorkspaceState(record.id, {
      ...getRecordWorkspaceState(record.id),
      message:error.message || "Action failed."
    });
  } finally {
    memberWorkspaceState = {
      ...memberWorkspaceState,
      status:"ready"
    };
    setRecordWorkspaceState(record.id, {
      ...getRecordWorkspaceState(record.id),
      status:"ready"
    });
    render();
  }
}

function getCurrentSearchFilters() {
  return {
    metadata: metadataFilters,
    quick: quickFilters,
    externalSources: Boolean(sourceMode)
  };
}

async function postSearchWorkspaceAction(payload) {
  if (!canUseAdvancedSearch()) {
    redirectToMemberSignIn();
    return;
  }
  memberWorkspaceState = {...memberWorkspaceState, status:"saving", message:""};
  render();
  try {
    const response = await fetch("/api/workspace/record-tools", {
      method:"POST",
      headers: {"Content-Type":"application/json", Accept:"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (response.status === 401) {
      redirectToMemberSignIn();
      return;
    }
    if (!response.ok || !data.ok) throw new Error(data.error || "Action failed.");
    memberWorkspaceState = {
      ...memberWorkspaceState,
      status:"ready",
      authenticated:true,
      message:data.message || "Search saved."
    };
    await fetchMemberWorkspaceState(true);
  } catch (error) {
    memberWorkspaceState = {
      ...memberWorkspaceState,
      status:"ready",
      message:error.message || "Action failed."
    };
    render();
  }
}

function hydrateSearchFromLocation() {
  if (locationSearchHydrated) return;
  locationSearchHydrated = true;
  const params = new URLSearchParams(window.location.search || "");
  const query = (params.get("q") || "").trim();
  if (!query) return;
  libraryQuery = query;
  localResults = searchLocalRecords(getEffectiveSearchQuery() || libraryQuery);
  liveResults = [];
  externalDiscovery = [];
  liveStatus = {
    state:"idle",
    message:"Archive results loaded. External source discovery is available.",
    sources:[]
  };
  refreshBlendedDiscovery(true);
}

function uniqueValues(values) {
  return [...new Set((values || []).filter(Boolean).map(value => String(value).trim()).filter(Boolean))];
}

function listify(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
}

function foldText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function iconBookmarkOutline() {
  return `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
    </svg>
  `;
}

function iconBookmarkCheck() {
  return `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z" fill="currentColor" />
      <path d="m9 12 2.2 2.2L15.5 10" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

function iconListPlus() {
  return `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M4 7.5h9M4 12h9M4 16.5h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <path d="M17 10v8M13 14h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>
  `;
}

function iconWorkbenchLayers() {
  return `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M4.5 8.5 12 5l7.5 3.5L12 12 4.5 8.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      <path d="m4.5 12 7.5 3.5L19.5 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="m4.5 15.5 7.5 3.5 7.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

function safeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return "";
}

function openExternal(url) {
  const safe = safeUrl(url);
  if (!safe) return;
  const opened = window.open(safe, "_blank", "noopener,noreferrer");
  if (opened) opened.opener = null;
}

function compactSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return foldText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeComparable(value) {
  return foldText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function paragraphs(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/\n\s*\n/)
    .map(item => item.trim())
    .filter(Boolean);
}

function humanList(values) {
  return listify(values).map(item => String(item).trim()).filter(Boolean).join(", ");
}

function dedupeLinks(links) {
  const seen = new Set();
  return (links || []).filter(link => {
    const url = safeUrl(link.url);
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  }).map(link => ({label: link.label || "Open link", url: safeUrl(link.url), note: link.note || ""}));
}

function derivedCitation(record) {
  return [
    record.creator,
    record.title ? `"${record.title}."` : "",
    record.collection || record.institution || record.source,
    record.period || record.date || "",
    record.provenance || ""
  ].filter(Boolean).join(" ");
}

function restoreFilenameText(filename) {
  return compactSpaces(
    String(filename || "")
      .replace(/\.(pdf|epub)$/i, "")
      .replace(/^Copy[_\s-]*/i, "")
      .replace(/\s*\(\d+\)\s*$/i, "")
      .replace(/\s+copy$/i, "")
      .replace(/_/g, ": ")
      .replace(/:\s*:/g, ":")
  );
}

function splitImportedTitleAndCreator(filename) {
  const cleaned = restoreFilenameText(filename);
  const parts = cleaned.split(/\s+-\s+/);
  if (parts.length > 1) {
    const creator = compactSpaces(parts.pop());
    return {
      title: compactSpaces(parts.join(" - ")),
      creator: creator || "Unknown"
    };
  }

  return {title: cleaned, creator: "Unknown"};
}

function inferImportedType(title) {
  if (/anthology|reader|companion|proceedings/i.test(title)) return "Reference Volume";
  if (/history/i.test(title)) return "History & Theory";
  return "Book";
}

function inferImportedCategory(title) {
  if (/philosophy|epistemology|ethics|ubuntu|identity|religion|cosmology/i.test(title)) return "Philosophy & Theory";
  if (/music|aesthetics|art|cinema|literature|diaspora/i.test(title)) return "Visual Culture";
  return "Books & Texts";
}

function inferImportedConcepts(title) {
  const lower = foldText(title);
  const concepts = [];
  if (/freire|pedagogy of the oppressed|critical consciousness|conscientization|banking education/.test(lower)) {
    concepts.push("critical consciousness", "Paulo Freire", "liberation pedagogy");
  }
  if (/philosophy|epistemology|ethics|ubuntu|identity/.test(lower)) concepts.push("African philosophy","epistemic inquiry");
  if (/politics|colonialism|human rights|anarchism|integration|xenophobia/.test(lower)) concepts.push("political thought","colonial critique");
  if (/music|aesthetics|art|cinema|literature/.test(lower)) concepts.push("cultural criticism","visual and sonic cultures");
  if (/women|feminism|gender/.test(lower)) concepts.push("gender studies","feminist thought");
  if (/religion|church|gods|biblical|cosmology/.test(lower)) concepts.push("religion","cosmology");
  if (!concepts.length) concepts.push("African studies");
  return uniqueValues(concepts);
}

function inferImportedThemes(title) {
  const lower = foldText(title);
  const themes = [];
  if (/philosophy|epistemology|ethics|ubuntu|identity/.test(lower)) themes.push("African Philosophy");
  if (/politics|human rights|colonialism|anarchism|integration|xenophobia/.test(lower)) themes.push("Political Thought");
  if (/religion|church|gods|biblical|cosmology/.test(lower)) themes.push("Religion & Cosmology");
  if (/women|feminism|gender/.test(lower)) themes.push("Gender Studies");
  if (/music|aesthetics|art|cinema|literature/.test(lower)) themes.push("Music & Performance");
  return uniqueValues(themes.length ? themes : ["African Philosophy"]);
}

function inferImportedTags(title, creator) {
  const rawWords = `${title} ${creator}`.replace(/[^A-Za-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const tags = rawWords.filter(word => word.length > 3).slice(0, 8);
  return uniqueValues(tags);
}

function inferImportedLanguages(title) {
  const lower = foldText(title);
  const languages = ["English"];
  if (/yoruba/.test(lower)) languages.push("Yoruba");
  if (/bantu|kongo/.test(lower)) languages.push("Kikongo");
  if (/ubuntu|xhosa|zulu/.test(lower)) languages.push("isiXhosa","isiZulu");
  if (/frantz fanon|colonialism|seneghor/.test(lower)) languages.push("French");
  if (/african philosophies|severine/.test(lower)) languages.push("French");
  if (/biblical|church|religion|cosmology/.test(lower)) languages.push("Arabic");
  return uniqueValues(languages);
}

function defaultSourcePathways(record) {
  const pathways = [record.source || "Local archive index"];
  if (record.source === "Local Bank") pathways.push("Local archive index","Internal enriched records","Manual curation pathway","Static metadata normalisation layer");
  if (record.source === "African Philosophy Working Library") pathways.push("Working-library filename import","Local archive index","Related search expansion engine","Source handoff router");
  if (record.source && record.source !== "Local Bank" && record.source !== "African Philosophy Working Library") pathways.push("Source handoff router","Rights and provenance enrichment");
  return uniqueValues(pathways);
}

function buildImportedExternalLinks(title) {
  const query = encodeURIComponent(title);
  return [
    {label:"Google Books",url:`https://books.google.com/books?q=${query}`},
    {label:"Open Library",url:`https://openlibrary.org/search?q=${query}`},
    {label:"WorldCat",url:`https://search.worldcat.org/search?q=${query}`},
    {label:"Google Scholar",url:`https://scholar.google.com/scholar?q=${query}`}
  ];
}

function buildWorkingLibraryRecord(filename, index) {
  const {title, creator} = splitImportedTitleAndCreator(filename);
  const concepts = inferImportedConcepts(title);
  const themes = inferImportedThemes(title);
  const category = inferImportedCategory(title);
  const type = inferImportedType(title);
  const focus = themes.join(", ").toLowerCase();

  return {
    id:`wl${String(index + 1).padStart(3, "0")}`,
    title,
    type,
    creator,
    region:"Africa / Global",
    country:"",
    community:"",
    period:"",
    concepts,
    themes,
    summary: (() => {
      const lower = foldText(title);
      if (/pedagogy of the oppressed|paulo freire/.test(lower)) {
        return `Foundational work on liberation pedagogy and critical consciousness by ${creator}. Essential reading for participatory education, literacy, and anti-oppressive teaching.`;
      }
      if (/freire|critical consciousness|conscientization/.test(lower)) {
        return `Scholarly text engaging critical consciousness and emancipatory education, associated with ${creator}.`;
      }
      return `Imported from the African Philosophy Working Library to expand the local search index for ${focus}.`;
    })(),
    abstract: (() => {
      const lower = foldText(title);
      if (/pedagogy of the oppressed|paulo freire/.test(lower)) {
        return `Paulo Freire's landmark account of how oppressed learners develop critical consciousness through dialogical, problem-posing education rather than banking models of instruction.`;
      }
      return `Supplementary working-library record for "${title}" by ${creator}.`;
    })(),
    description:[
      `This entry extends the static archive dataset beyond the original curated records by indexing a title from the local African Philosophy Working Library. It is designed so searches for underrepresented topics such as African philosophy, politics, religion, literature, music, and gender studies return broader results on the hosted site.`,
      "The current detail view is built from filename-level metadata. It preserves the title, creator, inferred knowledge areas, and discovery links so the record remains useful now, while still allowing richer abstracts, cover images, and catalogue references to be added later."
    ],
    tags: inferImportedTags(title, creator),
    rights:"Private working-library reference",
    provenance:"Indexed from the local African Philosophical books folder for static-site search expansion.",
    source:"African Philosophy Working Library",
    cat:category,
    collection:"African Philosophy Working Library",
    institution:"African Philosophy Working Library",
    language: inferImportedLanguages(title),
    sourceUrl:`https://books.google.com/books?q=${encodeURIComponent(title)}`,
    sourceActionLabel:"Search title online",
    externalLinks: buildImportedExternalLinks(title),
    sourcePathways:["African Philosophy Working Library","Working-library filename import","Local archive index","Query expansion dictionary","Source handoff router"],
    notes:["Imported from a local working-library filename rather than a full public catalogue record.","Useful for discovery and routing now; enrich later if you publish or catalogue the underlying file."],
    archiveIdentifier:`DA-WL-${String(index + 1).padStart(3, "0")}`,
    recordIdentifier:slugify(`${title}-${creator}`) || `wl-${index + 1}`
  };
}

function buildWorkingLibraryRecords() {
  const seenTitles = new Set(BASE_RECORDS.map(record => normalizeComparable(record.title)));
  const seenRecords = new Set(BASE_RECORDS.map(record => normalizeComparable(`${record.title} ${record.creator}`)));

  return WORKING_LIBRARY_FILES
    .map((filename, index) => buildWorkingLibraryRecord(filename, index))
    .filter(record => {
      const titleKey = normalizeComparable(record.title);
      const recordKey = normalizeComparable(`${record.title} ${record.creator}`);
      if (seenTitles.has(titleKey) || seenRecords.has(recordKey)) return false;
      seenTitles.add(titleKey);
      seenRecords.add(recordKey);
      return true;
    });
}

function normalizeRecord(record) {
  const enrichment = RECORD_ENRICHMENTS[record.id] || {};
  const sourceMeta = SOURCE_MAP.get(record.source) || {};
  const merged = {...record, ...enrichment};
  const sourceUrl = safeUrl(merged.sourceUrl || merged.link || sourceMeta.url || "");
  const institutionUrl = safeUrl(merged.institutionUrl || sourceMeta.url || "");
  const description = paragraphs(merged.description);
  const abstract = String(merged.abstract || "").trim();
  const summary = String(merged.summary || "").trim();
  const keywords = uniqueValues([...(merged.keywords || []), ...(merged.tags || [])]);
  const concepts = uniqueValues(merged.concepts || []);
  const themes = uniqueValues(merged.themes || []);
  const languageScript = normalizeLanguageScript(merged);
  const recordType = uniqueMetadataValues(merged.recordType || merged.type || merged.cat).filter(value => METADATA_VOCABULARY.recordType.includes(value));
  const typeFallback = recordType.length ? recordType : [METADATA_VOCABULARY.recordType.includes(canonicalMetadataTerm(merged.type)) ? canonicalMetadataTerm(merged.type) : "Dataset / Metadata Record"];
  const knowledgeAreas = uniqueMetadataValues([...(merged.knowledgeAreas || []), ...themes, ...concepts, ...(merged.tags || []), merged.cat, merged.type]).filter(value => METADATA_VOCABULARY.knowledgeAreas.includes(value));
  const regions = normalizeRegionValues(merged.region);
  const rightsStatus = METADATA_VOCABULARY.rightsStatus.includes(canonicalMetadataTerm(merged.rightsStatus || merged.rights)) ? canonicalMetadataTerm(merged.rightsStatus || merged.rights) : "Rights Unknown";
  const accessType = METADATA_VOCABULARY.accessType.includes(canonicalMetadataTerm(merged.accessType)) ? canonicalMetadataTerm(merged.accessType) : (sourceUrl ? "External Link Only" : "Metadata Only");
  const culturalSensitivity = METADATA_VOCABULARY.culturalSensitivity.includes(canonicalMetadataTerm(merged.culturalSensitivity)) ? canonicalMetadataTerm(merged.culturalSensitivity) : "Public";
  const verificationStatus = METADATA_VOCABULARY.verificationStatus.includes(canonicalMetadataTerm(merged.verificationStatus)) ? canonicalMetadataTerm(merged.verificationStatus) : (merged.aiAssisted ? "AI-Assisted, Needs Review" : "Provisional");
  const externalLinks = dedupeLinks([
    ...(merged.externalLinks || []),
    institutionUrl && merged.institution ? {label:"Institution",url:institutionUrl} : null
  ].filter(Boolean));

  return {
    ...merged,
    sourceUrl,
    institutionUrl,
    abstract,
    summary,
    description,
    contributors: uniqueValues(merged.contributors || []),
    language: languageScript.language,
    script: languageScript.script,
    concepts,
    themes: knowledgeAreas,
    knowledgeAreas,
    recordType: typeFallback,
    type: typeFallback[0],
    tags: uniqueValues(merged.tags || []),
    keywords,
    images: canDisplayMedia({rightsStatus, culturalSensitivity}) ? (merged.images || []).filter(image => safeUrl(image.src || image.url)).map(image => ({
      src: safeUrl(image.src || image.url),
      alt: image.alt || merged.title,
      caption: image.caption || ""
    })) : [],
    externalLinks,
    region: regions[0] || "Global / Comparative",
    regions,
    country: metadataList(merged.country).join(", "),
    countries: uniqueMetadataValues([...(merged.countries || []), merged.country]),
    communityOrCulturalGroup: uniqueMetadataValues(merged.communityOrCulturalGroup || merged.community),
    community: metadataList(merged.communityOrCulturalGroup || merged.community).join(", "),
    collection: merged.collection || merged.cat || "",
    curatedCollections: uniqueMetadataValues(merged.curatedCollections || merged.collection).filter(value => METADATA_VOCABULARY.curatedCollections.includes(value)),
    period: METADATA_VOCABULARY.period.includes(canonicalMetadataTerm(merged.period)) ? canonicalMetadataTerm(merged.period) : (merged.period || ""),
    periods: normalizePeriodValues(merged.period),
    institution: merged.institution || (record.source === "Local Bank" ? "Decolonising Archive local index" : record.source || ""),
    citation: merged.citation || derivedCitation({...merged, description}),
    sourceName: merged.sourceName || merged.source || merged.institution || "Archive record",
    sourceType: canonicalMetadataTerm(merged.sourceType || inferSourceType(merged.source || merged.institution || "")),
    dateAccessed: merged.dateAccessed || "",
    rightsStatus,
    licence: canonicalMetadataTerm(merged.licence || ""),
    rightsStatementUri: merged.rightsStatementUri || "",
    rightsHolder: merged.rightsHolder || "",
    accessType,
    reusePermission: canonicalMetadataTerm(merged.reusePermission || "Check Original Source"),
    culturalSensitivity,
    culturalProtocolNote: merged.culturalProtocolNote || "",
    localContextsLabel: merged.localContextsLabel || "",
    localContextsNotice: merged.localContextsNotice || "",
    communityReviewStatus: canonicalMetadataTerm(merged.communityReviewStatus || "Not Required"),
    verificationStatus,
    aiAssisted: Boolean(merged.aiAssisted),
    archiveIdentifier: merged.archiveIdentifier || `DA-${record.id.toUpperCase()}`,
    recordIdentifier: merged.recordIdentifier || record.id.toUpperCase(),
    relatedRecords: uniqueValues(merged.relatedRecords || []),
    sourcePathways: uniqueValues(merged.sourcePathways || defaultSourcePathways(record)),
    sourceActionLabel: merged.sourceActionLabel || "View source",
    date: merged.date || merged.period || "",
    notes: uniqueValues(merged.notes || [])
  };
}

const WORKING_LIBRARY_RECORDS = buildWorkingLibraryRecords().map(normalizeRecord);
const WORKING_LIBRARY_COLLECTION = COLLECTIONS.find(collection => collection.id === "c007");
if (WORKING_LIBRARY_COLLECTION) WORKING_LIBRARY_COLLECTION.count = WORKING_LIBRARY_RECORDS.length;

const RECORDS = [...BASE_RECORDS.map(normalizeRecord), ...WORKING_LIBRARY_RECORDS];
const RECORDS_BY_ID = new Map(RECORDS.map(record => [record.id, record]));
localResults = [...RECORDS];

const QUERY_EXPANSION_MAP = {
  "african philosophy":["kwasi wiredu","paulin hountondji","tsenay serequeberhan","african epistemology","ubuntu","communal personhood","theophilus okere"],
  "ubuntu":["african ethics","communal personhood","motsamai molefe","elphus muade","african philosophy"],
  "sankofa":["design pedagogy","decolonial design","african futures","knowledge recovery"],
  "restitution":["museum critique","repatriation","collection violence","provenance tracing"],
  "oral history":["testimony","community archiving","listening","memory infrastructures"],
  "timbuktu":["ajami traditions","islamic scholarship","manuscripts","sahel"],
  "fanon":["anti-colonial theory","dying colonialism","liberation philosophy","black consciousness"],
  "nkrumah":["pan-africanism","consciencism","political thought","socialist imaginaries"],
  "cabral":["liberation philosophy","national culture","anti-colonial struggle","movement strategy"],
  "biko":["black consciousness","psychological liberation","anti-apartheid","student movements"],
  "freire":["paulo freire","critical consciousness","pedagogy of the oppressed","conscientization","banking education"],
  "paulo freire":["critical consciousness","pedagogy of the oppressed","conscientization","banking education","liberation pedagogy"],
  "critical consciousness":["paulo freire","pedagogy of the oppressed","conscientization","banking education","liberation pedagogy"],
  "pedagogy of the oppressed":["paulo freire","critical consciousness","conscientization","banking education"],
  "adinkra":["akan","visual sovereignty","symbol systems","graphic sovereignty"],
  "ifa":["yoruba","divination systems","oral traditions","indigenous logic"],
  "museum":["restitution","display ethics","holding institutions","collection violence"],
  "language":["translation justice","script politics","multilingual archives","naming systems"],
  "sonic":["music","radio histories","listening","cassette circulations"],
  "architecture":["precolonial urbanism","vernacular architecture","spatial justice","settlement memory"]
};

const SEMINAL_AUTHOR_BOOSTS = {
  "critical consciousness": ["freire", "paulo freire"],
  "black consciousness": ["biko", "steve biko"],
  "ubuntu": ["molefe", "muade", "ramose"],
  "sankofa": ["ofosu-asare", "asare"]
};

function queryMatchesExpansionKey(normalized, tokens, key) {
  const keyNorm = normalizeComparable(key);
  if (!keyNorm) return false;
  if (normalized.includes(keyNorm) || keyNorm.includes(normalized)) return true;
  const keyTokens = keyNorm.split(/\s+/).filter(Boolean);
  if (keyTokens.length >= 2 && keyTokens.every((token) => tokens.includes(token))) return true;
  if (tokens.length >= 2) {
    const overlap = tokens.filter((token) => keyTokens.includes(token)).length;
    if (overlap >= Math.min(tokens.length, keyTokens.length)) return true;
  }
  return false;
}

const MEDIA_DISCOVERY_TERMS = ["archives","books","oral history","visual culture","architecture","manuscripts","political thought","music","pedagogy","museum collections"];
const LANGUAGE_DISCOVERY_TERMS = ["archive","philosophy","oral tradition","metadata"];
const PERIOD_DISCOVERY_TERMS = ["precolonial","colonial era","independence era","postcolonial","contemporary","diasporic"];

function getFeaturedRecords() {
  return RECORDS.filter(record => !String(record.id).startsWith("wl")).slice(0, 8);
}

function getFeaturedCollections(limit = 8) {
  const featured = COLLECTIONS.filter(collection => FEATURED_COLLECTION_TITLES.includes(collection.title));
  return featured.slice(0, limit);
}

function getFeaturedThemes(limit = 18) {
  return FEATURED_THEME_TERMS.slice(0, limit);
}

function buildFacetOptions(records, accessor, limit = 10) {
  const counts = new Map();
  records.forEach(record => {
    const values = uniqueValues(accessor(record) || []);
    values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({value, count}));
}

function buildQueryContext(query) {
  const raw = String(query || "").trim();
  const normalized = normalizeComparable(raw);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const expandedTerms = new Set(tokens);
  const expandedPhrases = [];

  Object.entries(QUERY_EXPANSION_MAP).forEach(([key, values]) => {
    if (queryMatchesExpansionKey(normalized, tokens, key)) {
      values.forEach(value => {
        expandedPhrases.push(value);
        normalizeComparable(value).split(/\s+/).filter(Boolean).forEach(token => expandedTerms.add(token));
      });
    }
  });

  return {
    raw,
    normalized,
    tokens:[...expandedTerms],
    phrases: uniqueValues([raw, ...expandedPhrases].filter(Boolean))
  };
}

function buildRelatedSearchIndex() {
  const seen = new Set();
  const entries = [];
  const creators = uniqueValues(RECORDS.map(record => record.creator));
  const communities = uniqueValues(RECORDS.map(record => record.community));
  const institutions = uniqueValues([...RECORDS.map(record => record.institution), ...SOURCES.map(source => source.name)]);

  function add(label, type, keywords = []) {
    const cleaned = compactSpaces(label);
    const key = normalizeComparable(cleaned);
    if (!cleaned || !key || seen.has(key)) return;
    seen.add(key);
    entries.push({label: cleaned, type, keywords: uniqueValues(keywords.concat(cleaned))});
  }

  THEMES.forEach(theme => add(theme, "theme", ["theme", theme]));
  COLLECTIONS.forEach(collection => add(collection.title, "collection", [collection.region, ...(collection.searchTerms || [])]));
  COUNTRY_TERRITORIES.forEach(country => add(country, "country", [country, "archives", "history"]));
  LANGUAGE_INDEX.forEach(language => add(language, "language", [language, "multilingual", "archive"]));
  SOURCES.forEach(source => add(source.name, "source", [source.region, source.type, source.access]));
  creators.forEach(creator => add(creator, "creator", ["creator", creator]));
  communities.forEach(community => add(community, "community", [community, "community archive"]));
  institutions.forEach(institution => add(institution, "institution", [institution, "institutional pathway"]));
  PERIOD_DISCOVERY_TERMS.forEach(period => add(period, "period", [period, "history"]));

  COUNTRY_TERRITORIES.slice(0, 90).forEach(country => {
    MEDIA_DISCOVERY_TERMS.forEach(term => add(`${country} ${term}`, "geo-medium", [country, term]));
  });

  THEMES.slice(0, 120).forEach(theme => {
    ["archives","books","oral history","visual culture","pedagogy","museum collections"].forEach(term => add(`${theme} ${term}`, "theme-medium", [theme, term]));
  });

  LANGUAGE_INDEX.forEach(language => {
    LANGUAGE_DISCOVERY_TERMS.forEach(term => add(`${language} ${term}`, "language-medium", [language, term]));
  });

  SOURCES.filter(source => source.access === "search").slice(0, 45).forEach(source => {
    ["decolonisation","African philosophy","archives"].forEach(term => add(`${source.name} ${term}`, "source-focus", [source.name, term]));
  });

  return entries;
}

const RELATED_SEARCH_INDEX = buildRelatedSearchIndex();

function buildSuggestionIndex() {
  const suggestions = [];
  RECORDS.forEach(record => {
    if (record.title) {
      suggestions.push({
        label: record.title,
        type: "title",
        value: record.title,
        meta: record.creator || ""
      });
    }
    if (record.creator) {
      suggestions.push({
        label: record.creator,
        type: "creator",
        value: record.creator,
        meta: "Creator"
      });
    }
  });
  THEMES.forEach(theme => {
    suggestions.push({
      label: theme,
      type: "theme",
      value: theme,
      meta: "Theme"
    });
  });
  COLLECTIONS.forEach(collection => {
    suggestions.push({
      label: collection.title,
      type: "collection",
      value: collection.title,
      meta: collection.region || "Collection"
    });
  });
  SOURCES.forEach(source => {
    suggestions.push({
      label: source.name,
      type: "source",
      value: source.name,
      meta: source.region || "Source"
    });
  });
  FEATURED_QUERY_SUGGESTIONS.forEach(label => {
    suggestions.push({
      label,
      type: "concept",
      value: label,
      meta: "Concept"
    });
  });
  const seen = new Set();
  return suggestions.filter(item => {
    const key = `${item.type}::${normalizeComparable(item.label)}`;
    if (!item.label || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
const SUGGESTION_INDEX = buildSuggestionIndex();

// ─── Recent searches ────────────────────────────────────────────────────────
const RECENT_SEARCHES_KEY = "ared_recent_searches";
const MAX_RECENT_SEARCHES = 8;

function loadRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(item => String(item).trim()).filter(Boolean).slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch (error) {
    console.warn("Could not load recent searches.", error);
    return [];
  }
}

function saveRecentSearches(items) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES)));
  } catch (error) {
    console.warn("Could not save recent searches.", error);
  }
}

function pushRecentSearch(query) {
  const value = String(query || "").trim();
  if (!value) return;
  const normalized = normalizeComparable(value);
  const next = [
    value,
    ...recentSearches.filter(item => normalizeComparable(item) !== normalized)
  ].slice(0, MAX_RECENT_SEARCHES);
  recentSearches = next;
  saveRecentSearches(recentSearches);
}

function clearRecentSearches() {
  recentSearches = [];
  saveRecentSearches([]);
}

function getSearchSuggestions(query, limit = 12) {
  const normalized = normalizeComparable(query);
  if (!normalized || normalized.length < 2) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return SUGGESTION_INDEX
    .map(item => {
      const label = normalizeComparable(item.label);
      const meta = normalizeComparable(item.meta || "");
      let score = 0;
      let hasMatch = false;
      if (label.startsWith(normalized)) { score += 20; hasMatch = true; }
      else if (label.includes(normalized)) { score += 12; hasMatch = true; }
      if (meta.includes(normalized)) { score += 4; hasMatch = true; }
      tokens.forEach(token => {
        if (label.includes(token)) { score += 3; hasMatch = true; }
        else if (token.length >= 4 && label.split(/\s+/).some((word) => word.startsWith(token))) {
          score += 6;
          hasMatch = true;
        }
        if (meta.includes(token)) { score += 1; hasMatch = true; }
      });
      if (tokens.length >= 2 && tokens.every((token) => label.includes(token) || label.split(/\s+/).some((word) => word.startsWith(token)))) {
        score += 12;
        hasMatch = true;
      }
      if (!hasMatch) return { item, score: 0 };
      if (label === normalized) score += 28;
      else if (normalized.length >= 4 && label.startsWith(normalized)) score += 18;
      if (item.type === "concept") score += 6;
      if (item.type === "title") score += 3;
      if (item.type === "creator") score += 4;
      if (item.type === "theme") score += 2;
      if (item.type === "collection") score += 2;
      return { item, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      a.item.label.localeCompare(b.item.label)
    )
    .slice(0, limit)
    .map(entry => entry.item);
}

function renderRecentSearches(variant = "library") {
  if (!recentSearches.length) return "";
  // `variant` lets us scope the DOM so hero and library can coexist without
  // id collisions when both are rendered (in practice only one page at a time).
  const wrapperId = variant === "hero" ? "heroRecentSearches" : "recentSearches";
  const clearId   = variant === "hero" ? "clearRecentSearchesBtnHero" : "clearRecentSearchesBtn";
  return `
    <section class="recent-searches" id="${wrapperId}" data-recent-variant="${variant}">
      <div class="recent-searches-header">
        <span class="recent-searches-title">Recent searches</span>
        <button type="button" class="recent-searches-clear" id="${clearId}">Clear</button>
      </div>
      <div class="recent-searches-list">
        ${recentSearches.map(item => `
          <button
            type="button"
            class="recent-search-chip"
            data-recent-search="${escapeHtml(item)}"
            data-recent-variant="${variant}"
          >${escapeHtml(item)}</button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSearchSuggestions(id = "searchSuggestions") {
  if (!searchSuggestions.length) {
    return `<div class="search-suggestions empty" id="${id}" hidden></div>`;
  }
  return `
    <div class="search-suggestions" id="${id}">
      ${searchSuggestions.map((item, index) => `
        <button
          type="button"
          class="search-suggestion-item ${index === activeSuggestionIndex ? "active" : ""}"
          data-suggestion-value="${escapeHtml(item.value)}"
          data-suggestion-index="${index}"
        >
          <span class="search-suggestion-label">${escapeHtml(item.label)}</span>
          <span class="search-suggestion-meta">${escapeHtml(item.type)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

// Imperative update: replace only the suggestions panel, keeping the input focused.
// Called from the input listener instead of a full render().
// `id` defaults to the library panel; pass "heroSuggestions" for the home page.
function updateSuggestionsDOM(id = "searchSuggestions") {
  const panel = document.getElementById(id);
  if (!panel) return;
  if (!searchSuggestions.length) {
    panel.innerHTML = "";
    panel.classList.add("empty");
    panel.setAttribute("hidden", "");
    return;
  }
  panel.classList.remove("empty");
  panel.removeAttribute("hidden");
  panel.innerHTML = searchSuggestions.map((item, index) => `
    <button
      type="button"
      class="search-suggestion-item ${index === activeSuggestionIndex ? "active" : ""}"
      data-suggestion-value="${escapeHtml(item.value)}"
      data-suggestion-index="${index}"
    >
      <span class="search-suggestion-label">${escapeHtml(item.label)}</span>
      <span class="search-suggestion-meta">${escapeHtml(item.type)}</span>
    </button>
  `).join("");
  bindSuggestionItemEvents(id);
}

function bindSuggestionItemEvents(id = "searchSuggestions", onSelect) {
  const panel = document.getElementById(id);
  if (!panel) return;

  // Use event delegation on the panel rather than per-button listeners.
  // The panel element persists across DOM updates of its children, so
  // even if the button the user tapped is replaced before the event
  // finishes propagating, the panel's listener still runs.
  //
  // We mark the panel so we only bind once, even if bindSuggestionItemEvents
  // is called multiple times for the same panel across renders.
  if (panel.dataset.suggestBound === "1") return;
  panel.dataset.suggestBound = "1";

  // Touch devices need different commit timing than mouse: pointerdown fires
  // at the very start of a touch, before the browser knows whether the user
  // is scrolling or tapping, so committing on pointerdown breaks scrolling.
  // We track touch movement and only commit on click (which fires at the end
  // of a tap, after touch resolution has happened). Mouse and pen still
  // commit on pointerdown for snappy desktop feel.
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved = false;
  const TOUCH_MOVE_THRESHOLD = 8; // px — above this, treat as scroll

  const commitSelection = (event) => {
    // Walk up from event.target to find the nearest suggestion button.
    // Event.target can be the inner <span>, so we can't just check the button.
    const target = event.target && event.target.closest
      ? event.target.closest("[data-suggestion-value]")
      : null;
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    const value = target.getAttribute("data-suggestion-value") || "";
    if (!value) return;
    if (typeof onSelect === "function") {
      onSelect(value);
      return;
    }
    // default: library search behaviour.
    // Note: we deliberately do NOT call input.blur() here. Blurring during
    // a pointerup sequence causes some browsers (esp. macOS Safari and
    // Chrome with precision trackpad drivers) to interpret the gesture
    // as a cancel rather than a commit, which breaks selection. The render()
    // below rebuilds the page; if focus should shift elsewhere, that will
    // happen naturally as the user interacts with the new page state.
    const input = document.getElementById("mainSearch");
    if (input) input.value = value;
    libraryQuery = value;
    searchSuggestions = [];
    activeSuggestionIndex = -1;
    pushRecentSearch(value);
    applyLibraryQuery(value, true);
    render();
  };

  // Track touch movement so we can distinguish a tap from a scroll gesture.
  panel.addEventListener("touchstart", (event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchMoved = false;
  }, { passive: true });

  panel.addEventListener("touchmove", (event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);
    if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) touchMoved = true;
  }, { passive: true });

  // Mouse and pen: commit on pointerdown. Per-event pointerType detection is
  // more accurate than a static (pointer: coarse) media query, because hybrid
  // devices (touch-screen laptops, iPad with mouse) can use either input
  // method depending on the moment.
  panel.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") return;
    commitSelection(event);
  }, { passive: false });

  // Touch: commit on click, which fires after the touch ends and only if the
  // touch wasn't a scroll gesture (i.e. movement stayed under threshold).
  // Click also serves as a fallback for any pointerType the pointerdown path
  // didn't handle.
  panel.addEventListener("click", (event) => {
    if (touchMoved) {
      // user was scrolling, not tapping — reset and ignore
      touchMoved = false;
      return;
    }
    commitSelection(event);
  });
}

function closeSuggestionsPanel(id = "searchSuggestions") {
  if (!searchSuggestions.length && activeSuggestionIndex === -1) return;
  searchSuggestions = [];
  activeSuggestionIndex = -1;
  updateSuggestionsDOM(id);
}

function collectionCoverageScore(collection) {
  const searchTerms = uniqueValues([collection.title, collection.region, ...(collection.searchTerms || [])]);
  const foldedTerms = searchTerms.map(term => foldText(term));

  const recordHits = RECORDS.filter(record => {
    const text = buildRecordSearchText(record);
    return foldedTerms.some(term => term && text.includes(term));
  }).length;

  const relatedHits = RELATED_SEARCH_INDEX.filter(entry => {
    const entryText = foldText([entry.label, ...(entry.keywords || [])].join(" "));
    return foldedTerms.some(term => term && entryText.includes(term));
  }).length;

  const sourceHits = SOURCES.filter(source => {
    const sourceText = foldText([source.name, source.region, source.desc, source.type].join(" "));
    return foldedTerms.some(term => term && sourceText.includes(term));
  }).length;

  return Math.max(recordHits * 18 + relatedHits * 2 + sourceHits * 5, recordHits || 0);
}

COLLECTIONS.forEach(collection => {
  if (!collection.count) collection.count = collectionCoverageScore(collection);
});

function getCollectionSuggestions(query, limit = 8) {
  const context = buildQueryContext(query);
  if (!context.raw) return getFeaturedCollections(limit);

  return COLLECTIONS
    .map(collection => {
      const text = foldText([collection.title, collection.region, collection.desc, ...(collection.searchTerms || [])].join(" "));
      const score = context.tokens.reduce((total, token) => total + (text.includes(token) ? 5 : 0), 0);
      return {collection, score};
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.collection.count - a.collection.count || a.collection.title.localeCompare(b.collection.title))
    .slice(0, limit)
    .map(item => item.collection);
}

function getRelatedSearchSuggestions(query, limit = 16) {
  const context = buildQueryContext(query);
  if (!context.raw) {
    return FEATURED_QUERY_SUGGESTIONS
      .map(label => RELATED_SEARCH_INDEX.find(entry => entry.label.toLowerCase() === label.toLowerCase()) || {label, type:"featured", keywords:[label]})
      .slice(0, limit);
  }

  return RELATED_SEARCH_INDEX
    .map(entry => {
      const label = foldText(entry.label);
      const keywordText = foldText((entry.keywords || []).join(" "));
      let score = 0;
      context.tokens.forEach(token => {
        if (label.includes(token)) score += 7;
        if (keywordText.includes(token)) score += 5;
      });
      if (label.includes(context.normalized)) score += 10;
      return {entry, score};
    })
    .filter(item => item.score > 0 && normalizeComparable(item.entry.label) !== context.normalized)
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
    .slice(0, limit)
    .map(item => item.entry);
}

function isBoilerplateDescription(content) {
  const text = content.join(" ").trim();
  if (!text) return true;
  if (/^venue:\s*/i.test(text) && text.length < 220) return true;
  if (/^year:\s*/i.test(text) && text.length < 120) return true;
  // Structural meta-descriptions that describe the archive entry itself, not the work
  if (/This entry extends the static archive dataset/i.test(text)) return true;
  if (/The current detail view is built from filename-level metadata/i.test(text)) return true;
  if (/indexing a title from the local African Philosophy Working Library/i.test(text)) return true;
  return false;
}

function synthesizeRecordSummary(record) {
  if (!record || !record.title) return null;
  const title = record.title.trim();
  const creator = record.creator ? record.creator.trim() : null;
  const type = (record.type || "").toLowerCase() || "work";
  const year = record.year || record.date || null;
  const rawAreas = [
    ...(Array.isArray(record.knowledgeAreas) ? record.knowledgeAreas : []),
    ...(Array.isArray(record.themes) ? record.themes : []),
  ].filter(Boolean);
  const areas = [...new Set(rawAreas)].slice(0, 4);
  const concepts = Array.isArray(record.concepts) ? record.concepts.filter(Boolean).slice(0, 5) : [];
  const collection = record.collection || null;
  const institution = record.institution || null;
  const sentences = [];
  let lead = `"${title}"`;
  if (creator) lead += ` by ${creator}`;
  if (year) lead += ` (${year})`;
  lead += ` is a ${type}`;
  if (collection && collection !== title) lead += ` from ${collection}`;
  else if (institution) lead += ` held at ${institution}`;
  lead += ".";
  sentences.push(lead);
  if (areas.length) {
    const joined = areas.length === 1
      ? areas[0]
      : areas.slice(0, -1).join(", ") + " and " + areas[areas.length - 1];
    sentences.push(`It is catalogued under ${joined}.`);
  }
  if (concepts.length) {
    const joined = concepts.length === 1
      ? concepts[0]
      : concepts.slice(0, -1).join(", ") + ", and " + concepts[concepts.length - 1];
    sentences.push(`Key concepts include ${joined}.`);
  }
  if (record.sourceUrl) {
    sentences.push("The original source is linked below for access to the full work.");
  } else {
    sentences.push("Richer metadata and full-text access may be added as this record is enriched.");
  }
  return sentences.length >= 2 ? sentences : null;
}

function normalizeRecordOverviewText(value) {
  const cleaned = paragraphs(value)
    .map(item => stripHtml(item).replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return cleaned.join("\n\n").trim();
}

function getRecordOverviewBlock(record) {
  const candidates = [
    { key:"abstract", label:"Abstract", value: record.abstract },
    { key:"summary", label:"Summary", value: record.summary },
    { key:"description", label:"Summary", value: record.description },
    { key:"snippet", label:"Summary", value: record.snippet },
    { key:"excerpt", label:"Summary", value: record.excerpt },
  ];
  for (const candidate of candidates) {
    const text = normalizeRecordOverviewText(candidate.value);
    if (text && !isBoilerplateDescription(paragraphs(text))) {
      return { ...candidate, text, paragraphs: paragraphs(text) };
    }
  }
  return null;
}

function renderRecordOverviewBlock(record) {
  const overview = getRecordOverviewBlock(record);
  if (!overview) return "";
  const panelId = `record-overview-${slugify(record.id || record.title || "record")}`;
  const shouldClamp = overview.text.length > 680 || overview.paragraphs.length > 2;
  return `<section class="record-abstract-card ${shouldClamp ? "is-collapsed" : "is-static"}" data-record-abstract-card>
    <div class="record-abstract-header">
      <span class="record-abstract-kicker">Source overview</span>
      <h2>${escapeHtml(overview.label)}</h2>
    </div>
    <div class="record-abstract-body" id="${escapeHtml(panelId)}">
      ${overview.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}
    </div>
    ${shouldClamp ? `<button type="button" class="record-abstract-toggle" data-record-abstract-toggle aria-expanded="false" aria-controls="${escapeHtml(panelId)}">Read more</button>` : ""}
  </section>`;
}

function sameNarrativeText(a, b) {
  return normalizeComparable(a) === normalizeComparable(b);
}

function getPrimaryNarrative(record, overviewBlock = null) {
  const abstract = paragraphs(record.abstract);
  const summary = paragraphs(record.summary);
  const description = paragraphs(record.description);
  const snippet = paragraphs(record.snippet);
  const excerpt = paragraphs(record.excerpt);
  const absText = abstract.join(" ").trim();
  const sumText = summary.join(" ").trim();
  const overviewKey = overviewBlock?.key || "";
  const overviewText = overviewBlock?.text || "";

  const nextSummaryCandidate = [
    { key:"description", content: description },
    { key:"summary", content: summary },
    { key:"abstract", content: abstract },
    { key:"snippet", content: snippet },
    { key:"excerpt", content: excerpt },
  ].find(candidate => {
    if (!candidate.content.length || candidate.key === overviewKey) return false;
    if (isBoilerplateDescription(candidate.content)) return false;
    const text = candidate.content.join(" ").trim();
    return text && !sameNarrativeText(text, overviewText);
  });

  if (nextSummaryCandidate) {
    const secondary = [];
    const alreadyUsed = nextSummaryCandidate.content.join(" ").trim();
    if (description.length && nextSummaryCandidate.key !== "description" && !isBoilerplateDescription(description)) {
      const descText = description.join(" ").trim();
      if (descText && !sameNarrativeText(descText, alreadyUsed) && !sameNarrativeText(descText, overviewText)) {
        secondary.push({ label: "Context", content: description });
      }
    }
    return { primary: { label: "Record summary", content: nextSummaryCandidate.content }, secondary };
  }

  if (abstract.length && overviewKey !== "abstract") {
    const secondary = [];
    if (description.length && !isBoilerplateDescription(description)) {
      const descText = description.join(" ").trim();
      if (descText && !absText.includes(descText)) {
        secondary.push({ label: "About this source", content: description });
      }
    }
    return { primary: { label: "Abstract", content: abstract }, secondary };
  }

  if (summary.length && overviewKey !== "summary") {
    const secondary = description.length && !isBoilerplateDescription(description)
      ? [{ label: "Description", content: description }]
      : [];
    return { primary: { label: "Record summary", content: summary }, secondary };
  }

  if (description.length && overviewKey !== "description" && !isBoilerplateDescription(description)) {
    return {
      primary: { label: "Record summary", content: description },
      secondary: [],
    };
  }

  const isLiveExternal =
    getResultMode(record) === "live" || String(record.id || "").startsWith("live-");
  const synthesized = synthesizeRecordSummary(record);
  if (synthesized) {
    return { primary: { label: "About this work", content: synthesized }, secondary: [] };
  }
  return {
    primary: {
      label: "Record note",
      content: [
        isLiveExternal
          ? "No abstract was returned from the external source. Open the original link below to read the full work."
          : "No extended narrative is available for this entry yet.",
      ],
    },
    secondary: [],
  };
}

function getLeadImage(record) {
  if (!record) return null;
  if (Array.isArray(record.images) && record.images.length) {
    const first = record.images[0];
    const src = first?.src || first?.url;
    if (src) return { ...first, src, alt: first.alt || record.title || "Cover image" };
  }
  const thumb = record.thumbnailUrl || record.imageUrl;
  if (thumb) return { src: thumb, alt: record.title || "Cover image", caption: "" };
  return null;
}

function getGalleryImages(record) {
  if (!record || !Array.isArray(record.images) || record.images.length < 2) return [];
  return record.images.slice(1);
}

function buildRecordSearchText(record) {
  return foldText([
    record.title,
    record.alternateTitle,
    record.creator,
    record.summary,
    record.abstract,
    (Array.isArray(record.description) ? record.description.join(" ") : (record.description || "")),
    record.region,
    record.country,
    record.community,
    record.period,
    record.collection,
    record.cat,
    record.type,
    record.institution,
    ...(record.sourcePathways || []),
    ...(record.language || []),
    ...(record.countries || []),
    record.provenance,
    record.rights,
    record.recordIdentifier,
    record.archiveIdentifier,
    record.citation,
    ...(record.contributors || []),
    ...(record.tags || []),
    ...(record.keywords || []),
    ...(record.concepts || []),
    ...(record.themes || []),
    ...(record.notes || [])
  ].join(" "));
}

function scoreRecord(record, context) {
  if (!context.raw) return 0;
  const terms = context.tokens;
  const title = foldText(record.title);
  const creator = foldText(record.creator);
  const tags = foldText([...(record.tags || []), ...(record.keywords || []), ...(record.concepts || []), ...(record.themes || [])].join(" "));
  const geo = foldText([record.region, record.country, record.community].join(" "));
  const summary = foldText([record.abstract, record.summary].join(" "));
  const detail = foldText(Array.isArray(record.description) ? record.description.join(" ") : (record.description || ""));
  const meta = foldText([record.collection, record.type, record.cat, record.recordIdentifier, record.archiveIdentifier, record.institution, ...(record.sourcePathways || []), ...(record.language || [])].join(" "));
  const phraseBonus = context.phrases.reduce((bonus, phrase) => {
    const normalizedPhrase = normalizeComparable(phrase);
    if (!normalizedPhrase) return bonus;
    if (title.includes(normalizedPhrase)) return bonus + 18;
    if (summary.includes(normalizedPhrase)) return bonus + 10;
    if (meta.includes(normalizedPhrase)) return bonus + 8;
    return bonus;
  }, 0);

  return phraseBonus + terms.reduce((score, term) => {
    if (title.includes(term)) score += 12;
    if (creator.includes(term)) score += 9;
    if (tags.includes(term)) score += 8;
    if (summary.includes(term)) score += 6;
    if (geo.includes(term)) score += 5;
    if (detail.includes(term)) score += 4;
    if (meta.includes(term)) score += 3;
    return score;
  }, 0);
}

function searchLocalRecords(query) {
  const context = buildQueryContext(query);
  if (!context.raw) return [...RECORDS];

  return RECORDS
    .map(record => ({record, score: scoreRecord(record, context), haystack: buildRecordSearchText(record)}))
    .filter(item => item.score > 0 || context.tokens.some(token => item.haystack.includes(token)))
    .sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title))
    .map(item => item.record);
}

function filterDisplayedRecords(records) {
  return records.filter(record => {
    const mode = getResultMode(record);
    if (mode === "live" || mode === "external_handoff") {
      if (quickFilters.hideSensitive && record.culturalSensitivity !== "Public") return false;
      if (quickFilters.openAccess && !["Public Domain","Creative Commons","Open Access"].includes(record.rightsStatus)) return false;
      return true;
    }
    for (const [key, selectedValues] of Object.entries(metadataFilters)) {
      if (!selectedValues || !selectedValues.length) continue;
      const recordValues = getRecordFacetValues(record, key);
      if (!selectedValues.some(value => recordValues.includes(value))) return false;
    }
    if (quickFilters.openAccess && !["Public Domain","Creative Commons","Open Access"].includes(record.rightsStatus)) return false;
    if (quickFilters.verified && record.verificationStatus !== "Verified") return false;
    if (quickFilters.hideSensitive && record.culturalSensitivity !== "Public") return false;
    if (quickFilters.metadataOnly && record.accessType !== "Metadata Only") return false;
    if (quickFilters.needsReview && !["Provisional","AI-Assisted, Needs Review","Needs Correction","Duplicate Suspected","Takedown Requested"].includes(record.verificationStatus)) return false;
    return true;
  });
}

function getRecordFacetValues(record, key) {
  if (key === "sourceOrigin") return [sourceOriginValue(record)];
  if (key === "country") return metadataList(record.countries || record.country);
  if (key === "curatedCollections") return metadataList(record.curatedCollections || record.collection);
  if (key === "knowledgeAreas") return metadataList(record.knowledgeAreas || record.themes || record.concepts);
  if (key === "region") return metadataList(record.regions || record.region);
  if (key === "recordType") return metadataList(record.recordType || record.type);
  if (key === "period") return metadataList(record.periods || record.period);
  const direct = record[key];
  if (Array.isArray(direct)) return direct.filter(Boolean);
  if (direct) return [direct];
  return [];
}

function hasAnyMetadataFilter() {
  return Object.values(metadataFilters).some(values => values && values.length) ||
    Object.values(quickFilters).some(Boolean);
}

function getActiveFilterCount() {
  const metadataCount = Object.values(metadataFilters).reduce((count, values) => {
    return count + (Array.isArray(values) ? values.length : 0);
  }, 0);
  const quickCount = Object.values(quickFilters).filter(Boolean).length;
  return metadataCount + quickCount;
}

function clearMetadataFilters() {
  metadataFilters = {};
  quickFilters = {openAccess:false, verified:false, hideSensitive:false, metadataOnly:false, needsReview:false};
}

function getRelatedRecordReason(item, record, overlap) {
  if (overlap && overlap.length) {
    const first = overlap[0];
    if (record.concepts.includes(first)) return `Related through ${first}`;
    if (record.themes.includes(first)) return `Connected by theme: ${first}`;
    if (record.tags.includes(first)) return `Shares keyword: ${first}`;
    if (item.cat === record.cat && first === record.cat) return `Same category: ${first}`;
    if (item.region === record.region && first === record.region) return `Same region: ${first}`;
    return `Connected through ${first}`;
  }
  if (item.creator && item.creator === record.creator) return `Same creator: ${item.creator}`;
  if (item.collection && item.collection === record.collection) return `Same collection: ${item.collection}`;
  if (item.source && item.source === record.source) return `Shares source: ${item.source}`;
  if (item.type && item.type === record.type) return `Similar record type: ${item.type}`;
  return null;
}

function getRelatedRecords(record, limit = 3) {
  const explicit = record.relatedRecords
    .map(id => RECORDS_BY_ID.get(id))
    .filter(Boolean)
    .slice(0, limit)
    .map(item => ({
      item,
      reason: getRelatedRecordReason(item, record, [])
    }));

  if (explicit.length >= limit) return explicit;

  const relatedIds = new Set(explicit.map(e => e.item.id));
  const pool = RECORDS.filter(item => item.id !== record.id && !relatedIds.has(item.id));

  const scored = pool.map(item => {
    const overlap = [...new Set([
      ...item.concepts.filter(concept => record.concepts.includes(concept)),
      ...item.tags.filter(tag => record.tags.includes(tag)),
      ...item.themes.filter(theme => record.themes.includes(theme)),
      item.cat === record.cat ? record.cat : "",
      item.region === record.region ? record.region : ""
    ].filter(Boolean))];

    return {item, score: overlap.length, overlap};
  }).filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit - explicit.length)
    .map(entry => ({
      item: entry.item,
      reason: getRelatedRecordReason(entry.item, record, entry.overlap)
    }));

  return [...explicit, ...scored];
}

function getRelatedRecordPreview(record) {
  // Priority: real content fields first
  const candidates = [
    record.abstract,
    record.summary,
    Array.isArray(record.description) ? record.description.join(' ') : record.description,
    record.snippet,
    record.excerpt,
    Array.isArray(record.notes) ? record.notes.join(' ') : record.notes,
    record.provenance,
  ];
  for (const c of candidates) {
    const text = String(c || '').replace(/\s+/g, ' ').trim();
    if (text && text.length > 48 && !/^venue:/i.test(text) && !/^year:/i.test(text)
      && !/This entry extends/i.test(text) && !/filename-level metadata/i.test(text)) {
      return text;
    }
  }
  // Rich metadata synthesis when no real content exists
  const title = (record.title || '').trim();
  const creator = (record.creator || '').trim();
  const type = (record.type || 'work').toLowerCase();
  const year = record.year || record.period || record.date || null;
  const source = record.sourceName || record.source || record.institution || null;
  const region = record.region || record.country || null;
  const collection = record.collection || null;
  const concepts = Array.isArray(record.concepts) ? record.concepts.filter(Boolean).slice(0, 5) : [];
  const themes = Array.isArray(record.themes) ? record.themes.filter(Boolean).slice(0, 3) : [];
  const tags = Array.isArray(record.tags) ? record.tags.filter(Boolean).slice(0, 3) : [];
  const cat = record.cat || record.category || null;
  const lang = Array.isArray(record.language) ? record.language[0] : (record.language || null);
  const rights = record.rights || record.accessType || null;
  const parts = [];
  // Lead sentence
  let lead = title ? `"${title}"` : 'This record';
  if (creator) lead += ` by ${creator}`;
  if (year) lead += ` (${year})`;
  if (title || creator) {
    lead += ` is a ${type}`;
    if (collection && collection !== title) lead += ` in the ${collection} collection`;
    else if (source) lead += ` from ${source}`;
    if (region) lead += `, relating to ${region}`;
    lead += '.';
    parts.push(lead);
  }
  // Subject/topic sentence
  const topicTerms = [...new Set([
    ...(cat ? [cat] : []),
    ...themes,
    ...concepts,
    ...tags
  ])].slice(0, 5);
  if (topicTerms.length >= 2) {
    const joined = topicTerms.slice(0, -1).join(', ') + ' and ' + topicTerms[topicTerms.length - 1];
    parts.push(`It engages with ${joined}.`);
  } else if (topicTerms.length === 1) {
    parts.push(`It engages with ${topicTerms[0]}.`);
  }
  // Language note
  if (lang && !/^en/i.test(lang)) {
    parts.push(`Published in ${lang}.`);
  }
  // Access note
  if (record.pdf_url || record.pdfUrl) {
    parts.push('A PDF version is available for direct reading.');
  } else if (record.sourceUrl || record.externalUrl) {
    parts.push('The original source is linked — open it for the full text.');
  } else if (rights && /open/i.test(rights)) {
    parts.push('This record appears to be openly accessible.');
  }
  return parts.length >= 2 ? parts.join(' ') : (parts[0] || 'Open this record to read more detail about its content and context.');
}

function getOriginalSourceUrl(record) {
  const candidates = [
    record.externalUrl,
    record.sourceUrl,
    record.url,
    record.doi ? `https://doi.org/${record.doi}` : null,
    record.semanticScholarUrl,
    record.googleBooksUrl,
    record.openLibraryUrl,
    record.worldcatUrl,
  ];
  for (const u of candidates) {
    const safe = safeUrl(u);
    if (safe) return safe;
  }
  return null;
}

function renderRelatedRecordCard(record, relationReason) {
  const preview = getRelatedRecordPreview(record);
  const sourceUrl = getOriginalSourceUrl(record);
  const pdfUrl = safeUrl(record.pdfUrl || record.pdf_url || '');
  const title = escapeHtml(record.title || 'Untitled');
  const creator = record.creator ? escapeHtml(record.creator) : null;
  const year = record.year || record.period || record.date || null;
  const source = escapeHtml(record.sourceName || record.source || record.institution || 'Archive');
  const recordType = escapeHtml(record.type || 'Record');

  const hasDirectSource = !!sourceUrl;
  const searchFallback = `https://www.google.com/search?q=${encodeURIComponent(record.title || '')}`;
  const finalUrl = sourceUrl || searchFallback;
  const ctaLabel = hasDirectSource ? 'View source' : 'Search title online';
  const ctaAriaLabel = hasDirectSource
    ? `View original source for ${record.title || 'this record'}`
    : `Search title online for ${record.title || 'this record'}`;

  const metaParts = [
    creator,
    year ? escapeHtml(String(year)) : null,
  ].filter(Boolean);

  const relationChip = relationReason
    ? `<span class="record-reset-related-reason">${escapeHtml(relationReason)}</span>`
    : '';

  const pdfChip = pdfUrl
    ? `<a class="record-reset-related-badge" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noopener noreferrer" data-stop-card-open="true" aria-label="Read PDF">PDF available</a>`
    : '';

  return `<article class="record-reset-related-card" data-id="${escapeHtml(record.id)}" data-mode="${escapeHtml(getResultMode(record))}" role="button" tabindex="0" aria-label="Open record: ${title}">
    <div class="record-reset-related-badges">
      <span class="record-reset-related-badge record-reset-related-badge-source" title="${source}">${source}</span>
      <span class="record-reset-related-badge">${recordType}</span>
      ${pdfChip}
    </div>
    <div class="record-reset-related-body">
      <h3 title="${title}">${title}</h3>
      ${metaParts.length ? `<p class="record-reset-related-meta">${metaParts.join(' · ')}</p>` : ''}
      <p class="record-reset-related-preview">${escapeHtml(preview)}</p>
      ${relationChip}
    </div>
    <footer class="record-reset-related-footer" data-stop-card-open="true">
      <div class="record-reset-related-links">
        <button type="button" data-beyond-label-record="${escapeHtml(record.id)}" data-stop-card-open="true" aria-label="Read beyond the label for ${title}">Read beyond the label</button>
        <button type="button" data-card-open-record aria-label="More details for ${title}">More details</button>
      </div>
      <a class="record-reset-related-source-button${hasDirectSource ? '' : ' record-reset-related-source-button--fallback'}" href="${escapeHtml(finalUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(ctaAriaLabel)}" data-stop-card-open="true">
        ${escapeHtml(ctaLabel)} <span aria-hidden="true">→</span>
      </a>
    </footer>
  </article>`;
}

function buildRecordActions(record) {
  const actions = [];

  if (record.sourceUrl) {
    actions.push({
      label: record.sourceActionLabel || "View source",
      note: record.source || record.institution || "",
      url: record.sourceUrl
    });
  }

  if (record.pdf_url) {
    actions.push({
      label: "Open PDF",
      note: "Open access full text",
      url: record.pdf_url
    });
  } else if (record.full_text_url && record.full_text_url !== record.sourceUrl) {
    actions.push({
      label: "Open full text",
      note: record.source || "External source",
      url: record.full_text_url
    });
  }

  if (record.institutionUrl && record.institutionUrl !== record.sourceUrl) {
    actions.push({
      label:"Visit institution",
      note: record.institution,
      url: record.institutionUrl
    });
  }

  if (record.collection) {
    const collectionMatch = COLLECTIONS.find(collection => collection.title === record.collection);
    if (collectionMatch) {
      actions.push({
        label:"Browse collection",
        note: collectionMatch.region,
        url:""
      });
    }
  }

  return [
    ...actions.filter(action => !action.url),
    ...dedupeLinks([
      ...actions.filter(action => action.url),
      ...(record.externalLinks || [])
    ])
  ];
}

function buildExternalDiscovery(query) {
  const context = buildQueryContext(query);
  if (!context.raw) return [];
  const handoffQuery = encodeURIComponent(uniqueValues([context.raw, ...context.phrases.slice(1, 3)]).join(" "));

  return DISCOVERY_SOURCE_IDS
    .map(id => SOURCES.find(source => source.id === id))
    .filter(Boolean)
    .map(source => ({
      ...source,
      actionLabel: source.searchTemplate ? "Search this source" : "Open source",
      actionUrl: source.searchTemplate ? `${source.searchTemplate}${handoffQuery}` : safeUrl(source.url)
    }))
    .filter(source => source.actionUrl);
}

function parseLegacyHashRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (!raw) return null;
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "record" && parts[1]) {
    return {page:"record", recordId:decodeURIComponent(parts.slice(1).join("/"))};
  }
  const page = ["home","library","sources","about"].includes(parts[0]) ? parts[0] : "home";
  return {page, recordId:null};
}

function normaliseArchivePath(pathname = window.location.pathname) {
  const trimmed = String(pathname || "/").replace(/\/+$/, "");
  return trimmed || "/";
}

function parseRouteFromPathname(pathname = window.location.pathname) {
  const path = normaliseArchivePath(pathname);
  if (path === "/" || path === "/home") return {page:"home", recordId:null};
  if (path === "/library") return {page:"library", recordId:null};
  if (path === "/sources") return {page:"sources", recordId:null};
  if (path === "/about") return {page:"about", recordId:null};
  const recordMatch = path.match(/^\/records\/(.+)$/);
  if (recordMatch) {
    return {page:"record", recordId:decodeURIComponent(recordMatch[1])};
  }
  const legacyRecordMatch = path.match(/^\/record\/(.+)$/);
  if (legacyRecordMatch) {
    return {page:"record", recordId:decodeURIComponent(legacyRecordMatch[1])};
  }
  return {page:"home", recordId:null};
}

function parseRouteFromLocation() {
  const legacyRoute = parseLegacyHashRoute();
  if (legacyRoute) {
    const cleanPath = makePath(legacyRoute.page, legacyRoute.recordId);
    window.history.replaceState({archiveRoute:true}, "", `${cleanPath}${window.location.search || ""}`);
    return legacyRoute;
  }
  return parseRouteFromPathname(window.location.pathname);
}

function makePath(page, recordId) {
  if (page === "record" && recordId) return `/records/${encodeURIComponent(recordId)}`;
  if (["home","library","sources","about"].includes(page)) return `/${page}`;
  return "/home";
}

function archiveHref(page, recordId = null) {
  return makePath(page, recordId);
}

function isArchivePath(pathname) {
  const route = parseRouteFromPathname(pathname);
  return route.page !== "home" || ["/", "/home"].includes(normaliseArchivePath(pathname));
}

function applyRoute(route, options = {}) {
  currentPage = route.page || "home";
  selectedRecordId = route.recordId || null;
  if (currentPage === 'library') {
    const app = document.getElementById("app");
    const hint = app?.dataset?.memberSignedIn;
    if (hint !== "true" && hint !== "false") {
      memberWorkspaceState = {status:"idle", authenticated:null, data:null, message:""};
    }
    hydrateSearchFromLocation();
    ensureLibraryMemberAuth();
  }
  render();
  if (!options.preserveScroll) {
    window.scrollTo({top:0, behavior:options.smooth ? 'smooth' : 'auto'});
  }
  window.dispatchEvent(new CustomEvent("archive:navigation", {
    detail:{page:currentPage, recordId:selectedRecordId, path:window.location.pathname}
  }));
}

function navigate(page, recordId = null, options = {}) {
  const nextPath = makePath(page, recordId);
  const currentPath = normaliseArchivePath(window.location.pathname);
  if (currentPath !== nextPath || window.location.hash) {
    window.history.pushState({archiveRoute:true, page, recordId}, "", nextPath);
  }
  applyRoute({page, recordId}, {smooth:options.smooth !== false});

  // Log page navigation & record views to admin analytics
  if (typeof window.__logArchiveEvent === 'function') {
    if (page === 'record' && recordId) {
      const rec = typeof getRecordByIdAny === 'function' ? getRecordByIdAny(recordId) : null;
      window.__logArchiveEvent({
        eventType: 'record_viewed',
        area: 'library',
        action: 'view',
        targetType: 'record',
        targetId: String(recordId),
        metadata: rec ? { title: rec.title, source: rec.source } : undefined,
      });
    } else if (page && page !== currentPage) {
      window.__logArchiveEvent({
        eventType: 'page_viewed',
        area: page,
        action: 'navigate',
        metadata: { page },
      });
    }
  }
}

function prepareArchivePageNavigation(element) {
  if (element.dataset.collection) {
    clearMetadataFilters();
    metadataFilters.curatedCollections = [element.dataset.collection];
    libraryQuery = '';
    localResults = searchLocalRecords(getEffectiveSearchQuery());
    liveResults = [];
    externalDiscovery = [];
    liveStatus = {state:'idle', message:'', sources:[]};
    refreshBlendedDiscovery(true);
  }
}

function handleArchiveNavigationClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const appShell = document.getElementById("app");
  if (!appShell) return;
  if (!target.closest("#app")) return;

  const explicitPage = target.closest('[data-page]');
  if (explicitPage) {
    const page = explicitPage.dataset.page;
    if (!page) return;
    event.preventDefault();
    event.stopPropagation();
    prepareArchivePageNavigation(explicitPage);
    navigate(page);
    return;
  }

  const anchor = target.closest('a[href]');
  if (!anchor) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;

  let url;
  try {
    url = new URL(anchor.getAttribute('href'), window.location.origin);
  } catch {
    return;
  }
  if (url.origin !== window.location.origin) return;
  if (!isArchivePath(url.pathname)) return;

  const route = parseRouteFromPathname(url.pathname);
  event.preventDefault();
  event.stopPropagation();
  const nextUrl = `${makePath(route.page, route.recordId)}${url.search || ""}`;
  const currentUrl = `${normaliseArchivePath(window.location.pathname)}${window.location.search || ""}`;
  if (currentUrl !== nextUrl || window.location.hash) {
    window.history.pushState({archiveRoute:true, page:route.page, recordId:route.recordId}, "", nextUrl);
  }
  applyRoute(route, {smooth:true});
}


let siteContent = {
  about: {
    eyebrow: "About",
    title: "About this archive",
    lead:
      "A working archive of decolonising knowledge across Africa, the diaspora, and the Global South.",
    body:
      "<p>This archive brings together records, theories, visual culture, oral traditions, and institutional pathways that support the recovery and organisation of decolonising knowledge.</p>",
    missionTitle: "Mission",
    missionBody:
      "<p>To build an accessible, evolving archive that supports research, teaching, cultural memory, and public knowledge.</p>",
    contactTitle: "Contact",
    contactBody:
      "<p>For rights, corrections, collaborations, or archival enquiries, please contact the archive administrator.</p>"
  }
};

async function loadSiteContent() {
  try {
    const response = await fetch("/api/site-content", { cache: "no-store" });
    const data = await response.json();

    if (data && data.ok && data.content) {
      siteContent = {
        ...siteContent,
        ...data.content,
        about: {
          ...siteContent.about,
          ...(data.content.about || {})
        }
      };

      if (currentPage === "about") {
        render();
      }
    }
  } catch (error) {
    console.warn("Could not load site content, using defaults.", error);
  }
}

function renderCollectionCard(collection) {
  return `
    <article class="coll-card" data-page="library" data-collection="${escapeHtml(collection.title)}">
      <div class="coll-icon">${escapeHtml(collection.icon)}</div>
      <div class="coll-title">${escapeHtml(collection.title)}</div>
      <div class="coll-desc">${escapeHtml(collection.desc)}</div>
      <div class="coll-footer">
        <span class="coll-region">${escapeHtml(collection.region)}</span>
        <span class="coll-count">${Number(collection.count || 0).toLocaleString()}</span>
      </div>
    </article>
  `;
}

function renderRelatedSearchTags(items) {
  return `
    <div class="theme-grid">
      ${items.map(item => {
        const label = typeof item === "string" ? item : item.label;
        return `<span class="theme-tag related-search" data-related="${escapeHtml(label)}">${escapeHtml(label)}</span>`;
      }).join("")}
    </div>
  `;
}

function extractCitationYear(period) {
  if (!period) return "";
  const match = String(period).match(/\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/);
  return match ? match[1] : "";
}

function mapRecordTypeToRIS(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("book")) return "BOOK";
  if (value.includes("journal")) return "JOUR";
  if (value.includes("article")) return "JOUR";
  if (value.includes("archival")) return "MANSCPT";
  if (value.includes("oral")) return "GEN";
  if (value.includes("poster")) return "ART";
  if (value.includes("image")) return "ART";
  if (value.includes("artefact") || value.includes("artifact")) return "ART";
  if (value.includes("architecture")) return "GEN";
  return "GEN";
}

function generateArchiveCitation(record) {
  const creator = (record.creator || "").trim();
  const title = (record.title || "").trim();
  const institution = (record.institution || record.source || "").trim();
  const year = extractCitationYear(record.period);
  const url = (record.sourceUrl || "").trim();
  const id = (record.recordIdentifier || record.archiveIdentifier || "").trim();
  return [creator, title ? `"${title}."` : "", institution, year, url, id ? `Record ID: ${id}.` : ""].filter(Boolean).join(" ");
}

function splitCreatorName(name) {
  const clean = String(name || "").trim();
  if (!clean) return { full: "Unknown", last: "Unknown", initials: "" };
  if (clean.includes(",")) {
    const [last, rest] = clean.split(",").map(part => part.trim());
    const initials = (rest || "")
      .split(/\s+/)
      .filter(Boolean)
      .map(part => `${part.charAt(0).toUpperCase()}.`)
      .join(" ");
    return { full: clean, last, initials };
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  const last = parts.length ? parts[parts.length - 1] : clean;
  const initials = parts.slice(0, -1).map(part => `${part.charAt(0).toUpperCase()}.`).join(" ");
  return { full: clean, last, initials };
}

function formatApaCitation(record) {
  const author = splitCreatorName(record.creator);
  const year = extractCitationYear(record.period) || "n.d.";
  const title = record.title || "Untitled";
  const source = record.institution || record.source || "Decolonising Archive";
  const url = record.sourceUrl || "";
  return `${author.last}, ${author.initials} (${year}). ${title}. ${source}.${url ? ` ${url}` : ""}`;
}

function formatChicagoCitation(record) {
  const creator = record.creator || "Unknown";
  const year = extractCitationYear(record.period) || "n.d.";
  const title = record.title || "Untitled";
  const source = record.institution || record.source || "Decolonising Archive";
  const url = record.sourceUrl || "";
  return `${creator}. "${title}." ${source}, ${year}.${url ? ` ${url}` : ""}`;
}

function formatMlaCitation(record) {
  const creator = record.creator || "Unknown";
  const title = record.title || "Untitled";
  const source = record.institution || record.source || "Decolonising Archive";
  const year = extractCitationYear(record.period) || "n.d.";
  const url = record.sourceUrl || "";
  return `${creator}. "${title}." ${source}, ${year}.${url ? ` ${url}` : ""}`;
}

function formatHarvardCitation(record) {
  const creator = record.creator || "Unknown";
  const year = extractCitationYear(record.period) || "n.d.";
  const title = record.title || "Untitled";
  const source = record.institution || record.source || "Decolonising Archive";
  const url = record.sourceUrl || "";
  return `${creator} (${year}) ${title}. ${source}.${url ? ` Available at: ${url}` : ""}`;
}

function generateCitationByStyle(record, style = "apa") {
  if (style === "chicago") return formatChicagoCitation(record);
  if (style === "mla") return formatMlaCitation(record);
  if (style === "harvard") return formatHarvardCitation(record);
  return formatApaCitation(record);
}

function generateRIS(record) {
  const lines = [];
  const year = extractCitationYear(record.period);
  lines.push(`TY  - ${mapRecordTypeToRIS(record.type)}`);
  if (record.title) lines.push(`TI  - ${record.title}`);
  if (record.creator) lines.push(`AU  - ${record.creator}`);
  if (year) lines.push(`PY  - ${year}`);
  if (record.institution || record.source) lines.push(`PB  - ${record.institution || record.source}`);
  if (record.collection) lines.push(`T2  - ${record.collection}`);
  if (record.sourceUrl) lines.push(`UR  - ${record.sourceUrl}`);
  if (record.recordIdentifier || record.archiveIdentifier) lines.push(`ID  - ${record.recordIdentifier || record.archiveIdentifier}`);
  lines.push("ER  -");
  return lines.join("\n");
}

async function copyCitation(record) {
  const citation = generateCitationByStyle(record, citationStyle);
  await navigator.clipboard.writeText(citation);
}

function downloadRIS(record) {
  const ris = generateRIS(record);
  const blob = new Blob([ris], { type: "application/x-research-info-systems" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = (record.title || "record").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  link.href = url;
  link.download = `${safeName}.ris`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bibtexEscape(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}");
}

function mapRecordTypeToBibTeX(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("book")) return "book";
  if (value.includes("journal") || value.includes("article")) return "article";
  if (value.includes("archival")) return "misc";
  if (value.includes("oral")) return "misc";
  if (value.includes("image")) return "misc";
  if (value.includes("artefact") || value.includes("artifact")) return "misc";
  return "misc";
}

function generateBibTeX(record) {
  const entryType = mapRecordTypeToBibTeX(record.type);
  const keyBase = slugify(`${record.creator || "unknown"}-${record.title || "record"}-${extractCitationYear(record.period) || "nd"}`) || "archive-record";
  const lines = [
    `@${entryType}{${keyBase},`,
    `  author = {${bibtexEscape(record.creator || "Unknown")}},`,
    `  title = {${bibtexEscape(record.title || "Untitled")}},`
  ];
  const year = extractCitationYear(record.period);
  if (year) lines.push(`  year = {${year}},`);
  if (record.institution || record.source) lines.push(`  publisher = {${bibtexEscape(record.institution || record.source)}},`);
  if (record.collection) lines.push(`  series = {${bibtexEscape(record.collection)}},`);
  if (record.sourceUrl) lines.push(`  url = {${bibtexEscape(record.sourceUrl)}},`);
  if (record.recordIdentifier || record.archiveIdentifier) lines.push(`  note = {Record ID: ${bibtexEscape(record.recordIdentifier || record.archiveIdentifier)}},`);
  lines.push(`}`);
  return lines.join("\n");
}

function downloadBibTeX(record) {
  const bib = generateBibTeX(record);
  const blob = new Blob([bib], { type: "application/x-bibtex" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = (record.title || "record").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  link.href = url;
  link.download = `${safeName}.bib`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderTagSection(label, values, extraClass = "") {
  if (!values || !values.length) return "";
  return `
    <section class="detail-section">
      <h2>${escapeHtml(label)}</h2>
      <div class="tag-row">
        ${values.map(value => `<span class="tag ${extraClass}">${escapeHtml(value)}</span>`).join("")}
      </div>
    </section>
  `;
}

function renderRecordWorkspaceTools(record) {
  const state = getRecordWorkspaceState(record.id);
  if (state.status === "idle") {
    queueMicrotask(() => fetchRecordWorkspaceState(record));
  }

  if (state.status === "loading" || state.authenticated === null) {
    return `
      <section class="record-sidebar-card record-workspace-tools">
        <h2>My workspace</h2>
        <p class="record-tools-muted">Loading your saved tools...</p>
      </section>
    `;
  }

  if (!state.authenticated) {
    return `
      <section class="record-sidebar-card record-workspace-tools">
        <h2>My workspace</h2>
        <p class="record-tools-muted">Sign in to bookmark this record, save related searches, and create reading lists.</p>
        <a class="record-primary-button" href="${escapeHtml(memberSignInUrl())}">Sign in to save</a>
      </section>
    `;
  }

  const data = state.data || {};
  const readingLists = data.readingLists || [];
  const bookmark = data.bookmark;
  const saving = state.status === "saving";
  const messageClass = saving
    ? "record-tools-message is-loading"
    : state.status === "error"
      ? "record-tools-message is-error"
      : state.message
        ? "record-tools-message is-success"
        : "record-tools-message";
  const message = saving
    ? `<p class="${messageClass}" aria-label="Saving"></p>`
    : state.message
      ? `<p class="${messageClass}">${escapeHtml(state.message)}</p>`
      : "";
  const defaultSearch = uniqueValues([record.title, record.creator, record.collection, record.region].filter(Boolean)).slice(0, 3).join(" ");

  return `
    <section class="record-sidebar-card record-workspace-tools">
      <h2>My workspace</h2>
      ${message}
      <div class="record-tools-stack">
        <form class="record-tool-form" data-record-tool="bookmark">
          <div class="record-tool-heading">
            <strong>${bookmark ? "Bookmarked" : "Bookmark record"}</strong>
            ${bookmark ? `<span>Saved</span>` : ""}
          </div>
          <label class="record-field">
            <span>Private note</span>
            <textarea class="record-input record-textarea" name="note" rows="3" placeholder="Why this record matters">${escapeHtml(bookmark?.note || "")}</textarea>
          </label>
          <button class="record-primary-button" type="submit" ${saving ? "disabled" : ""} aria-busy="${saving ? "true" : "false"}">${saving ? "Saving…" : bookmark ? "Update bookmark" : "Save bookmark"}</button>
        </form>

        <form class="record-tool-form" data-record-tool="save_search">
          <div class="record-tool-heading">
            <strong>Save search</strong>
          </div>
          <label class="record-field">
            <span>Search query</span>
            <input class="record-input" name="query" value="${escapeHtml(defaultSearch)}" />
          </label>
          <button class="record-primary-button" type="submit" ${saving ? "disabled" : ""} aria-busy="${saving ? "true" : "false"}">${saving ? "Saving…" : "Save search"}</button>
        </form>

        <form class="record-tool-form" data-record-tool="add_to_reading_list">
          <div class="record-tool-heading">
            <strong>Add to reading list</strong>
            <span>${readingLists.length} list${readingLists.length === 1 ? "" : "s"}</span>
          </div>
          ${readingLists.length ? `
            <label class="record-field">
              <span>Add to existing</span>
              <select class="record-select" name="readingListId" required>
                <option value="">Choose list</option>
                ${readingLists.map(list => `<option value="${escapeHtml(list.id)}">${escapeHtml(list.title)}</option>`).join("")}
              </select>
            </label>
            <button class="record-primary-button" type="submit" ${saving ? "disabled" : ""} aria-busy="${saving ? "true" : "false"}">${saving ? "Adding…" : "Add to list"}</button>
          ` : `
            <p class="record-tools-muted">No reading lists yet.</p>
          `}
        </form>
      </div>
    </section>
    <section class="record-sidebar-card record-create-list-card">
      <h2>Create list with this record</h2>
      <form class="record-create-list-form" data-record-tool="create_reading_list">
        <label class="record-field">
          <span>List title</span>
          <input class="record-input" name="title" placeholder="Research list title" />
        </label>
        <label class="record-checkbox-row">
          <input type="checkbox" name="isPublic" />
          <span>Public list</span>
        </label>
        <button class="record-primary-button" type="submit" ${saving ? "disabled" : ""} aria-busy="${saving ? "true" : "false"}">${saving ? "Creating…" : "Create list"}</button>
      </form>
    </section>
  `;
}

function renderCardWorkspaceActions(record) {
  if (memberWorkspaceState.status === "idle") {
    queueMicrotask(fetchMemberWorkspaceState);
  }

  if (memberWorkspaceState.status === "loading" || memberWorkspaceState.authenticated === null) {
    return `<div class="record-card-icon-row" data-stop-card-open="true"><span class="record-card-loading" aria-live="polite">…</span></div>`;
  }

  if (!memberWorkspaceState.authenticated) {
    return `
      <div class="record-card-icon-row" data-stop-card-open="true">
        <button class="record-card-icon-btn" type="button" data-member-signin aria-label="Sign in to bookmark" title="Sign in to bookmark">
          ${iconBookmarkOutline()}
        </button>
        <button class="record-card-icon-btn" type="button" data-member-signin aria-label="Sign in to manage reading lists" title="Sign in to manage reading lists">
          ${iconListPlus()}
        </button>
        <button class="record-card-icon-btn" type="button" data-member-signin aria-label="Sign in for Archive Workbench" title="Sign in for Archive Workbench">
          ${iconWorkbenchLayers()}
        </button>
      </div>
    `;
  }

  const data = memberWorkspaceState.data || {};
  const readingLists = data.readingLists || [];
  const workbenchProjects = data.workbenchProjects || [];
  const bookmarked = (data.bookmarkRecordIds || []).includes(record.id);
  const isSaving = memberWorkspaceState.status === "saving";
  const listComposerOpen = getCardListComposerOpen(record.id);
  const workbenchComposerOpen = getCardWorkbenchComposerOpen(record.id);
  const message = memberWorkspaceState.message ? `<span class="record-card-message">${escapeHtml(memberWorkspaceState.message)}</span>` : "";
  return `
    <div class="record-card-actions-wrap" data-record-id="${escapeHtml(record.id)}" data-stop-card-open="true">
      <div class="record-card-icon-row">
        <button
          class="record-card-icon-btn ${bookmarked ? "is-active" : ""}"
          type="button"
          data-card-bookmark
          aria-label="${bookmarked ? "Remove bookmark" : "Save bookmark"}"
          title="${bookmarked ? "Remove bookmark" : "Save bookmark"}"
          ${isSaving ? "disabled" : ""}
        >
          ${isSaving ? `<span class="record-card-spinner" aria-hidden="true"></span>` : bookmarked ? iconBookmarkCheck() : iconBookmarkOutline()}
        </button>
        <button
          class="record-card-icon-btn ${listComposerOpen ? "is-active" : ""}"
          type="button"
          data-card-list-toggle
          aria-expanded="${listComposerOpen ? "true" : "false"}"
          aria-label="${listComposerOpen ? "Hide list actions" : "Show list actions"}"
          title="${listComposerOpen ? "Hide list actions" : "Add to reading list"}"
          ${isSaving ? "disabled" : ""}
        >
          ${iconListPlus()}
        </button>
        <button
          class="record-card-icon-btn ${workbenchComposerOpen ? "is-active" : ""}"
          type="button"
          data-card-workbench-toggle
          aria-expanded="${workbenchComposerOpen ? "true" : "false"}"
          aria-label="${workbenchComposerOpen ? "Hide Workbench" : "Add to Workbench"}"
          title="${workbenchComposerOpen ? "Hide Workbench" : "Add to Workbench"}"
          ${isSaving ? "disabled" : ""}
        >
          ${iconWorkbenchLayers()}
        </button>
      </div>
      ${listComposerOpen ? `
        <div class="record-card-list-create">
          ${readingLists.length ? `
            <select class="record-card-select" data-card-reading-list aria-label="Choose reading list">
              <option value="">Reading list</option>
              ${readingLists.map(list => `<option value="${escapeHtml(list.id)}">${escapeHtml(list.title)}</option>`).join("")}
            </select>
            <button class="record-card-inline-btn" type="button" data-card-add-list ${isSaving ? "disabled" : ""} aria-busy="${isSaving ? "true" : "false"}">${isSaving ? "Adding…" : "Add"}</button>
          ` : ""}
          <input class="record-card-input" data-card-new-list type="text" placeholder="New list" aria-label="New reading list title" />
          <button class="record-card-inline-btn" type="button" data-card-create-list ${isSaving ? "disabled" : ""} aria-busy="${isSaving ? "true" : "false"}">${isSaving ? "Creating…" : "Create"}</button>
        </div>
      ` : ""}
      ${workbenchComposerOpen ? `
        <div class="record-card-list-create record-card-workbench-panel">
          ${workbenchProjects.length ? `
            <select class="record-card-select" data-card-workbench-project aria-label="Choose Workbench project">
              <option value="">Workbench project</option>
              ${workbenchProjects.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.title)}</option>`).join("")}
            </select>
            <button class="record-card-inline-btn" type="button" data-card-workbench-add ${isSaving ? "disabled" : ""} aria-busy="${isSaving ? "true" : "false"}">${isSaving ? "Adding…" : "Add"}</button>
          ` : `<p class="record-tools-muted">No projects yet.</p>`}
          <input class="record-card-input" data-card-new-workbench-project type="text" placeholder="New project title" aria-label="New Workbench project title" />
          <button class="record-card-inline-btn" type="button" data-card-workbench-create ${isSaving ? "disabled" : ""} aria-busy="${isSaving ? "true" : "false"}">${isSaving ? "Creating…" : "Create"}</button>
          <a class="record-card-inline-link" href="/my/workbench">Workbench →</a>
        </div>
      ` : ""}
      ${message}
    </div>
  `;
}

function renderActionList(record) {
  const actions = buildRecordActions(record);
  const collection = COLLECTIONS.find(item => item.title === record.collection);

  const items = actions.map(action => {
    if (action.url) {
      return `<a class="record-link-row" href="${escapeHtml(action.url)}" target="_blank" rel="noopener noreferrer">
        <span>
          <strong>${escapeHtml(action.label)}</strong>
          ${action.note ? `<small>${escapeHtml(action.note)}</small>` : ""}
        </span>
        <span class="record-link-icon">↗</span>
      </a>`;
    }

    if (collection) {
      return `<a class="record-link-row" href="${archiveHref("library")}" data-page="library" data-collection="${escapeHtml(collection.title)}">
        <span>
          <strong>Browse collection</strong>
          <small>${escapeHtml(collection.title)}</small>
        </span>
        <span class="record-link-icon">→</span>
      </a>`;
    }

    return "";
  }).filter(Boolean);

  items.push(`
    <a class="record-link-row" href="javascript:void(0)" id="copyCitationBtn">
      <span>
        <strong>Copy citation</strong>
        <small id="copyCitationNote">Copy archive citation text</small>
      </span>
      <span class="record-link-icon">⎘</span>
    </a>
  `);

  items.push(`
    <a class="record-link-row" href="javascript:void(0)" id="downloadRisBtn">
      <span>
        <strong>Download RIS</strong>
        <small>Export for Zotero, EndNote, or Mendeley</small>
      </span>
      <span class="record-link-icon">↓</span>
    </a>
  `);

  items.push(`
    <a class="record-link-row" href="javascript:void(0)" id="downloadBibBtn">
      <span>
        <strong>Download BibTeX</strong>
        <small>Export for LaTeX and reference managers</small>
      </span>
      <span class="record-link-icon">↓</span>
    </a>
  `);

  return `
    <section class="record-sidebar-card record-links-card">
      <h2>Links &amp; Access</h2>
      <div class="record-link-list">${items.join("")}</div>
    </section>
  `;
}

function renderHome() {
  const featured = getFeaturedRecords();
  const featuredCollections = getFeaturedCollections();
  const featuredKnowledgeAreas = getFeaturedThemes();
  const relatedPreview = getRelatedSearchSuggestions("", 14);
  const relatedCount = RELATED_SEARCH_INDEX.length;
  const countryCount = COUNTRY_TERRITORIES.length;
  const languageCount = LANGUAGE_INDEX.length;
  const searchReadyCount = SOURCES.filter(source => source.access === "search").length;

  return `
    <div class="page active">
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-eyebrow">${RECORDS.length} archive-indexed records · 300,000+ archive horizon · static-hosted discovery architecture</div>
          <h1>The archive of<br/><strong>decolonising knowledge</strong></h1>
          <p class="hero-sub">Books, oral histories, artefacts, images, textiles, posters, manuscripts, architectural documentation, and cultural records across Africa, the diaspora, and the Global South.</p>
          <div class="hero-search">
            <input type="text" id="heroSearch" aria-label="Search the archive" placeholder="Search by title, creator, knowledge area, region, community…" autocomplete="off"/>
            <button id="heroSearchBtn" type="button">Search</button>
            ${renderSearchSuggestions("heroSuggestions")}
          </div>
          ${renderRecentSearches('hero')}
          <div class="hero-suggestions">
            ${FEATURED_QUERY_SUGGESTIONS.slice(0, 7).map(term => `<span class="suggestion" data-q="${escapeHtml(term)}">${escapeHtml(term)}</span>`).join("")}
          </div>
          <div class="hero-note">Core browsing runs from a stable archive index, while collections, knowledge areas, related searches, languages, source pathways, and search-ready handoffs scale well beyond the bundled record count.</div>
        </div>
      </section>

      <div class="stats-bar">
        <div class="stats-bar-inner">
          ${[
            [relatedCount.toLocaleString(), "Related searches"],
            [COLLECTIONS.length, "Collections"],
            [THEMES.length, "Knowledge Areas"],
            [SOURCES.length, "Source pathways"],
            [searchReadyCount, "Search-ready sources"],
            [countryCount, "Countries & territories"],
            [languageCount, "Languages"]
          ].map(([count, label]) => `
            <div class="stat-item">
              <div class="stat-n">${escapeHtml(String(count))}</div>
              <div class="stat-l">${escapeHtml(String(label))}</div>
            </div>
          `).join("").repeat(2)}
        </div>
      </div>

      <section class="section">
        <div class="section-header">
          <span class="section-title">Featured Records</span>
          <a href="${archiveHref("library")}" class="section-link" data-page="library">Browse all →</a>
        </div>
        <div class="card-grid">${featured.map(renderCard).join("")}</div>
      </section>

      <section class="section alt">
        <div class="section-header">
          <span class="section-title">Collections</span>
          <a href="${archiveHref("library")}" class="section-link" data-page="library">120+ collection pathways →</a>
        </div>
        <div class="coll-grid">
          ${featuredCollections.map(renderCollectionCard).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <span class="section-title">Browse by Knowledge Area</span>
          <a href="${archiveHref("library")}" class="section-link" data-page="library">220+ knowledge areas →</a>
        </div>
        ${renderRelatedSearchTags(featuredKnowledgeAreas)}
      </section>

      <section class="section alt">
        <div class="section-header">
          <span class="section-title">Related Searches</span>
          <span class="section-link">${relatedCount.toLocaleString()} indexed discovery routes</span>
        </div>
        <p class="section-copy">Related searches connect knowledge areas, regions, communities, institutions, media types, languages, and nearby concepts so users can move laterally when a query is too narrow, too sparse, or phrased differently.</p>
        ${renderRelatedSearchTags(relatedPreview)}
      </section>

      <section class="section">
        <div class="section-header"><span class="section-title">Who is this archive for?</span></div>
        <div class="audience-grid">
          <div class="audience-card">
            <div class="audience-title">Researchers &amp; Academics</div>
            <ul class="audience-list">
              <li>Local indexed browsing that works on any static host</li>
              <li>Richer record detail with provenance, rights, and citation fields</li>
              <li>Related-search recovery across 2,500+ discovery routes</li>
              <li>Optional source handoffs to 40+ search-ready archives</li>
            </ul>
          </div>
          <div class="audience-card">
            <div class="audience-title">Students</div>
            <ul class="audience-list">
              <li>Curated anchor records plus an expanded African philosophy working library</li>
              <li>Knowledge area-led search, related-search guidance, and collection pathways</li>
              <li>Fast loading and mobile-safe browsing</li>
              <li>No sign-in or backend required</li>
            </ul>
          </div>
          <div class="audience-card">
            <div class="audience-title">Institutions</div>
            <ul class="audience-list">
              <li>Clear source and custody fields on every record</li>
              <li>Extensible data model for images, notes, and related records</li>
              <li>Static deployment with no fragile client-side dependency chain</li>
              <li>Source directory for institutional pathways and partnerships</li>
            </ul>
          </div>
          <div class="audience-card">
            <div class="audience-title">Independent Readers</div>
            <ul class="audience-list">
              <li>Calm editorial interface with clear navigation</li>
              <li>Useful detail pages instead of thin metadata stubs</li>
              <li>Direct paths to institutions where available</li>
              <li>Responsive layout across desktop and mobile</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderSourceCard(source, isDiscovery = false) {
  const statusClass = {search:"status-search",linked:"status-linked",partner:"status-partner",internal:"status-linked"}[source.access] || "status-linked";
  const statusLabel = {search:"Search-ready",linked:"Directory",partner:"Partnership",internal:"Internal"}[source.access] || source.access;
  const actionUrl = isDiscovery ? source.actionUrl : safeUrl(source.url);
  const actionLabel = isDiscovery ? `${source.actionLabel} →` : (source.access === "search" ? "Open source →" : source.access === "partner" ? "Partnership pathway →" : "View pathway →");

  return `
    <article class="source-card">
      <div class="source-header">
        <div class="source-name">${escapeHtml(source.name)}</div>
        <span class="status-chip ${statusClass}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="source-region">${escapeHtml(source.region)}</div>
      <div class="source-desc">${escapeHtml(source.desc)}</div>
      ${actionUrl ? `<a href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer" class="source-action">${escapeHtml(actionLabel)}</a>` : `<span class="source-action disabled">No public link available</span>`}
    </article>
  `;
}

function renderSources() {
  const groups = [
    {title:`African-Priority Rooms (${SOURCES.filter(source => source.type === "African-Priority").length})`, items:SOURCES.filter(source => source.type === "African-Priority"), alt:false},
    {title:`Search-Ready Sources (${SOURCES.filter(source => source.type === "Search-Ready").length})`, items:SOURCES.filter(source => source.type === "Search-Ready"), alt:true},
    {title:`Internal Architecture Pathways (${SOURCES.filter(source => source.type === "Internal Architecture").length})`, items:SOURCES.filter(source => source.type === "Internal Architecture"), alt:false},
    {title:`Partner & Community Routes (${SOURCES.filter(source => source.type === "Partner & Community").length})`, items:SOURCES.filter(source => source.type === "Partner & Community"), alt:true}
  ];
  const searchReadyCount = SOURCES.filter(source => source.access === "search").length;

  return `
    <div class="page active">
      <section class="hero hero-compact">
        <div class="hero-inner">
          <div class="hero-eyebrow">${SOURCES.length} source pathways · ${searchReadyCount} search-ready routes · static-friendly discovery model</div>
          <h1 class="source-hero-title">Archive <strong>source directory</strong></h1>
          <p class="hero-sub hero-sub-tight">The source directory now reflects a larger archive architecture: African-priority institutions, search-ready discovery layers, internal enrichment pathways, and partner routes for records that cannot simply be fetched in the browser.</p>
        </div>
      </section>

      ${groups.filter(group => group.items.length).map(group => `
        <section class="section ${group.alt ? "alt" : ""}">
          <div class="section-header"><span class="section-title">${group.title}</span></div>
          <div class="source-grid">${group.items.map(source => renderSourceCard(source)).join("")}</div>
        </section>
      `).join("")}

      <section class="section">
        <div class="section-header"><span class="section-title">Access Protocols &amp; Rights</span></div>
        <div class="protocol-grid">
          <div class="protocol-cell"><strong>Archive Index</strong>The core archive runs from a static archive dataset so browsing and search remain stable when hosted on any static domain.</div>
          <div class="protocol-cell"><strong>Search-Ready</strong>Links open the originating archive or discovery interface in a new tab rather than depending on fragile browser-side API aggregation.</div>
          <div class="protocol-cell"><strong>Directory</strong>Institutional homepages, repository directories, and partner routes remain visible even when item-level access is external or rights-limited.</div>
          <div class="protocol-cell"><strong>Partnership</strong>Some collections require institutional access, custodial agreements, or on-site consultation rather than public download.</div>
          <div class="protocol-cell"><strong>Internal Architecture</strong>Search expansion, taxonomy registries, enrichment layers, and routing logic are represented as first-class pathways inside the archive model.</div>
          <div class="protocol-cell"><strong>Community Custodianship</strong>Records may describe knowledge held by originating communities. Discovery does not override community governance or rights.</div>
          <div class="protocol-cell"><strong>Rights Handling</strong>Metadata and summaries can remain open while the underlying source retains its own access restrictions, licences, or viewing conditions.</div>
        </div>
      </section>
    </div>
  `;
}

function renderAbout() {
  const about = siteContent.about || {};

  return `
    <div class="page active">
      <div class="about-body">
        <div class="hero-eyebrow eyebrow-tight">${escapeHtml(about.eyebrow || "About")}</div>
        <h1>${escapeHtml(about.title || "About this archive")}</h1>
        <p class="about-lead">${escapeHtml(about.lead || "")}</p>

        <div class="about-richtext">${about.body || ""}</div>

        <h2>${escapeHtml(about.missionTitle || "Mission")}</h2>
        <div class="about-richtext">${about.missionBody || ""}</div>

        <h2>${escapeHtml(about.contactTitle || "Contact")}</h2>
        <div class="about-richtext">${about.contactBody || ""}</div>
      </div>
    </div>
  `;
}

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  if (currentPage === "home") app.innerHTML = renderHome();
  if (currentPage === "library") app.innerHTML = renderLibrary();
  if (currentPage === "sources") app.innerHTML = renderSources();
  if (currentPage === "about") app.innerHTML = renderAbout();
  if (currentPage === "record") app.innerHTML = renderRecord();
  bindEvents();
  renderBeyondDataMapModal();
  syncLibraryFilterBodyLock();
  window.dispatchEvent(new CustomEvent("archive-guide:surface-updated"));
}

let liveResults = [];
let liveStatus = {state:"idle", message:"", sources:[]};
/** Populated when the open-access aggregator returns notice copy (DOAB + external disclaimer). */
let openAccessNotices = null;
const LIVE_RESULT_CACHE = new Map();
/** Bump when discovery section shape or Semantic Scholar wiring changes (invalidates stale cache). */
const LIVE_RESULT_CACHE_VERSION = 6; // Fix source pickup + unified stream filtering
const LIVE_RESULT_CACHE_TTL_MS = 10 * 60 * 1000;
const TRANSIENT_RESULTS_BY_ID = new Map();

function createHandoffAdapter(id, label, trust) {
  return {
    id,
    label,
    trust,
    async search(query) {
      const normalized = String(query || "").trim();
      return normalized
        ? buildInstitutionalSearchLinks(normalized)
            .filter(item => item.liveSourceHint === id)
            .map(item => normalizeLiveRecord(item))
        : [];
    }
  };
}

const LIVE_SOURCE_ADAPTERS = [
  {
    id:"core",
    label:"CORE",
    trust:0.9,
    async search(query, options = {}) {
      const offset = Number(options.offset || 0);
      const limit = Number(options.limit || coreLimit);
      const emptyMeta = { count: null, nextOffset: null, nextCursor: null, displayedCount: 0 };
      try {
        const response = await fetchWithTimeout(
          `/api/core-search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
          { headers: { Accept: "application/json" } },
          9000,
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          return {
            items: [],
            error: data.detail || data.error || `CORE search failed (${response.status})`,
            meta: emptyMeta,
          };
        }
        if (data.partial) {
          console.warn("[LIVE] CORE returned partial results:", data.warning || "cluster under load");
        }
        const incomingHits = Number(data.count ?? data.totalHits ?? 0);
        if (incomingHits > 0) coreTotalHits = incomingHits;
        const items = Array.isArray(data.results) ? data.results : [];
        return {
          items,
          meta: {
            count: incomingHits || null,
            nextOffset: data.nextOffset ?? null,
            nextCursor: null,
            displayedCount: data.displayedCount ?? items.length,
          },
        };
      } catch (error) {
        const raw = String(error && error.message ? error.message : error);
        return {
          items: [],
          error: /failed to fetch|networkerror/i.test(raw)
            ? "CORE search could not reach the server — reload and try again."
            : raw || "CORE search failed",
          meta: emptyMeta,
        };
      }
    }
  },
  {
    id:"semantic-scholar",
    label:"Semantic Scholar",
    trust:0.88,
    async search(query, options = {}) {
      const offset = Number(options.offset || 0);
      const limit = Number(options.limit || DISCOVERY_PAGE_SIZE);
      const response = await fetchWithTimeout(
        `/api/search/semantic-scholar?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
        {},
        15000,
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        return {
          items: [],
          error: data.error || data.detail || `Semantic Scholar search failed (${response.status})`,
          meta: { count: null, nextOffset: null, nextCursor: null, displayedCount: 0 },
        };
      }
      const items = Array.isArray(data.results) ? data.results.map((entry) => normalizeLiveRecord(entry)) : [];
      const nextOffset = data.hasMore ? data.nextOffset : null;
      return {
        items,
        meta: {
          count: data.count ?? null,
          nextOffset,
          nextCursor: null,
          displayedCount: data.displayedCount ?? items.length,
        },
      };
    },
  },
  {
    id:"openAccess",
    label:"Open access & OER",
    trust:0.82,
    async search(query) {
      const response = await fetchWithTimeout(`/api/external-open-access?q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } }, 9000);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          items: [],
          sourceStatuses: [{ id: "external-open-access", label: "Open access API", state: "fail", message: `HTTP ${response.status}` }],
          notices: null,
          openAccessFetchFailed: true,
        };
      }
      const raw = Array.isArray(data.results) ? data.results : [];
      const items = raw.map((entry) => normalizeLiveRecord(entry));
      console.log("[EXTERNAL API RESULTS]", raw.length, items.slice(0, 2));
      return {
        items,
        meta: {
          count: items.length,
          nextOffset: items.length > DISCOVERY_PAGE_SIZE ? DISCOVERY_PAGE_SIZE : null,
          displayedCount: items.length,
        },
        sourceStatuses: Array.isArray(data.sourceStatuses) ? data.sourceStatuses : [],
        notices: data.notices || null,
      };
    }
  },
  createHandoffAdapter("britishmuseum", "British Museum", 0.74),
  createHandoffAdapter("unilever", "Unilever Archives", 0.72),
  createHandoffAdapter("uac", "United Africa Company", 0.78),
  createHandoffAdapter("britishlibrary", "British Library", 0.75),
  createHandoffAdapter("trove", "Trove", 0.73),
  createHandoffAdapter("googlebooks", "Google Books", 0.68),
  createHandoffAdapter("worldcat", "WorldCat", 0.76),
  createHandoffAdapter("nlsa", "National Library of South Africa", 0.78),
  createHandoffAdapter("ufh", "University of Fort Hare / ANC Archives", 0.8),
  createHandoffAdapter("nigeriaarchives", "National Archives of Nigeria", 0.7),
  createHandoffAdapter("zimbabwearchives", "National Archives of Zimbabwe", 0.7),
  createHandoffAdapter("ugandaarchives", "Uganda National Archives", 0.69),
  createHandoffAdapter("bodleian", "Bodleian / Rhodes House", 0.73),
  {
    id:"openlibrary",
    label:"Open Library",
    trust:0.92,
    async search(query, options = {}) {
      const offset = Number(options.offset || 0);
      const limit = Number(options.limit || DISCOVERY_PREVIEW_SIZE);
      const json = await fetchJsonWithTimeout(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
        {},
        5500,
      );
      const docs = Array.isArray(json.docs) ? json.docs : [];
      const total = Number(json.numFound || 0);
      const mapped = docs.map((doc, index) => normalizeLiveRecord({
        id:`live-openlibrary-${slugify((doc.key || doc.cover_edition_key || doc.title || query) + "-" + index)}`,
        title: doc.title || "Untitled record",
        creator: Array.isArray(doc.author_name) ? doc.author_name.join(", ") : (doc.author_name || "Unknown creator"),
        summary: doc.first_sentence ? stringifySentence(doc.first_sentence) : "",
        abstract: "",
        description:[
          doc.publisher && doc.publisher.length ? `Publishers: ${doc.publisher.slice(0, 3).join(", ")}.` : "",
          doc.subject && doc.subject.length ? `Subjects: ${doc.subject.slice(0, 6).join(", ")}.` : ""
        ].filter(Boolean),
        period: doc.first_publish_year ? String(doc.first_publish_year) : "",
        type:"Book",
        cat:"External books",
        region: inferRegionFromText([doc.place, doc.subject, doc.publisher].flat().filter(Boolean).join(" ")),
        country: inferCountryFromText([doc.place, doc.subject].flat().filter(Boolean).join(" ")),
        collection:"Open Library external discovery",
        institution:"Open Library",
        source:"Open Library",
        sourceUrl: doc.key ? `https://openlibrary.org${doc.key}` : `https://openlibrary.org/search?q=${encodeURIComponent(query)}`,
        sourceActionLabel:"View source record",
        externalLinks:[{label:"Open Library search", url:`https://openlibrary.org/search?q=${encodeURIComponent(query)}`}],
        language: uniqueValues((doc.language || []).map(code => mapLanguageCode(code))),
        tags: uniqueValues([...(doc.subject || []).slice(0, 6), ...(doc.person || []).slice(0, 2)]),
        concepts: inferConceptsFromText([doc.title, ...(doc.subject || [])].join(" ")),
        themes: inferThemesFromText([doc.title, ...(doc.subject || [])].join(" ")),
        images: buildOpenLibraryImages(doc),
        rights:"External source rights apply",
        provenance:"External metadata pulled from Open Library search.",
        citation: buildSimpleCitation(doc.title || "Untitled", Array.isArray(doc.author_name) ? doc.author_name.join(", ") : (doc.author_name || "Unknown creator"), doc.first_publish_year || "", "Open Library"),
        notes:["External-source record. Metadata completeness varies by source."],
        recordIdentifier: doc.key || doc.cover_edition_key || "",
        archiveIdentifier:`OL-${doc.cover_edition_key || doc.key || index}`,
        resultMode:"live",
        trustScore:0.92,
        liveSourceHint:"openlibrary"
      }));
      const nextOffset = total > offset + mapped.length ? offset + mapped.length : null;
      return {
        items: mapped,
        meta: { count: total || null, nextOffset, nextCursor: null, displayedCount: mapped.length },
      };
    }
  },
  {
    id:"crossref",
    label:"Crossref",
    trust:0.89,
    async search(query, options = {}) {
      const offset = Number(options.offset || 0);
      const rows = Number(options.limit || DISCOVERY_PAGE_SIZE);
      const params = new URLSearchParams({
        query:String(query || "").trim(),
        limit:String(rows),
        offset:String(offset)
      });
      const response = await fetchWithTimeout(`/api/search/crossref?${params.toString()}`, {headers:{Accept:"application/json"}}, 15000);
      const json = await response.json().catch(() => ({}));
      const rawItems = Array.isArray(json.results) ? json.results : [];
      if (!response.ok || (json.ok === false && !rawItems.length)) {
        const message = json?.error?.message || json?.error || `Crossref search failed (${response.status})`;
        return {
          items:[],
          error: /failed to fetch|networkerror/i.test(String(message))
            ? "Crossref search could not reach the server — reload and try again."
            : String(message),
          meta:{ count:null, nextOffset:null, nextCursor:null, displayedCount:0 },
        };
      }
      const mapped = rawItems.map(item => normalizeLiveRecord(item));
      return {
        items: mapped,
        meta: {
          count: json.count ?? null,
          nextOffset: json.hasMore ? json.nextOffset : null,
          nextCursor: null,
          displayedCount: json.displayedCount ?? mapped.length,
        },
      };
    }
  },
  {
    id:"library-of-congress",
    label:"Library of Congress",
    trust:0.9,
    async search(query, options = {}) {
      const offset = Number(options.offset || 0);
      const limit = Number(options.limit || DISCOVERY_PAGE_SIZE);
      const decolonialMode = options.decolonialMode ?? getDecolonialMode();
      const format = options.format || "all";
      const params = new URLSearchParams({
        q: String(query || "").trim(),
        limit: String(limit),
        offset: String(offset),
        format: String(format),
        decolonialMode: decolonialMode ? "true" : "false",
      });
      const response = await fetchWithTimeout(
        `/api/search/library-of-congress?${params.toString()}`,
        { headers: { Accept: "application/json" } },
        16000,
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        return {
          items: [],
          error: data.error || `Library of Congress search failed (${response.status})`,
          meta: { count: null, nextOffset: null, displayedCount: 0 },
        };
      }
      const items = Array.isArray(data.results) ? data.results.map((entry) => normalizeLiveRecord(entry)) : [];
      return {
        items,
        meta: {
          count: data.count ?? null,
          nextOffset: data.nextOffset ?? null,
          displayedCount: items.length,
        },
      };
    }
  },
  {
    id:"smithsonian",
    label:"Smithsonian",
    trust:0.88,
    async search(query, options = {}) {
      const offset = Number(options.offset || 0);
      const limit = Number(options.limit || DISCOVERY_PAGE_SIZE);
      const emptyMeta = { count: null, nextOffset: null, displayedCount: 0 };
      const smithsonianUrl = (media) =>
        `/api/search/smithsonian?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&media=${media}`;
      const fail = (message) => ({ items: [], error: message, meta: emptyMeta });
      const parsePayload = (response, data) => {
        if (!response.ok || data.ok === false) {
          return fail(data.error || `Smithsonian search failed (${response.status})`);
        }
        const items = Array.isArray(data.results)
          ? data.results.map((entry) => normalizeLiveRecord(entry))
          : [];
        const nextOffset = data.hasMore ? (data.nextOffset ?? data.nextStart ?? null) : null;
        return {
          items,
          meta: {
            count: data.count ?? null,
            nextOffset,
            displayedCount: data.displayedCount ?? items.length,
          },
        };
      };
      try {
        let response = await fetchWithTimeout(
          smithsonianUrl("all"),
          { headers: { Accept: "application/json" } },
          28000,
        );
        let data = await response.json().catch(() => ({}));
        let result = parsePayload(response, data);
        if (result.error && offset === 0) {
          response = await fetchWithTimeout(
            smithsonianUrl("image"),
            { headers: { Accept: "application/json" } },
            28000,
          );
          data = await response.json().catch(() => ({}));
          result = parsePayload(response, data);
        }
        return result.error ? result : result;
      } catch (error) {
        const raw = String(error && error.message ? error.message : error);
        if (error && error.name === "AbortError") {
          return fail("Smithsonian search timed out — try again.");
        }
        if (/failed to fetch|fetch failed|networkerror/i.test(raw)) {
          return fail(
            "Could not reach Smithsonian search. Ensure the app server is running, then reload.",
          );
        }
        return fail(raw || "Smithsonian search failed");
      }
    }
  },
  {
    id:"aodl",
    label:"AODL",
    trust:0.85,
    async search(query, options = {}) {
      const limit = Number(options.limit || 12);
      const response = await fetchWithTimeout(
        `/api/search/aodl?q=${encodeURIComponent(query)}&limit=${limit}`,
        { headers: { Accept: "application/json" } },
        9000,
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        return {
          items: [],
          error: data.error || "AODL search failed",
          meta: { count: null, nextOffset: null, displayedCount: 0 },
        };
      }
      const items = Array.isArray(data.results) ? data.results.map((entry) => normalizeLiveRecord(entry)) : [];
      return {
        items,
        meta: { count: data.count ?? items.length, nextOffset: null, displayedCount: items.length },
      };
    }
  },
  {
    id:"met",
    label:"The Met Collection",
    trust:0.88,
    async search(query, options = {}) {
      const idOffset = Number(options.idOffset || 0);
      const batchSize = Number(options.limit || 6);
      let allIds = Array.isArray(options.metIds) ? options.metIds : null;
      if (!allIds) {
        const searchJson = await fetchJsonWithTimeout(
          `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(query)}`,
          {},
          7000,
        );
        allIds = Array.isArray(searchJson.objectIDs) ? searchJson.objectIDs : [];
      }
      const ids = allIds.slice(idOffset, idOffset + batchSize);
      const settled = await Promise.allSettled(
        ids.map((id) =>
          fetchJsonWithTimeout(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`, {}, 7000),
        ),
      );
      const mapped = settled
        .filter((item) => item.status === "fulfilled")
        .map((item) => item.value)
        .map((obj, index) => normalizeLiveRecord({
        id:`live-met-${obj.objectID || index}`,
        title: obj.title || "Untitled object",
        creator: obj.artistDisplayName || obj.culture || "Metropolitan Museum of Art",
        summary: obj.objectName ? `${obj.objectName}${obj.period ? ` · ${obj.period}` : ""}.` : "External museum object from The Met.",
        abstract: obj.creditLine || "",
        description:[obj.medium ? `Medium: ${obj.medium}.` : "", obj.objectDate ? `Date: ${obj.objectDate}.` : "", obj.repository ? `Repository: ${obj.repository}.` : ""].filter(Boolean),
        period: obj.objectDate || obj.period || "",
        type: obj.objectName || "Artefact",
        cat:"External museum objects",
        region: inferRegionFromText([obj.culture, obj.region, obj.department, obj.title].filter(Boolean).join(" ")),
        country: inferCountryFromText([obj.culture, obj.region, obj.title].filter(Boolean).join(" ")),
        collection:"The Met external discovery",
        institution:"The Metropolitan Museum of Art",
        source:"The Met Collection API",
        sourceUrl: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${obj.objectID}`,
        public_domain: Boolean(obj.isPublicDomain),
        rights: obj.isPublicDomain ? "Public domain metadata from The Met Collection API." : "External source rights apply",
        rights_statement: obj.rightsAndReproduction || obj.creditLine || "",
        sourceActionLabel:"View museum record",
        externalLinks: [],
        language: [],
        tags: uniqueValues([obj.department, obj.objectName, obj.culture, obj.period].filter(Boolean)),
        concepts: inferConceptsFromText([obj.title, obj.objectName, obj.culture, obj.medium].filter(Boolean).join(" ")),
        themes: inferThemesFromText([obj.title, obj.objectName, obj.medium].filter(Boolean).join(" ")),
        images: buildMetImages(obj),
        rights:"External source rights apply",
        provenance:"External object metadata pulled from The Met Collection API.",
        citation: buildSimpleCitation(obj.title || "Untitled object", obj.artistDisplayName || obj.culture || "The Met", obj.objectDate || "", "The Met"),
        notes:["External-source museum object."],
        recordIdentifier: String(obj.objectID || ""),
        archiveIdentifier:`MET-${obj.objectID || index}`,
        resultMode:"live",
        trustScore:0.88,
        liveSourceHint:"met"
      }));
      const nextIdOffset = idOffset + ids.length;
      return {
        items: mapped,
        meta: {
          count: allIds.length || null,
          nextOffset: nextIdOffset < allIds.length ? nextIdOffset : null,
          metIds: allIds,
          displayedCount: mapped.length,
        },
      };
    }
  },
  {
    id:"wikimedia",
    label:"Wikimedia Commons",
    trust:0.78,
    async search(query, options = {}) {
      const offset = Number(options.offset || 0);
      const limit = Number(options.limit || DISCOVERY_PREVIEW_SIZE);
      const wikiResponse = await fetchWithTimeout(
        `/api/search/wikimedia?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
        { headers: { Accept: "application/json" } },
        12000,
      );
      const json = await wikiResponse.json().catch(() => ({}));
      if (!wikiResponse.ok || json.ok === false) {
        return {
          items: [],
          error: json.error || `Wikimedia search failed (${wikiResponse.status})`,
          meta: { count: null, nextOffset: null, displayedCount: 0 },
        };
      }
      const pages = Array.isArray(json.pages) ? json.pages : [];
      const mapped = pages.map((page, index) => {
        const ext = page.imageinfo?.[0]?.extmetadata || {};
        return normalizeLiveRecord({
        id:`live-wikimedia-${page.pageid || index}`,
        title: page.title ? page.title.replace(/^File:/, "") : "Untitled image",
        creator: ext.Artist?.value ? stripHtml(ext.Artist.value) : "Wikimedia Commons contributor",
        summary: ext.ImageDescription?.value ? stripHtml(ext.ImageDescription.value).slice(0, 320) : "External media record from Wikimedia Commons.",
        abstract: ext.ImageDescription?.value ? stripHtml(ext.ImageDescription.value) : "",
        description:[ext.LicenseShortName?.value ? `License: ${stripHtml(ext.LicenseShortName.value)}.` : ""].filter(Boolean),
        type:"Image",
        cat:"External images",
        region: inferRegionFromText(page.title || ""),
        country: inferCountryFromText(page.title || ""),
        collection:"Wikimedia Commons external discovery",
        institution:"Wikimedia Commons",
        source:"Wikimedia Commons",
        sourceUrl: page.fullurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || "")}`,
        licence: firstText(ext.LicenseShortName?.value, ext.License?.value),
        licence_url: firstText(ext.LicenseUrl?.value),
        rights: firstText(ext.UsageTerms?.value, ext.License?.value, ext.LicenseShortName?.value) || "External source rights apply",
        rights_statement: firstText(ext.UsageTerms?.value),
        extmetadata: ext,
        sourceActionLabel:"View media record",
        externalLinks: [],
        language: [],
        tags: uniqueValues((page.title || "").replace(/^File:/, "").split(/[_\s]+/).slice(0, 6)),
        concepts: inferConceptsFromText(page.title || ""),
        themes: inferThemesFromText(page.title || ""),
        images: buildWikimediaImages(page),
        rights:"External source rights apply",
        provenance:"External media metadata pulled from Wikimedia Commons.",
        citation: buildSimpleCitation(page.title ? page.title.replace(/^File:/, "") : "Untitled image", "Wikimedia Commons contributor", "", "Wikimedia Commons"),
        notes:["External-source image or media file."],
        recordIdentifier: String(page.pageid || ""),
        archiveIdentifier:`WC-${page.pageid || index}`,
        resultMode:"live",
        trustScore:0.78,
        liveSourceHint:"wikimedia"
        });
      });
      const hasMore = Boolean(json.continue?.gsroffset);
      return {
        items: mapped,
        meta: {
          count: null,
          nextOffset: hasMore ? Number(json.continue.gsroffset) : null,
          displayedCount: mapped.length,
        },
      };
    }
  },
  {
    id:"wikidata",
    label:"Wikidata",
    trust:0.84,
    async search(query, options = {}) {
      const offset = Number(options.offset || 0);
      const limit = Number(options.limit || DISCOVERY_PAGE_SIZE);
      const response = await fetchWithTimeout(
        `/api/search/wikidata?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
        {},
        9000,
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || data.detail || "Wikidata search failed");
      }
      const items = Array.isArray(data.results) ? data.results.map((entry) => normalizeLiveRecord(entry)) : [];
      const nextOffset = data.hasMore ? data.nextOffset : null;
      return {
        items,
        meta: {
          count: data.count ?? null,
          nextOffset,
          nextCursor: null,
          displayedCount: data.displayedCount ?? items.length,
        },
      };
    },
  },
  {
    id:"openalex",
    label:"OpenAlex",
    trust:0.86,
    async search(query, options = {}) {
      const cursor = options.cursor || "*";
      const limit = Number(options.limit || DISCOVERY_PAGE_SIZE);
      const emptyMeta = { count: null, nextCursor: null, nextOffset: null, displayedCount: 0 };
      try {
        const response = await fetchWithTimeout(
          `/api/openalex-search?q=${encodeURIComponent(query)}&limit=${limit}&cursor=${encodeURIComponent(cursor)}`,
          { headers: { Accept: "application/json" } },
          12000,
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          return {
            items: [],
            error: data.detail || data.error || `OpenAlex search failed (${response.status})`,
            meta: emptyMeta,
          };
        }
        const items = Array.isArray(data.results) ? data.results.map((entry) => normalizeLiveRecord(entry)) : [];
        return {
          items,
          meta: {
            count: data.count ?? null,
            nextCursor: data.nextCursor ?? null,
            nextOffset: null,
            displayedCount: data.displayedCount ?? items.length,
          },
        };
      } catch (error) {
        const raw = String(error && error.message ? error.message : error);
        return {
          items: [],
          error: /failed to fetch|networkerror/i.test(raw)
            ? "OpenAlex search could not reach the server — reload and try again."
            : raw || "OpenAlex search failed",
          meta: emptyMeta,
        };
      }
    }
  }
];

function stringifySentence(value){ if (typeof value === 'string') return value; if (Array.isArray(value)) return value.join(' '); if (value && typeof value === 'object') return Object.values(value).join(' '); return ''; }
function stripJats(value){ return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function stripHtml(value){ return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function decodeOpenAlexAbstract(index){ if (!index || typeof index !== 'object') return ''; const pairs = Object.entries(index).flatMap(([word, positions]) => Array.isArray(positions) ? positions.map(pos => [pos, word]) : []); return pairs.sort((a,b) => a[0]-b[0]).map(([,word]) => word).join(' '); }
function buildSimpleCitation(title, creator, year, source){ return [creator, year ? `(${year})` : '', title, source].filter(Boolean).join('. ') + '.'; }
function mapCrossrefType(value){ const map = { 'journal-article':'Journal article', book:'Book', 'book-chapter':'Book chapter', 'proceedings-article':'Proceedings paper', 'posted-content':'Preprint', report:'Report' }; return map[value] || 'Research paper'; }
function mapOpenAlexType(value){ const map = { article:'Journal article', book:'Book', book_chapter:'Book chapter', dissertation:'Dissertation', preprint:'Preprint', report:'Report', dataset:'Dataset', reference_entry:'Reference entry' }; return map[value] || 'Research paper'; }
function mapLocType(value){ const lower = foldText(value || ''); if (/photo|image|print/.test(lower)) return 'Image'; if (/manuscript/.test(lower)) return 'Manuscript'; if (/map/.test(lower)) return 'Map'; if (/book/.test(lower)) return 'Book'; if (/film|video|moving/.test(lower)) return 'Video'; if (/newspaper|article/.test(lower)) return 'Article'; return 'Cultural record'; }
function mapLanguageCode(code){ const map = { en:'English', fr:'French', ar:'Arabic', sw:'Swahili', yo:'Yoruba', pt:'Portuguese' }; return map[code] || code || ''; }
function inferRegionFromText(text){ const lower = foldText(text); if (/ghana|nigeria|benin|mali|senegal|yoruba|akan|ashanti/.test(lower)) return 'West Africa'; if (/kenya|tanzania|uganda|swahili|ethiopia|somalia/.test(lower)) return 'East Africa'; if (/south africa|zimbabwe|zulu|xhosa|ndebele/.test(lower)) return 'Southern Africa'; if (/diaspora|caribbean|latin america/.test(lower)) return 'Diaspora'; return 'Africa / Global'; }
function inferCountryFromText(text){ const lower = foldText(text); const pairs = [['ghana','Ghana'],['nigeria','Nigeria'],['kenya','Kenya'],['south africa','South Africa'],['mali','Mali'],['zimbabwe','Zimbabwe'],['tanzania','Tanzania']]; const hit = pairs.find(([needle]) => lower.includes(needle)); return hit ? hit[1] : ''; }
function inferConceptsFromText(text){ const lower = foldText(text); const concepts = []; if (/decolon|anti-colonial|colonial/.test(lower)) concepts.push('decolonisation'); if (/archive|manuscript|record/.test(lower)) concepts.push('archival recovery'); if (/indigenous|oral|ifa|ubuntu|sankofa/.test(lower)) concepts.push('indigenous epistemologies'); if (/design|textile|visual|poster|image/.test(lower)) concepts.push('visual sovereignty'); return uniqueValues(concepts); }
function inferThemesFromText(text){ const lower = foldText(text); const themes = []; if (/philosophy|thought|theory/.test(lower)) themes.push('African Philosophy'); if (/music|sound|recording/.test(lower)) themes.push('Music & Performance'); if (/education|pedagogy|curriculum/.test(lower)) themes.push('Design Pedagogy'); if (/archive|records|manuscript/.test(lower)) themes.push('Archival Recovery'); if (/textile|design|image|visual/.test(lower)) themes.push('Visual Sovereignty'); return uniqueValues(themes); }
function buildOpenLibraryImages(doc){ const cover = doc.cover_i || doc.cover_id; if (!cover) return []; return [{src:`https://covers.openlibrary.org/b/id/${cover}-L.jpg`, alt:doc.title || 'Cover image', caption:'Cover image from Open Library'}]; }
function buildLocImages(item){ const urls = Array.isArray(item.image_url) ? item.image_url.filter(Boolean) : []; return urls.slice(0,3).map((src, index) => ({src, alt:item.title || 'Library of Congress image', caption:index === 0 ? 'Media from the Library of Congress' : ''})); }
function buildMetImages(obj){ const images = []; if (obj.primaryImageSmall) images.push({src:obj.primaryImageSmall, alt:obj.title || 'Met collection image', caption:'Primary image from The Met'}); if (!images.length && obj.primaryImage) images.push({src:obj.primaryImage, alt:obj.title || 'Met collection image', caption:'Primary image from The Met'}); return images; }
function buildWikimediaImages(page){ const src = page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url; return src ? [{src, alt:(page.title || 'Wikimedia media').replace(/^File:/,''), caption:'Image from Wikimedia Commons'}] : []; }
function fetchWithTimeout(url, options = {}, timeout = 5500){ const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout); return fetch(url, {...options, signal:controller.signal}).finally(() => clearTimeout(timer)); }
async function fetchJsonWithTimeout(url, options = {}, timeout = 5500){ const response = await fetchWithTimeout(url, options, timeout); if (!response.ok) throw new Error(`Request failed: ${response.status}`); return response.json(); }
function normalizeLiveRecord(record){
  const rights = normalizeExternalRightsMetadata(record);
  const canUseMedia = rights.hasConfirmedReuseRights;
  const safeSourceUrl = rights.sourceUrl || safeUrl(record.sourceUrl);
  return ensureResultKind({ id: record.id, title: record.title || 'Untitled record', alternateTitle: record.alternateTitle || '', creator: record.creator || 'Unknown creator', contributors: listify(record.contributors), summary: record.summary || '', abstract: record.abstract || '', description: listify(record.description), region: record.region || 'Global / Comparative', country: record.country || '', community: record.community || '', period: record.period || '', concepts: uniqueValues(record.concepts || []), themes: uniqueValues(record.themes || []), tags: uniqueValues(record.tags || []), rights: record.rights || 'Check original source before reuse.', rightsStatus: rights.rightsStatus, licence: rights.licence, accessType: rights.accessType, reusePermission: record.reusePermission || (canUseMedia ? 'Check Original Source' : 'No Reuse Without Permission'), verificationStatus: rights.verificationStatus, culturalSensitivity: record.culturalSensitivity || 'Public', communityReviewStatus: record.communityReviewStatus || 'Not Required', provenance: record.provenance || '', source: record.source || 'External source', sourceName: record.sourceName || record.source || record.institution || 'External source', sourceType: record.sourceType || inferSourceType(record.source || record.institution || ''), cat: record.cat || 'External source results', type: record.type || 'External record', collection: record.collection || '', institution: record.institution || record.source || '', language: uniqueValues(record.language || []), sourceUrl: safeSourceUrl, sourceActionLabel: record.sourceActionLabel || 'View source', externalLinks: (record.externalLinks || []).filter(link => link && safeUrl(link.url)).map(link => ({label:link.label || 'Open link', url:safeUrl(link.url)})), sourcePathways: uniqueValues(record.sourcePathways || ['External source adapter']), notes: listify(record.notes), archiveIdentifier: record.archiveIdentifier || '', recordIdentifier: record.recordIdentifier || record.id, material: record.material || '', medium: record.medium || '', citation: record.citation || '', relatedRecords: listify(record.relatedRecords), images: canUseMedia ? (record.images || []).filter(image => safeUrl(image.src || image.url)).map(image => ({src:safeUrl(image.src || image.url), alt:image.alt || record.title, caption:image.caption || ''})) : [], resultMode: record.resultMode || 'live', resultKind: record.resultKind || '', trustScore: Number(record.trustScore || 0.75), liveSourceHint: record.liveSourceHint || '', rightsMetadataFound: rights.verificationStatus !== 'Unverified', externalRightsRow: record.externalRightsRow || null, sourceCategoryGroup: record.sourceCategoryGroup || '' });
}
function getRecordByIdAny(id){ return RECORDS_BY_ID.get(id) || TRANSIENT_RESULTS_BY_ID.get(id) || null; }
function resultModeLabel(mode){ return sourceOriginValue(mode); }
function getResultMode(record){ if (record.resultMode) return record.resultMode; if (record.source && record.source !== 'Local Bank' && record.source !== 'African Philosophy Working Library') return 'hybrid'; return 'local'; }

function buildInstitutionalSearchLinks(query){
  const normalized = (query || '').trim();
  const q = encodeURIComponent(normalized);
  if (!normalized) return [];
  const mk = (id, title, creator, summary, type, region, country, source, url, labels, hint, trust=0.72) => ({
    id:`handoff-${id}-${slugify(normalized)}`,
    title:`${title} for “${normalized}”`,
    creator,
    summary,
    abstract:`Dynamic external discovery pathway into ${title} results.`,
    description:['Search-ready institutional handoff generated from the active archive query.'],
    type,
    cat:'External source handoff',
    region,
    country,
    language:['English'],
    tags:[...labels,'handoff','Decolonising Knowledges'],
    concepts:inferConceptsFromText(`${title} ${normalized}`),
    themes:['Decolonising Knowledges', ...inferThemesFromText(`${title} ${normalized}`)],
    externalLinks:[{label:`Open ${title} search`, url}],
    source,
    sourceUrl:url,
    institution:creator,
    rights:'External source rights apply',
    provenance:'Dynamic external handoff generated from the active query.',
    citation:buildSimpleCitation(`${title} results for ${normalized}`, creator, '', source),
    recordIdentifier:`${id}-${slugify(normalized)}`,
    archiveIdentifier:`${id.toUpperCase()}-${slugify(normalized)}`,
    resultMode:'external_handoff',
    resultKind:'handoff',
    trustScore:trust,
    liveSourceHint:hint,
    notes:['This result is a handoff to the source institution or discovery service rather than a hosted local archive record.']
  });

  return [
    mk('britishmuseum','British Museum','British Museum','Search the British Museum collection for related objects, documentation, and collection records.','Museum / Collection Search','Global / Africa','United Kingdom','British Museum Collection Online',`https://www.britishmuseum.org/collection/search?keyword=${q}`,['British Museum','museum','collection'],'britishmuseum',0.74),
    mk('unilever','Unilever Archives','Unilever Archives','Search corporate archival records, image holdings, publicity materials, and historical documentation related to the query.','Archive Search','Global / Africa','United Kingdom','Unilever Archives',`https://archives-unilever.com/discover/search?q=${q}`,['Unilever Archives','corporate archive'],'unilever',0.72),
    {
      ...mk('uac','United Africa Company records','Unilever Archives / UK National Archives Discovery','Search United Africa Company records, commercial documentation, photographs, and related archival references.','Colonial Commercial Archive','West Africa / UK','United Kingdom','United Africa Company Archive Pathway',`https://archives-unilever.com/discover/search?q=${encodeURIComponent('United Africa Company ' + normalized)}`,['United Africa Company','UAC','colonial commerce','archive'],'uac',0.78),
      externalLinks:[
        {label:'Open UAC search in Unilever Archives', url:`https://archives-unilever.com/discover/search?q=${encodeURIComponent('United Africa Company ' + normalized)}`},
        {label:'Open UAC search in UK National Archives', url:`https://discovery.nationalarchives.gov.uk/results/r?_q=${encodeURIComponent('United Africa Company ' + normalized)}`}
      ]
    },
    mk('britishlibrary','British Library','British Library','Search library holdings, manuscripts, newspapers, maps, sound, and archives relevant to the query.','Library Search','Global / Africa / Asia','United Kingdom','British Library',`https://explore.bl.uk/primo_library/libweb/action/search.do?fn=search&ct=search&vl(freeText0)=${q}`,['British Library','books','manuscripts','archives'],'britishlibrary',0.75),
    mk('trove','Trove','National Library of Australia','Search books, newspapers, images, archives, and digitised records related to the query.','Library / Discovery Search','Australia / Global','Australia','Trove',`https://trove.nla.gov.au/search?keyword=${q}`,['Trove','newspapers','books','archives'],'trove',0.73),
    mk('smithsonian','Smithsonian','Smithsonian Institution','Search collections, images, objects, and documentation related to the query.','Museum / Collection Search','Global / Africa / Diaspora','United States','Smithsonian Open Access / Collections Search',`https://www.si.edu/search?edan_q=${q}`,['Smithsonian','museum','objects','images'],'smithsonian',0.74),
    mk('googlebooks','Google Books','Google Books','Search global book metadata, previews, and bibliographic references related to the query.','Book Search','Global','United States','Google Books',`https://books.google.com/books?q=${q}`,['Google Books','books','bibliography'],'googlebooks',0.68),
    mk('worldcat','WorldCat','WorldCat','Search global library holdings for books, theses, audiovisual works, and archival materials related to the query.','Union Catalogue Search','Global','Global','WorldCat',`https://search.worldcat.org/search?q=${q}`,['WorldCat','library','catalogue','theses'],'worldcat',0.76),
    mk('nlsa','National Library of South Africa','National Library of South Africa','Search South African documentary heritage, books, manuscripts, and special collections related to the query.','National Library Search','Southern Africa','South Africa','National Library of South Africa',`https://www.nlsa.ac.za/search/node/${q}`,['South Africa','library','manuscripts'],'nlsa',0.78),
    mk('ufh','University of Fort Hare / ANC Archives','University of Fort Hare','Search liberation struggle records and ANC-related archival holdings linked to the query.','Liberation Archive Search','Southern Africa','South Africa','University of Fort Hare / ANC Archives',`https://www.ufh.ac.za/search/node/${q}`,['ANC','liberation','archive'],'ufh',0.8),
    mk('nigeriaarchives','National Archives of Nigeria','National Archives of Nigeria','Search pathways into Nigerian archival and documentary holdings related to the query.','Archive Pathway','West Africa','Nigeria','National Archives of Nigeria Pathway',`https://www.google.com/search?q=site%3Anationalarchives.gov.ng+${q}`,['Nigeria','archive','documents'],'nigeriaarchives',0.7),
    mk('zimbabwearchives','National Archives of Zimbabwe','National Archives of Zimbabwe','Search pathways into Zimbabwean archival and documentary heritage records related to the query.','Archive Pathway','Southern Africa','Zimbabwe','National Archives of Zimbabwe Pathway',`https://www.google.com/search?q=site%3Aarchives.gov.zw+${q}`,['Zimbabwe','archive','documents'],'zimbabwearchives',0.7),
    mk('ugandaarchives','Uganda National Archives','Uganda National Archives','Search pathways into Ugandan archival and documentary collections related to the query.','Archive Pathway','East Africa','Uganda','Uganda National Archives Pathway',`https://www.google.com/search?q=site%3Anationalarchives.go.ug+${q}`,['Uganda','archive','documents'],'ugandaarchives',0.69),
    mk('bodleian','Bodleian / Rhodes House African Studies','Bodleian Libraries / Rhodes House','Search African studies archives, manuscripts, photographs, and colonial records related to the query.','Research Archive Search','Africa / UK','United Kingdom','Bodleian / Rhodes House African Studies Pathway',`https://solo.bodleian.ox.ac.uk/discovery/search?query=any,contains,${q}`,['Bodleian','Rhodes House','African studies'],'bodleian',0.73)
  ];
}

function makeExternalFallbacks(query){ return buildExternalDiscovery(query).map((source, index) => normalizeLiveRecord({ id:`handoff-${slugify(source.name + '-' + query + '-' + index)}`, title:`Search ${source.name}`, creator: source.region || 'External archive', summary: source.desc, abstract: `No strong local match was found, so this handoff opens ${source.name} directly for broader archive discovery.`, description:[source.desc], type:'External handoff', cat:'External source pathways', region: source.region || 'Global', collection:'External Source Handoffs', institution: source.name, source: source.name, sourceUrl: source.actionUrl, sourceActionLabel: source.actionLabel || 'Open source', externalLinks: source.url && source.url !== source.actionUrl ? [{label:'Source home', url:source.url}] : [], notes:['This result is a handoff to the source institution or discovery service rather than a hosted local archive record.'], sourcePathways:['Source handoff router', source.name], resultMode:'external_handoff', resultKind:'collection', trustScore:0.55, liveSourceHint:'handoff' })); }
function scoreBlendedResult(record, query){
  const context = buildQueryContext(query);
  const base = scoreRecord(record, context);
  const mode = getResultMode(record);
  const modeBonus = {local:6, hybrid:4, live:2, external_handoff:0}[mode] || 0;
  const descriptionText = Array.isArray(record.description)
    ? record.description.join(' ')
    : (record.description || '');
  const completeness = [
    record.abstract,
    record.summary,
    descriptionText,
    (record.images || []).length ? 'img' : ''
  ].filter(Boolean).length * 2;
  return base + modeBonus + completeness + Math.round((record.trustScore || 0) * 6);
}
function dedupeBlendedResults(items, query){ const seen = new Map(); const ranked = items.filter(Boolean).map(item => ({item, score: scoreBlendedResult(item, query || libraryQuery)})).sort((a,b) => b.score - a.score || a.item.title.localeCompare(b.item.title)); for (const entry of ranked){ const key = normalizeComparable([entry.item.title, entry.item.creator, entry.item.period].join(' ')); if (!seen.has(key)) seen.set(key, entry); } return [...seen.values()].map(entry => entry.item); }
function getSelectedLiveSourceAdapters() {
  if (!sourceMode) return [];
  const selected = new Set(advancedSearchState.sources || []);
  const wantIds = new Set();

  for (const id of ALWAYS_ON_LIVE_ADAPTER_IDS) wantIds.add(id);
  for (const id of PREVIEW_ADAPTER_IDS) wantIds.add(id);

  const primaryExplicit = PRIMARY_LIVE_ADAPTER_IDS.filter((id) => selected.has(id));
  const primaryIds = primaryExplicit.length ? primaryExplicit : PRIMARY_LIVE_ADAPTER_IDS;
  const optionalIds = OPTIONAL_LIVE_ADAPTER_IDS.filter((id) => selected.has(id));

  for (const id of primaryIds) wantIds.add(id);
  for (const id of optionalIds) wantIds.add(id);
  for (const id of HANDOFF_ADAPTER_IDS) {
    if (selected.has(id)) wantIds.add(id);
  }

  return LIVE_SOURCE_ADAPTERS.filter((adapter) => wantIds.has(adapter.id));
}
function normalizeAdapterResult(value) {
  if (Array.isArray(value)) {
    return {
      items: value,
      meta: null,
      sourceStatuses: [],
      notices: null,
      openAccessFetchFailed: false,
      adapterError: null,
    };
  }
  if (value && typeof value === "object" && Array.isArray(value.items)) {
    return {
      items: value.items,
      meta: value.meta || null,
      sourceStatuses: Array.isArray(value.sourceStatuses) ? value.sourceStatuses : [],
      notices: value.notices || null,
      openAccessFetchFailed: Boolean(value.openAccessFetchFailed),
      adapterError: value.error ? String(value.error) : null,
    };
  }
  return {
    items: [],
    meta: null,
    sourceStatuses: [],
    notices: null,
    openAccessFetchFailed: false,
    adapterError: null,
  };
}

function buildLiveStatusesFromDiscoverySections() {
  return LIVE_SOURCE_ADAPTERS.map((adapter) => {
    const sectionId = mapAdapterIdToDiscoverySection(adapter.id);
    const section = discoverySections[sectionId];
    if (section?.state === "error") {
      return {
        label: adapter.label,
        state: "fail",
        count: 0,
        detail: section.error || "unavailable",
      };
    }
    const count = section?.displayedCount || 0;
    return {
      label: adapter.label,
      state: count > 0 ? "ok" : section?.state === "loading" ? "loading" : "empty",
      count,
    };
  });
}
async function fetchLiveResults(query){
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  console.log('[LIVE] fetchLiveResults start', { query: normalizedQuery });
  if (LIVE_RESULT_CACHE.has(normalizedQuery)) {
    const cached = LIVE_RESULT_CACHE.get(normalizedQuery);
    const cacheFresh =
      typeof cached?.cachedAt === "number" &&
      Date.now() - cached.cachedAt < LIVE_RESULT_CACHE_TTL_MS;
    const cacheValid =
      cacheFresh &&
      cached?.version === LIVE_RESULT_CACHE_VERSION &&
      (!cached?.sections?.["semantic-scholar"] ||
        cached.sections["semantic-scholar"].state !== "error" ||
        (cached.sections["semantic-scholar"].displayedCount || 0) > 0);
    if (cacheValid) {
      console.log("[LIVE] cache hit", normalizedQuery);
      if (cached?.sections) {
        discoverySections = cached.sections;
        syncLiveResultsFromDiscoverySections();
      } else {
        liveResults = Array.isArray(cached) ? cached : [];
        externalDiscovery = safeArray(liveResults).filter((item) => getResultMode(item) === "external_handoff");
      }
      const totalDisplayed = DISCOVERY_SECTION_ORDER.reduce(
        (sum, id) => sum + (discoverySections[id]?.displayedCount || 0),
        0,
      );
      liveStatus = {
        state: "done",
        message: totalDisplayed
          ? `Showing ${totalDisplayed} external discovery result${totalDisplayed === 1 ? "" : "s"} for “${normalizedQuery}”.`
          : "",
        sources: buildLiveStatusesFromDiscoverySections(),
        openAccessWarning: "",
      };
      render();
      return liveResults;
    }
    LIVE_RESULT_CACHE.delete(normalizedQuery);
  }

  resetDiscoverySections();
  openAccessNotices = null;
  const activeAdapters = getSelectedLiveSourceAdapters();
  const statuses = activeAdapters.map((adapter) => ({ label: adapter.label, state: "loading" }));
  let openAccessWarning = "";
  const fallbacks = makeExternalFallbacks(normalizedQuery);
  fallbacks.forEach((item) => TRANSIENT_RESULTS_BY_ID.set(item.id, normalizeLiveRecord(item)));
  applyDiscoverySection("handoffs", {
    results: fallbacks,
    count: fallbacks.length,
    state: fallbacks.length ? "done" : "empty",
    error: null,
  });

  fetchLiveResults._token = (fetchLiveResults._token || 0) + 1;
  const token = fetchLiveResults._token;
  const stillCurrent = () =>
    token === fetchLiveResults._token && getEffectiveSearchQuery().trim() === normalizedQuery;

  const publishProgress = (finalised = false) => {
    if (!stillCurrent()) return;
    syncLiveResultsFromDiscoverySections();
    const totalDisplayed = DISCOVERY_SECTION_ORDER.reduce(
      (sum, id) => sum + (discoverySections[id]?.displayedCount || 0),
      0,
    );
    liveStatus = {
      state: finalised ? "done" : "loading",
      message: finalised
        ? totalDisplayed
          ? `Showing ${totalDisplayed} external discovery result${totalDisplayed === 1 ? "" : "s"} for “${normalizedQuery}”.`
          : `External source discovery could not return direct records for “${normalizedQuery}”, so source handoffs are shown instead.`
        : `Searching external sources for “${normalizedQuery}”…`,
      sources: finalised ? buildLiveStatusesFromDiscoverySections() : statuses.slice(),
      openAccessWarning,
    };
    render();
  };

  publishProgress(false);

  const tasks = activeAdapters.map((adapter, index) => {
    return Promise.resolve()
      .then(() => adapter.search(normalizedQuery))
      .then((value) => {
        if (!stillCurrent()) return;
        const { items, meta, sourceStatuses, notices, openAccessFetchFailed, adapterError } =
          normalizeAdapterResult(value);
        const sectionId = mapAdapterIdToDiscoverySection(adapter.id);
        items.forEach((item) => TRANSIENT_RESULTS_BY_ID.set(item.id, normalizeLiveRecord(item)));

        if (adapterError && sectionId !== "previews" && sectionId !== "handoffs" && sectionId !== "smithsonianCollections") {
          applyDiscoverySection(sectionId, {
            state: "error",
            error: adapterError,
          });
          statuses[index] = {
            label: adapter.label,
            state: isSourceDiagnosticsEnabled() ? "fail" : "skipped",
            count: 0,
            detail: adapterError,
          };
          console.warn("[LIVE] adapter error", { adapter: adapter.label, error: adapterError });
          publishProgress(false);
          return;
        }

        if (sectionId === "previews" || sectionId === "handoffs") {
          const existing = discoverySections[sectionId]?.results || [];
          let previewPagination = discoverySections[sectionId]?.previewPagination || {};
          if (sectionId === "previews") {
            previewPagination = {
              ...previewPagination,
              [adapter.id]: {
                offset: meta?.nextOffset ?? null,
                page: meta?.page ?? previewPagination[adapter.id]?.page ?? 1,
                idOffset: adapter.id === "met" ? meta?.nextOffset ?? 0 : previewPagination[adapter.id]?.idOffset,
                metIds: meta?.metIds || previewPagination[adapter.id]?.metIds,
                hasMore: meta?.nextOffset != null,
              },
            };
          }
          applyDiscoverySection(sectionId, {
            results: [...existing, ...items],
            previewPagination: sectionId === "previews" ? previewPagination : undefined,
            metObjectIds: meta?.metIds || discoverySections.previews?.metObjectIds,
            count: null,
            nextCursor: null,
            nextOffset: null,
            state: items.length ? "done" : discoverySections[sectionId]?.state || "empty",
            error: null,
          });
        } else {
          applyDiscoverySection(sectionId, {
            results: items,
            count: meta?.count ?? (items.length || null),
            nextCursor: meta?.nextCursor ?? null,
            nextOffset: meta?.nextOffset ?? null,
            state: items.length ? "done" : "empty",
            error: null,
          });
        }

        statuses[index] = {
          label: adapter.label,
          state: items.length ? "ok" : "empty",
          count: items.length,
        };

        if (adapter.id === "openAccess") {
          if (notices) openAccessNotices = notices;
          if (Array.isArray(sourceStatuses)) {
            sourceStatuses.forEach((s) => {
              const st =
                s.state === "fail"
                  ? "fail"
                  : s.state === "skipped" || s.state === "unavailable"
                    ? "fail"
                    : typeof s.count === "number" && s.count > 0
                      ? "ok"
                      : "empty";
              statuses.push({
                label: s.label || s.id || "Source",
                state: st,
                count: typeof s.count === "number" ? s.count : undefined,
              });
            });
          }
          if (openAccessFetchFailed) {
            openAccessWarning = "The /api/external-open-access request failed (network or HTTP error).";
          } else if (
            !items.length &&
            Array.isArray(sourceStatuses) &&
            sourceStatuses.some((s) => s.state === "fail" || s.state === "unavailable")
          ) {
            const detail = sourceStatuses
              .map((s) => [s.label || s.id, s.message || s.state].filter(Boolean).join(": "))
              .filter(Boolean)
              .join(" · ");
            openAccessWarning = detail || "External open-access search failed or returned no records.";
          }
        }
        console.log("[LIVE] adapter resolved", { adapter: adapter.label, count: items.length, sectionId });
        publishProgress(false);
      })
      .catch((error) => {
        if (!stillCurrent()) return;
        console.warn("[LIVE] adapter failed", { adapter: adapter.label, error: String(error) });
        const failMessage = String(error && error.message ? error.message : error);
        statuses[index] = { label: adapter.label, state: isSourceDiagnosticsEnabled() ? "fail" : "skipped", count: 0, detail: failMessage };
        const sectionId = mapAdapterIdToDiscoverySection(adapter.id);
        if (sectionId !== "handoffs" && sectionId !== "previews") {
          applyDiscoverySection(sectionId, {
            state: "error",
            error: failMessage,
          });
        }
        if (adapter.id === "openAccess" && !openAccessWarning) {
          openAccessWarning = `Open access aggregation failed: ${String(error && error.message ? error.message : error)}`;
        }
        publishProgress(false);
      });
  });

  await Promise.allSettled(tasks);
  if (!stillCurrent()) return liveResults;

  console.log("[LIVE] discovery sections complete", {
    openalex: discoverySections.openalex?.displayedCount,
    core: discoverySections.core?.displayedCount,
    crossref: discoverySections.crossref?.displayedCount,
  });
  LIVE_RESULT_CACHE.set(normalizedQuery, {
    version: LIVE_RESULT_CACHE_VERSION,
    cachedAt: Date.now(),
    sections: JSON.parse(JSON.stringify(discoverySections)),
    liveResults: liveResults.slice(),
  });
  publishProgress(true);
  return liveResults;
}
function maybeFetchLiveResults(query){
  const normalizedQuery = query.trim();
  console.log('[LIVE] maybeFetchLiveResults', { normalizedQuery, sourceMode });
  if (!sourceMode || !normalizedQuery) return Promise.resolve([]);
  // fetchLiveResults() now drives liveResults / externalDiscovery / liveStatus
  // and calls render() itself as each adapter resolves — we just await and
  // return the final combined set.
  const startMs = Date.now();
  return fetchLiveResults(normalizedQuery).then(results => {
    console.log('[LIVE] maybeFetchLiveResults success', { count: results.length });
    // Log completed search with result counts
    if (typeof window.__logArchiveEvent === 'function') {
      window.__logArchiveEvent({
        eventType: 'search_completed',
        area: 'library',
        query: normalizedQuery,
        sourceScope: 'all_sources',
        resultCount: results.length + localResults.length,
        externalResultCount: results.length,
        localResultCount: localResults.length,
        durationMs: Date.now() - startMs,
        status: 'success',
      });
    }
    return results;
  }).catch(error => {
    console.warn('[LIVE] maybeFetchLiveResults failed', error);
    if (typeof window.__logArchiveEvent === 'function') {
      window.__logArchiveEvent({
        eventType: 'search_failed',
        area: 'library',
        query: normalizedQuery,
        sourceScope: 'all_sources',
        durationMs: Date.now() - startMs,
        status: 'failed',
        errorMessage: String(error && error.message ? error.message : error),
      });
    }
    liveStatus = {
      state: 'error',
      message: 'External source discovery failed. Archive records are still available.',
      openAccessWarning: String(error && error.message ? error.message : error),
      sources: getSelectedLiveSourceAdapters().map(adapter => ({ label: adapter.label, state: 'fail' }))
    };
    liveResults = makeExternalFallbacks(normalizedQuery);
    externalDiscovery = safeArray(liveResults).filter(item => getResultMode(item) === 'external_handoff');
    render();
    return liveResults;
  });
}

function isSeriousRightsIssue(record) {
  const adminText = String(record.adminNotes || record.copyrightNote || "").toLowerCase();
  return record.rightsStatus === "Takedown Requested" ||
    record.communityReviewStatus === "Do Not Publish" ||
    record.verificationStatus === "Copyright Risk" ||
    record.verificationStatus === "Takedown Requested" ||
    record.culturalSensitivity === "Takedown / Review Requested" ||
    adminText.includes("copyright risk");
}

function isSensitiveRecord(record) {
  return record.culturalSensitivity === "Restricted" ||
    record.culturalSensitivity === "Do Not Display Media" ||
    record.culturalSensitivity === "Community Review Needed" ||
    record.rightsStatus === "Restricted / Sensitive";
}

function isRightsLimited(record) {
  return record.rightsStatus === "In Copyright" ||
    record.rightsStatus === "Rights Unknown" ||
    record.rightsStatus === "Restricted / Sensitive" ||
    record.rightsStatus === "Check source" ||
    record.accessType === "Metadata Only" ||
    record.accessType === "External Link Only";
}

function metadataDisplayValue(value) {
  const map = {
    "In Copyright":"In copyright",
    "External Link Only":"External link only",
    "Full Text Available":"Full text available",
    "Download Available":"Download available",
    "Read Online":"Read online",
    "Metadata Only":"Metadata only",
    "Restricted Access":"Restricted access",
    "Requires Permission":"Requires permission",
    "Check Source":"Check source",
    "Source Checked":"Source checked",
    "Rights Checked":"Rights checked",
    "External Source":"External source",
    "Rights Unknown":"Rights unknown"
  };
  return map[value] || value || "";
}

function getCardTrustState(record) {
  if (isSeriousRightsIssue(record)) return "danger";
  if (isSensitiveRecord(record)) return "sensitive";
  if (record.rightsStatus === "Open Access" || record.rightsStatus === "Public Domain" || record.rightsStatus === "Creative Commons") return "open";
  return "neutral";
}

function isPositiveRightsStatus(status) {
  const s = String(status || "").trim();
  return s === "Open Access" || s === "Public Domain" || s === "Creative Commons";
}

function isPositiveAccessStatus(status) {
  const s = String(status || "").trim();
  return s === "Full Text Available" || s === "Download Available" || s === "Read Online";
}

function isPositiveReviewStatus(status) {
  const s = String(status || "").trim();
  return s === "Source Checked" || s === "Rights Checked" || s === "Verified" ||
    s === "Metadata Reviewed" ||
    s === "Source checked" || s === "Rights checked" || /^verified\b/i.test(s);
}

function displayCardRecordType(record) {
  const raw = String(record.type || "Record").trim();
  if (/^live$/i.test(raw)) return "External record";
  return raw || "Record";
}

function renderCardRightsBlock(record) {
  // Resolve the short summary triplet (Rights · Access · Review). Prefer an
  // explicit externalRightsRow when present, otherwise fall back to record fields.
  const er = record.externalRightsRow || {};
  const rightsRaw = er.rights || record.rightsStatus || "";
  const accessRaw = er.access || record.accessType || "";
  const reviewRaw = er.review || record.verificationStatus || "";
  const mode = getResultMode(record);

  const rights = rightsRaw && rightsRaw !== "Rights Unknown"
    ? metadataDisplayValue(rightsRaw)
    : "Check source";
  const access = accessRaw
    ? metadataDisplayValue(accessRaw)
    : (record.sourceUrl ? "External link only" : "Metadata only");
  let review = reviewRaw ? metadataDisplayValue(reviewRaw) : "Unverified";
  if (!reviewRaw && mode === "external_handoff") review = "Unverified";

  const licenceLabel = record.licence && record.licence !== "Check source"
    ? metadataDisplayValue(record.licence)
    : "";
  const sensitive = isSensitiveRecord(record);
  const trustState = getCardTrustState(record);

  // Truncate long summary chunks so the chip stays one row
  const truncate = (value, max) => {
    const str = String(value || "");
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
  };
  const summaryBits = [
    truncate(rights, 32),
    truncate(access, 32),
    truncate(review, 28)
  ];
  if (sensitive) summaryBits.push("Media hidden");
  const summary = summaryBits.filter(Boolean).join(" · ");

  // Full long-form panel rows
  const rowsHtml = [
    ["Rights status", rights],
    ["Rights statement", record.rights || ""],
    licenceLabel ? ["Licence", licenceLabel] : null,
    ["Access", access],
    ["Review", review],
    record.reusePermission ? ["Reuse permission", record.reusePermission] : null,
    record.culturalSensitivity ? ["Cultural sensitivity", record.culturalSensitivity] : null,
    sensitive
      ? ["Media", "Hidden — metadata shown for discovery under cultural or rights protocol."]
      : null,
    record.communityReviewStatus ? ["Community review", record.communityReviewStatus] : null,
    record.provenance ? ["Provenance", record.provenance] : null,
    record.sourceName ? ["Source", record.sourceName] : null
  ]
    .filter(Boolean)
    .filter(([, value]) => value && String(value).trim() !== "")
    .map(([label, value]) => `<div class="record-rights-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");

  const panelId = `rights-panel-${record.id}`;
  const stateClass = sensitive ? "is-sensitive" : `is-${trustState}`;

  if (trustState === "danger") {
    return `<div class="record-rights-compact is-danger" data-stop-card-open="true">
      <div class="record-rights-headline">Review required before publish or reuse.</div>
      <button type="button" class="record-rights-toggle" data-rights-toggle aria-expanded="false" aria-controls="${escapeHtml(panelId)}">
        <span class="record-rights-label">Rights &amp; access</span>
        <span class="record-rights-summary">${escapeHtml(summary)}</span>
        <span class="record-rights-chevron" aria-hidden="true">▾</span>
      </button>
      <div class="record-rights-panel" id="${escapeHtml(panelId)}" hidden>
        <dl class="record-rights-dl">${rowsHtml}</dl>
      </div>
    </div>`;
  }

  return `<div class="record-rights-compact ${stateClass}" data-stop-card-open="true">
    <button type="button" class="record-rights-toggle" data-rights-toggle aria-expanded="false" aria-controls="${escapeHtml(panelId)}">
      <span class="record-rights-label">Rights &amp; access</span>
      <span class="record-rights-summary">${escapeHtml(summary)}</span>
      <span class="record-rights-chevron" aria-hidden="true">▾</span>
    </button>
    <div class="record-rights-panel" id="${escapeHtml(panelId)}" hidden>
      <dl class="record-rights-dl">${rowsHtml}</dl>
    </div>
  </div>`;
}

function renderCardChips(record) {
  const knowledgePrimary = (record.knowledgeAreas || record.themes || record.concepts || [])[0] || record.cat;
  const ordered = [];
  if (record.region) ordered.push(record.region);
  if (knowledgePrimary) ordered.push(knowledgePrimary);
  const shown = ordered.slice(0, 2);
  const pool = uniqueValues([
    record.region,
    record.country,
    knowledgePrimary,
    record.community,
    record.collection,
    ...(record.concepts || []),
    ...(record.knowledgeAreas || record.themes || []),
    record.material,
    record.medium
  ].filter(Boolean));
  const shownSet = new Set(shown);
  const extraCount = pool.filter(value => !shownSet.has(value)).length;
  if (!shown.length && !extraCount) return "";
  return `<div class="record-card-chips card-tags">
    ${shown.map(value => `<span class="kchip">${escapeHtml(value)}</span>`).join('<span class="kchip-dot" aria-hidden="true">·</span>')}
    ${extraCount ? `<span class="kchip-dot" aria-hidden="true">·</span><span class="kchip is-more">+${extraCount} more</span>` : ""}
  </div>`;
}

function recordHasDisplayableImage(record) {
  if (isSensitiveRecord(record) || isSeriousRightsIssue(record)) return false;
  if (!canDisplayMedia(record)) return false;
  const leadImage = getLeadImage(record);
  return Boolean(leadImage && leadImage.src);
}

function renderRecordCardMediaHero(record, labels = {}) {
  if (!recordHasDisplayableImage(record)) return "";
  const leadImage = getLeadImage(record);
  const src = escapeHtml(leadImage.src);
  const recordTypeLabel = labels.recordTypeLabel || escapeHtml(displayCardRecordType(record).toUpperCase());
  const streamOrigin = labels.streamOrigin || libraryStreamOriginLabel(record);
  const streamOriginClass = labels.streamOriginClass || libraryStreamOriginClass(record);
  return `<div class="record-card-media has-image" aria-hidden="false">
    <div class="record-card-media-pills">
      <span class="record-card-pill type-pill">${recordTypeLabel}</span>
      <span class="record-card-pill source-pill ${streamOriginClass}">${escapeHtml(streamOrigin)}</span>
    </div>
    <figure class="record-card-media-frame">
      <img src="${src}" alt="${escapeHtml(leadImage.alt || record.title || "Cover")}" loading="lazy" decoding="async" />
    </figure>
    <div class="record-card-media-fade" aria-hidden="true"></div>
  </div>`;
}

function renderRecordCardThumbStack(record) {
  return "";
}

function renderExpandedMetadataDrawer(record) {
  const rows = [
    ["Record Type", record.type],
    ["Knowledge Area", (record.knowledgeAreas || record.themes || record.concepts || [])[0] || record.cat],
    ["Region", record.region],
    ["Country", record.country],
    ["Community / Cultural Group", record.community],
    ["Language", Array.isArray(record.language) ? record.language.join(", ") : record.language],
    ["Script", Array.isArray(record.script) ? record.script.join(", ") : record.script],
    ["Rights Status", record.rightsStatus],
    ["Licence", record.licence],
    ["Access Type", record.accessType],
    ["Verification Status", record.verificationStatus],
    ["Source Name", record.sourceName || record.institution || record.source],
    ["Date Accessed", record.dateAccessed],
    ["Citation", record.citation]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

  if (!rows.length) return "";

  return `<dl class="record-card-drawer-grid">
    ${rows.map(([label, value]) => `<div class="record-card-drawer-row">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>`).join("")}
  </dl>`;
}


function renderRecordMediaBadge(record) {
  const mediaTypes = Array.isArray(record.mediaTypes) ? record.mediaTypes : [];
  const typeText = String(record.type || mediaTypes[0] || "").trim();
  if (!typeText) return "";
  return `<span class="record-card-media-badge" aria-label="Media type">${escapeHtml(typeText)}</span>`;
}

function renderRecordMediaIndicators(record) {
  const bits = [];
  if (record.videoUrl) bits.push("Video");
  if (record.audioUrl) bits.push("Audio");
  if ((record.images || []).length || record.imageUrl) bits.push("Image");
  if (!bits.length) return "";
  return `<div class="record-card-media-indicators" aria-label="Available media">${bits.map((bit) => `<span>${escapeHtml(bit)}</span>`).join("")}</div>`;
}


function truncateCardSummary(text, max = 220) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${base.trim()}…`;
}

function getRecordCardSummary(record) {
  const abstract = String(record.abstract || "").trim();
  if (abstract) return truncateCardSummary(abstract);
  const summary = String(record.summary || "").trim();
  if (summary && summary.length > 48 && !/^venue:/i.test(summary)) return truncateCardSummary(summary);
  const description = Array.isArray(record.description)
    ? record.description.join(" ")
    : String(record.description || "").trim();
  if (description && description.length > 48 && !/^venue:/i.test(description)) return truncateCardSummary(description);
  const isLiveExternal =
    getResultMode(record) === "live" || String(record.id || "").startsWith("live-");
  if (isLiveExternal) {
    const byline = record.creator ? ` By ${record.creator}.` : "";
    return truncateCardSummary(
      `${record.title || "Scholarly record"}.${byline} External metadata — open the original source for the full text.`,
    );
  }
  return truncateCardSummary(summary || description || "Open the record for more detail.");
}

const BEYOND_LABEL_LAYERS = [
  { id:"archive", label:"The archive says" },
  { id:"label", label:"Question the label" },
  { id:"absence", label:"Trace what the data cannot hold" },
  { id:"position", label:"Read from another position" },
  { id:"search", label:"Search against the label" },
  { id:"care", label:"Re-describe with care" }
];

const BEYOND_LABEL_LENSES = [
  { id:"maker", label:"Maker / author" },
  { id:"place", label:"Place" },
  { id:"language", label:"Language" },
  { id:"collection", label:"Collection history" },
  { id:"living", label:"Living practice" },
  { id:"care", label:"Care" },
  { id:"critique", label:"Critique / reception" }
];

function beyondLabelText(record) {
  return [
    record.title,
    record.summary,
    record.abstract,
    Array.isArray(record.description) ? record.description.join(" ") : record.description,
    record.provider,
    record.sourceName,
    record.source,
    record.institution,
    record.collection,
    record.type,
    record.cat,
    record.creator,
    record.country,
    record.region,
    record.community,
    record.material,
    record.medium,
    record.provenance,
    record.doi,
    record.DOI
  ].filter(Boolean).join(" ").toLowerCase();
}

function inferBeyondLabelSourceType(record) {
  const text = beyondLabelText(record);
  if (record.doi || record.DOI || record.journal || record.authors || record.abstract || /\b(doi|journal|article|abstract|citation|crossref|openalex|semantic scholar)\b/i.test(text)) return "academic_source";
  if (/\b(community|oral history|local organisation|local organization|collective|project)\b/i.test(text)) return "community_source";
  if (/\b(museum|metropolitan museum|smithsonian|library|archive|catalogue|catalog|collection|institution)\b/i.test(text)) return "institutional_record";
  return "unclear_source_position";
}

function beyondLabelSourceTypeLabel(sourceType) {
  const labels = {
    institutional_record:"institutional record",
    academic_source:"academic source",
    community_source:"community source",
    unclear_source_position:"unclear source position"
  };
  return labels[sourceType] || "unclear source position";
}

function compactBeyondLabelQuery(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 160);
}

function beyondLabelTitle(record) {
  return compactBeyondLabelQuery(record.title || record.name || "Untitled record");
}

function beyondLabelProvider(record) {
  return compactBeyondLabelQuery(record.sourceName || record.institution || record.source || record.collection || record.provider || "");
}

function beyondLabelHasPersonShape(value) {
  const text = compactBeyondLabelQuery(value);
  if (!text || text.split(/\s+/).length < 2 || text.split(/\s+/).length > 4) return false;
  return /^[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,3}$/.test(text);
}

function beyondLabelImportantWords(value) {
  const stop = new Set(["the","and","for","with","from","into","about","this","that","studies","study","record","source","image","jpg","jpeg","png","pdf"]);
  return compactBeyondLabelQuery(value)
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .split(/[^A-Za-z0-9'’-]+/)
    .map(word => word.trim())
    .filter(word => word.length > 2 && !stop.has(word.toLowerCase()))
    .slice(0, 7);
}

function classifyBeyondLabelRecord(record, currentQuery = "") {
  const title = beyondLabelTitle(record);
  const provider = beyondLabelProvider(record);
  const text = `${currentQuery} ${title} ${provider} ${beyondLabelText(record)}`;
  const lower = text.toLowerCase();
  const queryLooksPerson = beyondLabelHasPersonShape(currentQuery);
  const titleLooksPerson = beyondLabelHasPersonShape(title);
  if (
    /\b(highlife|album cover|album covers|poster|film|performance|music|print culture|graphic design|visual culture|cover art)\b/i.test(lower)
  ) return "media_record";
  if (
    /\.(jpg|jpeg|png|gif|webp)\b/i.test(title) ||
    /\b(wikimedia|commons|image|photograph|photo|museum humanum)\b/i.test(lower)
  ) return "image_record";
  if (
    record.doi ||
    record.DOI ||
    record.journal ||
    record.authors ||
    record.abstract ||
    /\b(journal|article|abstract|theory|analysis|racism|colonialism|education|philosophy|biblical studies|design education|critique|methodology|scholarship|conceptual decolonisation)\b/i.test(lower)
  ) return "academic_argument";
  if (
    queryLooksPerson ||
    titleLooksPerson ||
    /\b(profile|biography|author page|interview|talks|lectures|publication list)\b/i.test(lower)
  ) return "person_result";
  if (
    /\b(mask|textile|artefact|artifact|object|accession|catalogue|catalog|museum|collection|smithsonian|metropolitan museum)\b/i.test(lower)
  ) return "institutional_object_record";
  if (
    /\b(openlibrary|worldcat|isbn|publisher|routledge|palgrave|book|monograph|library catalogue|library catalog)\b/i.test(lower)
  ) return "book_or_publication";
  if (
    /\b(community archive|oral history|grassroots|collective|local organisation|local organization|community project|commons)\b/i.test(lower)
  ) return "community_source";
  return "unclear";
}

function beyondLabelReadingTypeLabel(type) {
  const labels = {
    academic_argument:"academic argument",
    institutional_object_record:"institutional object record",
    image_record:"image record",
    person_result:"person-centred result",
    book_or_publication:"book or publication",
    community_source:"community source",
    media_record:"media/design source",
    unclear:"unclear source position"
  };
  return labels[type] || labels.unclear;
}

function beyondLabelBaseTerm(record, currentQuery = "") {
  return compactBeyondLabelQuery(currentQuery || libraryQuery || record.title || record.creator || record.type || "archive record");
}

function makeCounterSearch(query, resists, recovers, type = "gap") {
  return { query:compactBeyondLabelQuery(query), resists, recovers, type };
}

function uniqueCounterSearches(searches, currentQuery = "") {
  const seen = new Set();
  const current = compactBeyondLabelQuery(currentQuery).toLowerCase();
  return searches
    .map(search => ({...search, query:compactBeyondLabelQuery(search.query)}))
    .filter(search => {
      const key = search.query.toLowerCase();
      if (!search.query || search.query.length < 2 || search.query.length > 160 || seen.has(key)) return false;
      if (key === current && !/specific|source|care|history|maker|language|critique/i.test(search.resists + search.recovers)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function buildBeyondLabelCounterSearches(record, currentQuery = "") {
  const base = beyondLabelBaseTerm(record, currentQuery);
  const title = beyondLabelTitle(record);
  const provider = beyondLabelProvider(record);
  const recordType = classifyBeyondLabelRecord(record, currentQuery);
  const words = beyondLabelImportantWords(title);
  const primaryTerms = compactBeyondLabelQuery(words.slice(0, 5).join(" ")) || base;
  const text = `${base} ${beyondLabelText(record)}`.toLowerCase();
  if (/biblical studies|embedded racism|colonialism/i.test(text)) {
    return uniqueCounterSearches([
      makeCounterSearch("African Biblical Studies colonialism racism critique", "Reading the title as only a paper record.", "The wider debate and field politics around racism, colonial knowledge and Biblical Studies.", "field"),
      makeCounterSearch("African biblical interpretation community theology", "Disciplinary abstraction standing in for interpretive communities.", "Theological contexts, African interpretation and communities of argument.", "community"),
      makeCounterSearch("Biblical Studies colonialism African scholars", "Field history without asking who is cited or centred.", "Authorship, citation and scholarly voice around the critique.", "citation"),
      makeCounterSearch(`${primaryTerms} reception critique`, "The source isolated from response and debate.", "How the argument has been taken up, challenged or extended.", "reception")
    ], currentQuery);
  }
  if (/ghana.*highlife.*album|album cover|highlife/i.test(text)) {
    return uniqueCounterSearches([
      makeCounterSearch("Ghana highlife album cover designers", "The reduction of album covers to music metadata only.", "Visual authorship, print labour, design culture and urban aesthetics.", "maker"),
      makeCounterSearch("Ghana highlife print culture", "A record that treats sound and image as separate evidence.", "Print shops, circulation, visual culture and music economies.", "method"),
      makeCounterSearch("Ghana album cover visual culture", "A narrow title-level description.", "Style, design networks and the social life of sleeve images.", "adjacent"),
      makeCounterSearch("highlife music urban aesthetics Ghana", "A label detached from place and city life.", "Connections between music, image, nightlife and urban publics.", "place")
    ], currentQuery);
  }
  if (/african masks|mask\b|masks\b/i.test(text)) {
    const providerPrefix = provider && /museum|humanum|wikimedia|commons/i.test(provider + title) ? `${provider.replace(/Wikimedia Commons/i, "Wikimedia").trim()} African mask` : "African mask";
    return uniqueCounterSearches([
      makeCounterSearch(`${providerPrefix} collection history`, "The image or object label detached from provenance and museum framing.", "Collection pathways, institutional categories and contested ownership.", "collection"),
      makeCounterSearch("African mask local name maker community", "A broad English object label standing in for specific names and relations.", "Local naming, maker/community authority and more precise object relations.", "maker"),
      makeCounterSearch("African mask contemporary makers practice", "The idea that mask traditions only belong to the past.", "Living makers, changing practice and contemporary authority.", "living"),
      makeCounterSearch("African mask museum provenance", "The image as reusable metadata without its collection route.", "Provenance leads, reuse pathways and institutional description.", "provenance")
    ], currentQuery);
  }
  if (/yaw ofosu-asare/i.test(text)) {
    return uniqueCounterSearches([
      makeCounterSearch("Yaw Ofosu-Asare decolonising design", "A person reduced to a single result or institutional role.", "Authored concepts and public references around decolonial design practice.", "person"),
      makeCounterSearch("Yaw Ofosu-Asare interviews talks", "Publication metadata as the only voice.", "Spoken context, teaching concerns and situated explanation.", "source_position"),
      makeCounterSearch("Yaw Ofosu-Asare citations reception", "A record without its field of response.", "How the work is taken up, debated or cited.", "critique"),
      makeCounterSearch("Yaw Ofosu-Asare African Design Futures", "A search that stays at name-level matching.", "Connected projects, design futures and related research pathways.", "adjacent")
    ], currentQuery);
  }
  if (/kwasi wiredu/i.test(text)) {
    return uniqueCounterSearches([
      makeCounterSearch("Kwasi Wiredu conceptual decolonisation", "A philosopher reduced to a name heading.", "Core concepts and arguments around decolonising thought.", "person"),
      makeCounterSearch("Kwasi Wiredu language translation philosophy", "English metadata as if language were neutral.", "How language and translation shape African philosophy.", "language"),
      makeCounterSearch("Kwasi Wiredu African philosophy critique", "An isolated authored record.", "Reception, debate and critique around the work.", "critique"),
      makeCounterSearch("Kwasi Wiredu oral interviews", "Written publication as the only source form.", "Interviews, lectures and spoken explanation where available.", "source_position")
    ], currentQuery);
  }
  if (/decolonising design education|decolonizing design education/i.test(text)) {
    return uniqueCounterSearches([
      makeCounterSearch("decolonising design education classroom practice", "A field label without teaching conditions.", "Pedagogy, classroom methods and situated practice.", "method"),
      makeCounterSearch("decolonising design education community knowledge", "Academic framing as the only evidence base.", "Community authority, partnership and non-institutional knowledge.", "source_position"),
      makeCounterSearch("African design pedagogy practice based evidence", "Theory separated from making and learning.", "Practice-led evidence and design education examples.", "adjacent"),
      makeCounterSearch("decolonising design education non Western sources", "Defaulting to dominant citation networks.", "Wider sources, languages and locations of knowledge.", "gap")
    ], currentQuery);
  }
  if (recordType === "academic_argument") {
    return uniqueCounterSearches([
      makeCounterSearch(`${primaryTerms} critique`, "Treating the title as a neutral publication label.", "The argument, field debate and concepts signalled by the title.", "field"),
      makeCounterSearch(`${primaryTerms} scholars citations`, "A paper separated from who it cites and centres.", "Authorship, citation politics and scholarly reception.", "citation"),
      makeCounterSearch(`${primaryTerms} community practice`, "Academic language as the only context.", "Practice accounts, situated debates or communities connected to the argument.", "community"),
      makeCounterSearch(`${primaryTerms} interview lecture`, "Publication metadata standing in for voice.", "Talks, interviews or teaching contexts where available.", "voice")
    ], currentQuery);
  }
  if (recordType === "person_result") {
    const person = currentQuery && beyondLabelHasPersonShape(currentQuery) ? compactBeyondLabelQuery(currentQuery) : title;
    return uniqueCounterSearches([
      makeCounterSearch(`${person} authored work concepts`, "A person reduced to a name match or profile.", "Authored ideas, projects and intellectual contribution.", "person"),
      makeCounterSearch(`${person} interviews talks`, "Third-party description standing in for direct voice.", "Spoken context, public explanation and teaching concerns.", "voice"),
      makeCounterSearch(`${person} citations reception`, "A profile separated from how the work circulates.", "Reception, citation and debate around the work.", "reception"),
      makeCounterSearch(`${person} institutional biography critique`, "Institutional role as the whole story.", "The difference between biography, affiliation and contribution.", "institution")
    ], currentQuery);
  }
  if (recordType === "image_record" || recordType === "institutional_object_record") {
    return uniqueCounterSearches([
      makeCounterSearch(`${primaryTerms} provenance collection history`, "The object or image label without its pathway into a collection.", "Acquisition, custody, reuse and institutional framing.", "collection"),
      makeCounterSearch(`${primaryTerms} maker community authority`, "The provider label as the only visible authority.", "Maker, community description or named authority where sources support it.", "maker"),
      makeCounterSearch(`${primaryTerms} local name place`, "A broad English label detached from specific naming and place.", "Local terms, place specificity and object relations.", "language"),
      makeCounterSearch(`${primaryTerms} contemporary practice care`, "The record treated as static visual data.", "Living practice, restriction, care or present-day context.", "care")
    ], currentQuery);
  }
  if (recordType === "media_record") {
    return uniqueCounterSearches([
      makeCounterSearch(`${base} designers visual authorship`, "The item reduced to title, performer or genre.", "Designers, image-makers, studios and visual authorship.", "maker"),
      makeCounterSearch(`${base} print culture circulation`, "A visual source separated from production and movement.", "Print labour, circulation, publishing economies and audiences.", "production"),
      makeCounterSearch(`${base} visual culture Ghana`, "Music metadata standing in for image culture.", "Urban aesthetics, graphic style and cultural context.", "place"),
      makeCounterSearch(`${base} archive source framing`, "The archive label as if it were the whole object.", "How the source was collected, described or reused.", "source")
    ], currentQuery);
  }
  if (recordType === "book_or_publication") {
    return uniqueCounterSearches([
      makeCounterSearch(`${primaryTerms} reviews reception`, "A publication label without its field of response.", "Reviews, citations and intellectual reception.", "reception"),
      makeCounterSearch(`${primaryTerms} author interview`, "Publisher metadata as the only voice.", "Author explanation, interviews or talks.", "voice"),
      makeCounterSearch(`${primaryTerms} syllabus teaching`, "A book detached from how it is used.", "Teaching contexts, reading pathways and related debates.", "method")
    ], currentQuery);
  }
  if (recordType === "community_source") {
    return uniqueCounterSearches([
      makeCounterSearch(`${base} community self description`, "External description replacing community authority.", "How the source names itself, its purpose and its boundaries.", "authority"),
      makeCounterSearch(`${base} place relation oral history`, "Place reduced to a searchable field.", "Situated histories, oral accounts and local context.", "place"),
      makeCounterSearch(`${base} access protocol care`, "Visibility treated as the default goal.", "Permissions, access conditions, refusal and cultural care.", "care")
    ], currentQuery);
  }
  const place = record.community || record.country || record.region || "";
  const maker = record.creator || record.author || "";
  const type = record.type || record.cat || "record";
  return uniqueCounterSearches([
    makeCounterSearch(`${base} collection history`, "The label without its pathway into an archive.", "Acquisition context, institutional framing and provenance leads.", "collection"),
    makeCounterSearch(maker ? `${maker} interviews talks` : `${base} maker community voice`, "The catalogue voice as the only voice.", "Authored explanation, interviews or community description where available.", "maker"),
    makeCounterSearch(place ? `${place} ${type} local language` : `${base} local language`, "English searchable terms standing in for local names.", "Local terms, translation questions and more precise descriptions.", "language"),
    makeCounterSearch(`${base} contemporary practice`, "A record framed only as past culture or static heritage.", "Living practice, adaptation and present-day relations.", "living"),
    makeCounterSearch(`${base} critique reception`, "A source presented without response or debate.", "How people have interpreted, challenged or extended the record.", "critique")
  ], currentQuery);
}

function createBeyondLabelAnalysis(record, currentQuery = "") {
  const sourceType = inferBeyondLabelSourceType(record);
  const provider = beyondLabelProvider(record);
  const title = beyondLabelTitle(record);
  const recordReadingType = classifyBeyondLabelRecord(record, currentQuery);
  const readingTypeLabel = beyondLabelReadingTypeLabel(recordReadingType);
  const text = beyondLabelText(record);
  const titleWords = beyondLabelImportantWords(title);
  const keywordPhrase = titleWords.slice(0, 4).join(" ") || title;
  const hasThinMetadata = !record.summary && !record.abstract && !record.description && !record.creator && !record.author;
  const sourcePhrase = provider ? `${provider}` : "the visible source label";
  let archiveNote = provider
    ? `This record is encountered through ${provider}. Based on the visible metadata, it reads most like a ${readingTypeLabel}.`
    : `The source position is unclear from the visible metadata. Start by checking who created, hosted or described “${title}”.`;
  if (/biblical studies|embedded racism|colonialism/i.test(`${title} ${text}`)) {
    archiveNote = `The title frames “${title}” as an argument about racism, colonialism and Biblical Studies. The question is not only what it argues, but which sources, traditions and communities it uses to make that critique.`;
  } else if (recordReadingType === "image_record") {
    archiveNote = `The file-like title “${title}” and source position make this visible first as a digital image record. That is different from encountering the object, maker, place or use-context behind the image.`;
  } else if (recordReadingType === "person_result") {
    archiveNote = `This result is organised around a named person. Read the source carefully: it may be direct voice, institutional biography, citation trail, interview, or third-party description.`;
  } else if (recordReadingType === "media_record") {
    archiveNote = `This result points toward visual, music, design or performance culture. The label may foreground title or genre while production labour, circulation and visual authorship need another search path.`;
  }
  if (hasThinMetadata) {
    archiveNote += " The available metadata is thin, so this reading stays provisional.";
  }

  let labelOperations = [];
  let outsideData = [];
  let redescriptionPrompts = {
    canSay:`This appears to be a ${readingTypeLabel} labelled “${title}”.`,
    cannotAssume:"I cannot assume the label is the whole context without checking the source.",
    needsAnotherSource:"Look for sources that explain authorship, context, reception or use.",
    careQuestion:"What should be handled carefully, credited more precisely, or left unresolved?"
  };

  if (/kwasi wiredu|conceptual decolonisation|conceptual decolonization/i.test(`${title} ${currentQuery}`) || (/\bphilosophy\b/i.test(title) && !/biblical studies/i.test(title))) {
    labelOperations = [
      {
        id:"concept-frame",
        title:"It makes philosophy searchable by name and concept",
        explanation:`The label points toward ${keywordPhrase}, but philosophical work also depends on argument, translation and reception.`
      },
      {
        id:"language-frame",
        title:"It may hide translation work",
        explanation:"Concepts can shift across languages and philosophical traditions; the label cannot show that movement by itself."
      },
      {
        id:"reception-frame",
        title:"It separates argument from uptake",
        explanation:"A philosophy record needs reception, critique and teaching context as well as bibliographic metadata."
      }
    ];
    outsideData = [
      {
        id:"person",
        dimension:"Authored philosophical voice",
        whyItMatters:"The record should be read for the argument being made, not only for a name heading.",
        caution:"Do not reduce a philosopher to a topic label.",
        intensity:"high"
      },
      {
        id:"language",
        dimension:"Language and translation",
        whyItMatters:"Conceptual decolonisation and African philosophy often turn on what language can and cannot carry.",
        caution:"Do not claim hidden meanings without language-specific sources.",
        intensity:"high"
      },
      {
        id:"reception",
        dimension:"Reception and critique",
        whyItMatters:"Philosophical work lives through response, disagreement and teaching as well as publication.",
        caution:"Reception is not the same as the author’s own argument.",
        intensity:"medium"
      }
    ];
    redescriptionPrompts = {
      canSay:`This appears to be a philosophy record connected to ${keywordPhrase}.`,
      cannotAssume:"I cannot assume a name or concept label captures the full argument or its language politics.",
      needsAnotherSource:"Look for authored texts, interviews, lectures, translations, critiques and reception.",
      careQuestion:"Which concepts require language-specific care before being paraphrased?"
    };
  } else if (recordReadingType === "academic_argument") {
    labelOperations = [
      {
        id:"field-frame",
        title:"It frames an argument within a field",
        explanation:`The title makes “${keywordPhrase}” searchable as scholarly argument rather than as object metadata.`,
        evidence:title
      },
      {
        id:"critique-keywords",
        title:"It makes critique searchable",
        explanation:/racism|colonialism/i.test(title) ? "Words such as racism and colonialism signal a critical method, but the label cannot show which sources, traditions or communities carry that critique." : "Academic keywords make a field visible, but they can hide how the argument is grounded.",
        evidence:title
      },
      {
        id:"citation-frame",
        title:"It foregrounds academic form",
        explanation:`Through ${sourcePhrase}, citation, title and field language become easier to see than teaching context, practice context or non-academic voice.`
      }
    ];
    outsideData = [
      {
        id:"field",
        dimension:/biblical studies/i.test(title) ? "Field politics in Biblical Studies" : "Disciplinary frame",
        whyItMatters:/biblical studies/i.test(title) ? "The title names Biblical Studies as the field being questioned, so the reading should ask how the discipline itself is being framed." : "The record appears as an academic argument, so the field language shapes what kinds of knowledge count as evidence.",
        caution:"Do not assume the title alone tells us whose scholarship, traditions or communities are centred.",
        intensity:"high"
      },
      {
        id:"citation",
        dimension:"Citation and scholarly voice",
        whyItMatters:"Academic records make publication metadata visible, but the politics of who is cited, answered or omitted require reading the paper and its references.",
        caution:"Do not infer citation politics from metadata alone.",
        intensity:"high"
      },
      {
        id:"community",
        dimension:/biblical studies/i.test(title) ? "African interpretation and community theology" : "Community or practice voice",
        whyItMatters:/biblical studies/i.test(title) ? "If the record invokes African Biblical Studies, it matters whether African interpretive traditions are sources of theory, examples, or merely subjects." : "Academic framing may not show whether practice communities or lived contexts shaped the argument.",
        caution:"Do not assume community voice is present without reading the source.",
        intensity:"medium"
      },
      {
        id:"reception",
        dimension:"Reception and critique",
        whyItMatters:"A critical argument becomes part of a field through response, uptake and disagreement, none of which is fully visible in a single record label.",
        caution:"Search for response and debate rather than treating one result as the whole conversation.",
        intensity:"medium"
      }
    ];
    redescriptionPrompts = {
      canSay:`This appears to be an academic argument about ${keywordPhrase}.`,
      cannotAssume:"I cannot assume the paper includes community, practice or interpretive voice without reading it.",
      needsAnotherSource:"Look for citations, interviews, teaching/practice accounts, local debates, or sources by scholars named in the argument.",
      careQuestion:"Which traditions, communities or knowledge practices are being spoken with, and which are being spoken about?"
    };
  } else if (recordReadingType === "image_record" || recordReadingType === "institutional_object_record") {
    labelOperations = [
      {
        id:"image-object-frame",
        title:"It turns image or object life into data",
        explanation:`The label “${title}” makes the item searchable as a file, object or catalogue entry before its maker, use, place or material relations are known.`,
        evidence:title
      },
      {
        id:"provider-frame",
        title:"It centres provider description",
        explanation:`Through ${sourcePhrase}, the holding or hosting source becomes highly visible while maker/community authority may need another route.`
      },
      {
        id:"provenance-gap",
        title:"It may separate image from pathway",
        explanation:"Image and catalogue metadata can show what is visible now without explaining collection history, reuse, acquisition or permission."
      }
    ];
    outsideData = [
      {
        id:"maker",
        dimension:"Maker/community authority",
        whyItMatters:`The label “${title}” does not by itself establish who made, authorised, used or named the object or image.`,
        caution:"Do not assign maker, community or ownership without another source.",
        intensity:"high"
      },
      {
        id:"language",
        dimension:"Local terms beyond the English label",
        whyItMatters:"Broad English object labels can hide local names, categories, uses and relations.",
        caution:"Do not invent local terms; search for sources that can name them responsibly.",
        intensity:"medium"
      },
      {
        id:"collection",
        dimension:"Collection and reuse pathway",
        whyItMatters:`A source such as ${sourcePhrase} may make the image accessible without explaining how the object or image entered that pathway.`,
        caution:"Absence of provenance is a research question, not proof of a single story.",
        intensity:"high"
      },
      {
        id:"living",
        dimension:"Use-context and living practice",
        whyItMatters:"An image record can make a form look static even when related practices may be active, restricted, changing or context-dependent.",
        caution:"Do not assume continuity, publicness or permission from visibility alone.",
        intensity:"medium"
      }
    ];
    redescriptionPrompts = {
      canSay:`This appears to be a digital/image or object record labelled “${title}”.`,
      cannotAssume:"I cannot assume local name, maker, use-context, permission or ownership history from this label alone.",
      needsAnotherSource:"Look for provenance, collection notes, local naming, maker/community sources, and context around use or restriction.",
      careQuestion:"What might need permission, context, or non-display rather than more exposure?"
    };
  } else if (recordReadingType === "person_result") {
    const personName = currentQuery && beyondLabelHasPersonShape(currentQuery) ? compactBeyondLabelQuery(currentQuery) : title;
    labelOperations = [
      {
        id:"name-frame",
        title:"It makes a person searchable",
        explanation:`The record gathers attention around “${personName}”, but name matching does not tell us whether this is direct voice, biography, publication, citation or reception.`,
        evidence:personName
      },
      {
        id:"role-frame",
        title:"It can reduce work to role",
        explanation:"Profiles and catalogue records often foreground affiliation, role or keywords while the fuller body of work needs other sources."
      },
      {
        id:"voice-frame",
        title:"It separates voice from description",
        explanation:"A person-centred result should be read for source position: who is speaking, who is describing, and what kind of evidence is visible."
      }
    ];
    outsideData = [
      {
        id:"person",
        dimension:"Authored work and concepts",
        whyItMatters:`For “${personName}”, the important question is not only identity but what concepts, projects or arguments are attached to the work.`,
        caution:"Do not reduce a living or historical scholar to a keyword cluster.",
        intensity:"high"
      },
      {
        id:"voice",
        dimension:"Direct voice, interviews or talks",
        whyItMatters:"Profiles and citations may describe a person without letting them explain their own work.",
        caution:"Do not treat third-party description as direct voice.",
        intensity:"medium"
      },
      {
        id:"reception",
        dimension:"Reception and citation",
        whyItMatters:"A body of work becomes visible through citation, critique, teaching and debate as well as through biography.",
        caution:"Reception is not the same as the person’s own position.",
        intensity:"medium"
      }
    ];
    redescriptionPrompts = {
      canSay:`This result relates to ${personName}, but the source type determines whether it is direct voice, profile, citation or reception.`,
      cannotAssume:"I cannot treat a profile, citation or catalogue entry as the whole person’s work.",
      needsAnotherSource:"Look for authored publications, interviews, talks, citations and responses.",
      careQuestion:"How can I describe the work without reducing the person to affiliation, identity or keywords?"
    };
  } else if (recordReadingType === "media_record") {
    labelOperations = [
      {
        id:"genre-frame",
        title:"It makes the item searchable by title or genre",
        explanation:`The label connects “${title}” to a media, music, design or visual culture pathway, but that can hide who made the visual form.`
      },
      {
        id:"labour-frame",
        title:"It may hide production labour",
        explanation:"Designers, printers, photographers, studios and circulation networks often sit outside simple title or genre metadata."
      },
      {
        id:"circulation-frame",
        title:"It separates object from circulation",
        explanation:"The label may not show how the item moved through cities, shops, audiences, labels, archives or economies."
      }
    ];
    outsideData = [
      {
        id:"maker",
        dimension:"Visual authorship",
        whyItMatters:"Album covers, posters and visual records often foreground performers or titles while designers and image-makers disappear.",
        caution:"Do not assign authorship without evidence.",
        intensity:"high"
      },
      {
        id:"production",
        dimension:"Print and production labour",
        whyItMatters:"Printing, photography, layout and studio labour can be central to the source but absent from metadata.",
        caution:"Search for studios, printers and designers rather than guessing.",
        intensity:"high"
      },
      {
        id:"place",
        dimension:"Circulation and urban context",
        whyItMatters:"Music and visual culture often move through specific cities, markets, labels and audiences.",
        caution:"Do not treat place as a flat national label.",
        intensity:"medium"
      }
    ];
    redescriptionPrompts = {
      canSay:`This appears to be a visual/media source connected to “${title}”.`,
      cannotAssume:"I cannot assume the visible performer, title or genre identifies the designer, printer or circulation pathway.",
      needsAnotherSource:"Look for designers, studios, print culture, label history, audiences and circulation.",
      careQuestion:"Who made the visual form visible, and who remains unnamed by the metadata?"
    };
  } else if (recordReadingType === "community_source") {
    labelOperations = [
      {
        id:"self-description",
        title:"It may carry self-description",
        explanation:`Through ${sourcePhrase}, this record may be closer to community description than institutional catalogue voice, but the source still needs checking.`
      },
      {
        id:"access-frame",
        title:"It shapes access",
        explanation:"Community sources often carry their own access conditions, priorities and boundaries."
      },
      {
        id:"relation-frame",
        title:"It may name relation, not just topic",
        explanation:"Place, authority and knowledge permission may matter more than broad subject labels."
      }
    ];
    outsideData = [
      {
        id:"authority",
        dimension:"Community authority",
        whyItMatters:"A community source should be read for how it names itself, its purpose and its boundaries.",
        caution:"Do not override self-description with external categories.",
        intensity:"high"
      },
      {
        id:"place",
        dimension:"Place relation",
        whyItMatters:"Place may be relational, historical or custodial rather than a simple location field.",
        caution:"Do not flatten place into one fixed geography.",
        intensity:"medium"
      },
      {
        id:"care",
        dimension:"Permission, care and refusal",
        whyItMatters:"Some community knowledge is not meant to be fully extracted, displayed or reused.",
        caution:"Follow access guidance and leave uncertainty visible.",
        intensity:"high"
      }
    ];
  } else {
    labelOperations = [
      {
        id:"source-frame",
        title:"It makes a source searchable",
        explanation:`The label “${title}” gives an entry point, but the visible metadata does not fully explain source position or context.`
      },
      {
        id:"provider-frame",
        title:"It centres available metadata",
        explanation:provider ? `${provider} shapes the first encounter with this record.` : "The provider or source position is not clear from the visible metadata.",
      },
      {
        id:"uncertainty-frame",
        title:"It leaves uncertainty visible",
        explanation:"When metadata is thin, the responsible reading is provisional rather than definitive."
      }
    ];
    outsideData = [
      {
        id:"source",
        dimension:"Source position",
        whyItMatters:"The record needs a clearer account of who created, hosted or described it.",
        caution:"Do not treat an unclear source label as neutral.",
        intensity:"high"
      },
      {
        id:"context",
        dimension:"Context beyond the title",
        whyItMatters:"The title may be the strongest available evidence, but it is not enough to explain use, reception or relation.",
        caution:"Search outward before making claims.",
        intensity:"medium"
      },
      {
        id:"reception",
        dimension:"Response and use",
        whyItMatters:"How the record is used, cited or discussed may clarify its position.",
        caution:"Do not infer reception from presence in search results.",
        intensity:"medium"
      }
    ];
  }
  const counterSearches = buildBeyondLabelCounterSearches(record, currentQuery);
  outsideData = outsideData
    .map(item => ({
      ...item,
      searchQuery:(counterSearches.find(search => search.type === item.id)?.query) || `${beyondLabelBaseTerm(record, currentQuery)} ${item.dimension}`,
      whyThisRecordRaisesIt:item.whyItMatters,
      doNotAssume:item.caution
    }))
    .slice(0, 5);
  const lensPromptsByType = {
    maker:recordReadingType === "academic_argument" ? "Whose scholarship, interpretation or practice grounds this argument?" : "Who is named, unnamed or described by someone else?",
    place:recordReadingType === "media_record" ? "What city, market, label, studio or audience shaped the source?" : "What place relations are named, flattened or absent?",
    language:recordReadingType === "academic_argument" ? "Which field terms make the argument legible, and what vocabularies might sit outside them?" : "Which terms make the record searchable, and which terms might not be in English?",
    collection:recordReadingType === "image_record" || recordReadingType === "institutional_object_record" ? "What pathway made this image or object available as metadata?" : "What source pathway brought this record into view?",
    living:recordReadingType === "media_record" ? "How does this source connect to production, circulation or present cultural memory?" : "How might the record connect to present practice rather than only past description?",
    care:"What should not be exposed, simplified or treated as freely reusable?",
    critique:recordReadingType === "academic_argument" ? "Who has challenged, cited, extended or reframed this argument?" : "Who has challenged, cited, extended or reframed this record?"
  };
  return {
    recordReadingType,
    confidence:hasThinMetadata ? "low" : provider || record.abstract || record.summary ? "medium" : "low",
    archiveVoice:{
      headline:title,
      label:title,
      provider,
      sourceType,
      sourcePosition:readingTypeLabel,
      note:archiveNote
    },
    labelOperations,
    outsideData,
    counterReadings:BEYOND_LABEL_LENSES.map(lens => ({
      id:lens.id,
      lens:lens.label,
      prompt:lensPromptsByType[lens.id]
    })),
    counterSearches,
    redescriptionPrompts,
    careNote:hasThinMetadata
      ? `The available metadata for “${title}” is thin, so this reading stays provisional and points to what needs checking.`
      : `This mode reads “${title}” through source position, visible evidence and counter-search rather than treating the label as neutral.`
  };
}

function createBeyondLabelReading(record, currentQuery = "") {
  return createBeyondLabelAnalysis(record, currentQuery);
}

function normalizeMappableRecord(record) {
  const tags = uniqueValues([
    ...(Array.isArray(record.tags) ? record.tags : []),
    ...(Array.isArray(record.subjects) ? record.subjects : []),
    ...(Array.isArray(record.concepts) ? record.concepts : []),
    ...(Array.isArray(record.themes) ? record.themes : []),
    record.cat,
    record.type,
    record.collection,
    record.material,
    record.medium
  ].filter(Boolean));
  return {
    id:String(record.id || slugify(record.title || "record")),
    title:beyondLabelTitle(record),
    creator:compactBeyondLabelQuery(record.creator || record.author || ""),
    provider:beyondLabelProvider(record),
    source:compactBeyondLabelQuery(record.sourceName || record.source || record.institution || ""),
    description:compactBeyondLabelQuery(record.abstract || record.summary || (Array.isArray(record.description) ? record.description.join(" ") : record.description) || ""),
    year:compactBeyondLabelQuery(record.year || record.period || record.date || ""),
    url:safeUrl(record.sourceUrl || record.url || ""),
    tags,
    subjects:tags,
    place:compactBeyondLabelQuery(record.place || record.country || record.region || record.community || ""),
    sourceType:record.sourceType || inferBeyondLabelSourceType(record)
  };
}

function beyondDataRecordTerms(record, currentQuery = "") {
  const mappable = normalizeMappableRecord(record);
  const queryPhrases = extractBeyondDataKeywordPhrases(currentQuery, { source:"query", currentQuery })
    .map(item => item.term);
  const explicitTerms = [
    ...mappable.tags,
    mappable.provider,
    mappable.source,
    mappable.creator,
    mappable.place
  ].filter(Boolean);
  const phraseTerms = [
    ...queryPhrases,
    ...extractBeyondDataKeywordPhrases(mappable.title, { source:"title", currentQuery }).map(item => item.term),
    ...extractBeyondDataKeywordPhrases(mappable.description, { source:"description", currentQuery }).map(item => item.term),
    ...explicitTerms.flatMap(term => extractBeyondDataKeywordPhrases(term, { source:"tag", currentQuery }).map(item => item.term))
  ];
  const words = [
    ...beyondLabelImportantWords(currentQuery),
    ...beyondLabelImportantWords(mappable.title),
    ...beyondLabelImportantWords(mappable.description),
    ...mappable.tags.flatMap(tag => beyondLabelImportantWords(tag))
  ];
  const stop = getBeyondDataKeywordStopwords(currentQuery);
  const seen = new Set();
  return [
    ...phraseTerms,
    ...words
    .map(word => word.toLowerCase())
    .filter(word => word.length > 2 && !stop.has(word))
  ]
    .map(term => normalizeBeyondDataKeywordTerm(term, currentQuery))
    .filter(term => term && !stop.has(term) && !seen.has(term) && seen.add(term))
    .slice(0, 10);
}

function getBeyondDataKeywordStopwords(currentQuery = "") {
  const query = String(currentQuery || "").toLowerCase();
  const stop = new Set([
    "the","and","or","of","in","on","for","to","with","from","by","an","a","this","that",
    "record","records","source","sources","archive","archives","data","paper","papers","article","articles",
    "image","images","jpg","jpeg","png","file","metadata","overview","introduction","response","critique",
    "research","study","studies","result","results","library","external","search","object","objects"
  ]);
  if (!/\bafrican\b/i.test(query) && !/\bafrica\b/i.test(query)) {
    stop.add("african");
    stop.add("africa");
  }
  return stop;
}

function normalizeBeyondDataKeywordTerm(term, currentQuery = "") {
  const stop = getBeyondDataKeywordStopwords(currentQuery);
  const query = String(currentQuery || "").toLowerCase();
  const cleaned = compactBeyondLabelQuery(String(term || "")
    .replace(/\.(jpg|jpeg|png|webp|gif|pdf)\b/gi, " ")
    .replace(/[()[\]{}:;!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase());
  if (!cleaned || cleaned.length < 3 || stop.has(cleaned)) return "";
  if ((cleaned === "african" || cleaned === "africa") && query.trim() !== cleaned) return "";
  const words = cleaned.split(/\s+/).filter(word => word && !stop.has(word));
  if (!words.length) return "";
  if (words.length === 1 && words[0].length < 4) return "";
  return words.slice(0, 4).join(" ");
}

function extractBeyondDataKeywordPhrases(text, options = {}) {
  const currentQuery = options.currentQuery || "";
  const source = options.source || "description";
  const stop = getBeyondDataKeywordStopwords(currentQuery);
  const clean = compactBeyondLabelQuery(String(text || "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\.(jpg|jpeg|png|webp|gif|pdf)\b/gi, " ")
    .replace(/[()[\]{}:;!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim());
  if (!clean) return [];
  const phrases = [];
  const exact = normalizeBeyondDataKeywordTerm(clean, currentQuery);
  if ((source === "query" || source === "tag" || source === "subject" || source === "provider") && exact && exact.split(/\s+/).length <= 5) {
    phrases.push({ term:exact, source });
  }
  const words = clean.toLowerCase().split(/[^a-z0-9'-]+/).filter(word => word && !stop.has(word) && word.length > 2);
  for (let size = 4; size >= 2; size -= 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const phrase = words.slice(index, index + size).join(" ");
      const normalized = normalizeBeyondDataKeywordTerm(phrase, currentQuery);
      if (normalized && normalized.split(/\s+/).length > 1) phrases.push({ term:normalized, source });
    }
  }
  words.slice(0, 8).forEach(word => {
    const normalized = normalizeBeyondDataKeywordTerm(word, currentQuery);
    if (normalized) phrases.push({ term:normalized, source });
  });
  const seen = new Set();
  return phrases.filter(item => item.term && !seen.has(item.term) && seen.add(item.term)).slice(0, 14);
}

function buildBeyondDataKeywordNodes(records, matrixRows, currentQuery = "") {
  const termMap = new Map();
  const addTerm = (term, source, recordId, explanation = "") => {
    const normalized = normalizeBeyondDataKeywordTerm(term, currentQuery);
    if (!normalized) return;
    if (!termMap.has(normalized)) {
      termMap.set(normalized, { term:normalized, source, recordIds:new Set(), explicit:false, queryMatch:false, explanation });
    }
    const entry = termMap.get(normalized);
    if (recordId) entry.recordIds.add(String(recordId));
    entry.explicit = entry.explicit || ["tag","subject","provider","query"].includes(source);
    entry.queryMatch = entry.queryMatch || source === "query" || String(currentQuery || "").toLowerCase().includes(normalized);
    if (!entry.explanation && explanation) entry.explanation = explanation;
  };

  extractBeyondDataKeywordPhrases(currentQuery, { source:"query", currentQuery }).forEach(item => {
    records.forEach(record => addTerm(item.term, "query", record.id, "From the current search."));
  });

  records.forEach(record => {
    const mappable = normalizeMappableRecord(record);
    extractBeyondDataKeywordPhrases(mappable.title, { source:"title", currentQuery }).forEach(item => addTerm(item.term, item.source, mappable.id));
    extractBeyondDataKeywordPhrases(mappable.description, { source:"description", currentQuery }).forEach(item => addTerm(item.term, item.source, mappable.id));
    (mappable.tags || []).forEach(tag => extractBeyondDataKeywordPhrases(tag, { source:"tag", currentQuery }).forEach(item => addTerm(item.term, "tag", mappable.id, "Explicit tag or subject.")));
    [mappable.provider, mappable.source, mappable.creator, mappable.place, mappable.year].filter(Boolean).forEach(value => {
      extractBeyondDataKeywordPhrases(value, { source:"provider", currentQuery }).forEach(item => addTerm(item.term, item.source, mappable.id));
    });
    const row = matrixRows.find(item => String(item.recordId) === String(mappable.id));
    (row?.possibleAbsences || []).forEach(absence => addTerm(absence, "dimension", mappable.id, "Reading dimension raised by selected records."));
  });

  return Array.from(termMap.values())
    .map(entry => ({
      term:entry.term,
      source:entry.source,
      recordIds:Array.from(entry.recordIds),
      count:entry.recordIds.size,
      explicit:entry.explicit,
      queryMatch:entry.queryMatch,
      explanation:entry.explanation || `Appears in ${entry.recordIds.size} selected record${entry.recordIds.size !== 1 ? "s" : ""}.`
    }))
    .filter(entry => entry.count >= 2 || entry.explicit || entry.queryMatch)
    .sort((a, b) => Number(b.queryMatch) - Number(a.queryMatch) || Number(b.explicit) - Number(a.explicit) || b.count - a.count || b.term.length - a.term.length)
    .slice(0, 16);
}

function beyondDataSourcePosition(record, currentQuery = "") {
  const type = classifyBeyondLabelRecord(record, currentQuery);
  const labels = {
    academic_argument:"Academic argument",
    institutional_object_record:"Institutional object record",
    image_record:"Image / object record",
    person_result:"Person-centred result",
    book_or_publication:"Book / publication",
    community_source:"Community source",
    media_record:"Media / design source",
    unclear:"Unclear source position"
  };
  return labels[type] || labels.unclear;
}

function beyondDataPlaceSpecificity(record) {
  const place = compactBeyondLabelQuery(record.place || record.country || record.region || record.community || "");
  if (!place) return "missing";
  if (/global|comparative|africa|diaspora|unknown|various/i.test(place)) return "broad";
  if (place.length > 2) return "specific";
  return "unclear";
}

function beyondDataMakerCommunityVoice(record) {
  const text = beyondLabelText(record);
  if (record.creator || record.author || record.community) return "visible";
  if (/\b(author|creator|maker|community|oral history|interview)\b/i.test(text)) return "partial";
  if (/\b(museum|catalogue|catalog|collection|wikimedia|commons|image|mask|object|artifact|artefact)\b/i.test(text)) return "missing";
  return "unclear";
}

function beyondDataInstitutionalFraming(record) {
  const text = `${beyondLabelProvider(record)} ${beyondLabelText(record)}`;
  if (/\b(museum|library|archive|catalogue|catalog|collection|smithsonian|metropolitan museum|wikimedia|commons|library of congress|worldcat|open library)\b/i.test(text)) return "strong";
  if (/\b(journal|publisher|university|press|institute|institution|repository)\b/i.test(text)) return "medium";
  if (/\b(community|oral history|collective|grassroots)\b/i.test(text)) return "low";
  return "unclear";
}

function beyondDataCentredVoice(record, analysis) {
  const type = analysis.recordReadingType;
  const provider = analysis.archiveVoice.provider;
  if (type === "academic_argument") return "Scholarly argument and citation voice";
  if (type === "person_result") return record.creator ? "Named person and authored work" : "Name, profile or reception";
  if (type === "media_record") return "Title, genre and visible media metadata";
  if (type === "community_source") return "Community or project self-description";
  if (type === "image_record" || type === "institutional_object_record") return provider ? `${provider} catalogue or hosting voice` : "Catalogue or image label";
  return provider ? `${provider} source voice` : "Visible source label";
}

function createBeyondDataMatrixRow(record, currentQuery = "") {
  const mappable = normalizeMappableRecord(record);
  const analysis = createBeyondLabelReading(record, currentQuery);
  const counter = analysis.counterSearches[0]?.query || `${mappable.title} context source position`;
  return {
    recordId:mappable.id,
    title:mappable.title,
    sourcePosition:beyondDataSourcePosition(record, currentQuery),
    provider:mappable.provider || mappable.source,
    visibleLabel:mappable.title,
    keyTerms:beyondDataRecordTerms(record, currentQuery).slice(0, 5),
    centredVoice:beyondDataCentredVoice(record, analysis),
    possibleAbsences:analysis.outsideData.map(item => item.dimension).slice(0, 4),
    placeSpecificity:beyondDataPlaceSpecificity(record),
    makerCommunityVoice:beyondDataMakerCommunityVoice(record),
    institutionalFraming:beyondDataInstitutionalFraming(record),
    suggestedCounterSearch:counter
  };
}

function buildBeyondDataCluster(id, label, type, explanation, recordIds, counterSearches = []) {
  return {
    id,
    label,
    type,
    explanation,
    recordIds:[...new Set(recordIds)].filter(Boolean),
    counterSearches:uniqueValues(counterSearches.map(item => item.query || item).filter(Boolean))
      .slice(0, 3)
      .map(query => ({
        query:compactBeyondLabelQuery(query),
        reason:counterSearches.find(item => (item.query || item) === query)?.reason || `Search beyond this cluster through “${compactBeyondLabelQuery(query)}”.`
      }))
  };
}

function buildBeyondDataDefaultClusters(records, matrixRows, sharedTerms, currentQuery = "") {
  const clusters = [];
  const rows = Array.isArray(matrixRows) ? matrixRows : [];
  const addGroupedClusters = (items, type, labelPrefix, explanationFor) => {
    const groups = new Map();
    items.forEach(item => {
      const key = compactBeyondLabelQuery(item.key || "");
      const recordId = String(item.recordId || "");
      if (!key || !recordId) return;
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key).add(recordId);
    });
    groups.forEach((ids, key) => {
      const recordIds = Array.from(ids);
      if (!recordIds.length) return;
      const relatedRows = rows.filter(row => recordIds.includes(String(row.recordId)));
      const counterSearches = relatedRows
        .map(row => row.suggestedCounterSearch)
        .filter(Boolean)
        .slice(0, 3);
      clusters.push(buildBeyondDataCluster(
        `${type}-${slugify(key)}`,
        labelPrefix ? `${labelPrefix}: ${key}` : key,
        type,
        explanationFor(key, recordIds),
        recordIds,
        counterSearches
      ));
    });
  };

  addGroupedClusters(
    rows.map(row => ({ key:row.sourcePosition || "Unclear source position", recordId:row.recordId })),
    "source_position",
    "",
    (label, recordIds) => `${recordIds.length} selected record${recordIds.length !== 1 ? "s" : ""} share this source position. Read them together to compare how source type shapes what becomes visible.`
  );

  addGroupedClusters(
    rows.filter(row => row.provider).map(row => ({ key:row.provider, recordId:row.recordId })),
    "institution",
    "Provider",
    (label, recordIds) => `${recordIds.length} selected record${recordIds.length !== 1 ? "s" : ""} arrive through ${label}. This can reveal repeated institutional or platform framing.`
  );

  const absenceItems = [];
  rows.forEach(row => {
    (row.possibleAbsences || []).forEach(absence => {
      absenceItems.push({ key:absence, recordId:row.recordId });
    });
  });
  addGroupedClusters(
    absenceItems,
    "absence",
    "",
    (label, recordIds) => `${label} appears as a possible reading dimension across ${recordIds.length} selected record${recordIds.length !== 1 ? "s" : ""}. Treat it as an inquiry path, not a final claim.`
  );

  (Array.isArray(sharedTerms) ? sharedTerms : []).slice(0, 6).forEach(term => {
    const recordIds = Array.isArray(term.recordIds) ? term.recordIds.map(String) : [];
    if (!recordIds.length) return;
    clusters.push(buildBeyondDataCluster(
      `keyword-${slugify(term.term)}`,
      term.term,
      "keyword",
      term.explanation || `“${term.term}” helps connect selected records through repeated language or explicit tags.`,
      recordIds,
      [`${currentQuery || term.term} ${term.term}`]
    ));
  });

  const seen = new Set();
  return clusters
    .filter(cluster => cluster && cluster.id && !seen.has(cluster.id) && seen.add(cluster.id))
    .slice(0, 18);
}

function buildBeyondDataReadingPaths(records, clusters, matrixRows, currentQuery = "") {
  const rows = Array.isArray(matrixRows) ? matrixRows : [];
  const allRecordIds = (Array.isArray(records) ? records : []).map(record => String(record.id)).filter(Boolean);
  const sourceCluster = (clusters || []).find(cluster => cluster.type === "source_position");
  const absenceCluster = (clusters || []).find(cluster => cluster.type === "absence");
  const keywordCluster = (clusters || []).find(cluster => cluster.type === "keyword");
  const counterSearches = rows
    .map(row => row.suggestedCounterSearch)
    .filter(Boolean)
    .slice(0, 4)
    .map(query => ({ query, reason:"Use this search to move beyond the selected record labels." }));
  return [
    sourceCluster ? {
      title:"From source position to relation",
      why:"Start with source type, then compare what each record makes easy or difficult to see.",
      recordIds:sourceCluster.recordIds || allRecordIds,
      counterSearches
    } : null,
    absenceCluster ? {
      title:"From absence to counter-search",
      why:"Follow repeated absences as search paths rather than treating missing fields as empty space.",
      recordIds:absenceCluster.recordIds || allRecordIds,
      counterSearches:absenceCluster.counterSearches || counterSearches
    } : null,
    keywordCluster ? {
      title:"From repeated language to context",
      why:"Use shared terms as anchors, then search outward for authorship, place, practice and reception.",
      recordIds:keywordCluster.recordIds || allRecordIds,
      counterSearches:keywordCluster.counterSearches || counterSearches
    } : null,
    {
      title:"Build a careful redescription",
      why:"Compare what can be said from visible metadata with what needs another source or cultural care.",
      recordIds:allRecordIds,
      counterSearches
    }
  ].filter(Boolean).slice(0, 4);
}

function normalizeBeyondDataMapAnalysis(input, currentQuery = "") {
  const inputObject = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const records = (Array.isArray(input) ? input : Array.isArray(inputObject.records) ? inputObject.records : [])
    .filter(Boolean);
  const matrixRows = (Array.isArray(inputObject.matrixRows) && inputObject.matrixRows.length)
    ? inputObject.matrixRows
    : records.map(record => createBeyondDataMatrixRow(record, currentQuery));
  const sharedTerms = (Array.isArray(inputObject.sharedTerms) && inputObject.sharedTerms.length)
    ? inputObject.sharedTerms
    : buildBeyondDataKeywordNodes(records, matrixRows, currentQuery);
  const clusters = Array.isArray(inputObject.clusters)
    ? inputObject.clusters
    : buildBeyondDataDefaultClusters(records, matrixRows, sharedTerms, currentQuery);
  const suggestedReadingPaths = Array.isArray(inputObject.suggestedReadingPaths)
    ? inputObject.suggestedReadingPaths
    : buildBeyondDataReadingPaths(records, clusters, matrixRows, currentQuery);
  const visualMap = inputObject.visualMap && typeof inputObject.visualMap === "object"
    ? {
      ...inputObject.visualMap,
      nodes:Array.isArray(inputObject.visualMap.nodes) ? inputObject.visualMap.nodes : [],
      edges:Array.isArray(inputObject.visualMap.edges) ? inputObject.visualMap.edges : [],
      legend:Array.isArray(inputObject.visualMap.legend) ? inputObject.visualMap.legend : []
    }
    : null;
  return {
    ...inputObject,
    records,
    matrixRows,
    sharedTerms,
    clusters,
    suggestedReadingPaths,
    visualMap
  };
}

function createBeyondDataMap(analysis, currentQuery = "") {
  analysis = normalizeBeyondDataMapAnalysis(analysis, currentQuery);
  const title = "Relational Reading Map";
  const subtitle = "A map of selected records by source position, visible labels, absences and counter-search paths.";
  const generatedAt = new Date().toISOString();
  const removedRecordIds = new Set((beyondDataMapState.removedRecordIds || []).map(String));
  const removedNodeIds = new Set((beyondDataMapState.removedNodeIds || []).map(String));

  // 1. FILTER RECORDS
  const activeRecords = analysis.records.filter(r => !removedRecordIds.has(String(r.id)));

  // 2. CENTRE QUERY NODE (Ring 0)
  const queryNode = {
    id: "query",
    type: "query",
    label: currentQuery || "Selected map theme",
    shortLabel: currentQuery || "Theme",
    description: currentQuery ? `Current search query framing the map.` : "The selected records form the centre of this map.",
    ring: 0,
    radius: 0,
    size: 20, // radius
    weight: activeRecords.length,
    recordIds: activeRecords.map(r => String(r.id))
  };

  // 3. SOURCE POSITION NODES (Ring 1, max 8)
  const sourcePositionsMap = new Map();
  activeRecords.forEach(record => {
    const row = analysis.matrixRows.find(item => String(item.recordId) === String(record.id));
    const rawSP = row ? row.sourcePosition : (record.sourceType || "unclear");
    let classified = "institutional record"; // fallback
    const l = String(rawSP || "").toLowerCase();
    if (l.includes("academic") || l.includes("publication") || l.includes("book")) classified = "academic source";
    else if (l.includes("institutional") || l.includes("catalog")) classified = "institutional record";
    else if (l.includes("image") || l.includes("object")) classified = "image/object record";
    else if (l.includes("community") || l.includes("person") || l.includes("maker")) classified = "community source";
    else if (l.includes("media") || l.includes("design") || l.includes("video") || l.includes("audio")) classified = "media/design source";

    if (!sourcePositionsMap.has(classified)) {
      sourcePositionsMap.set(classified, {
        id: `source-${slugify(classified)}`,
        type: "source_position",
        label: classified.charAt(0).toUpperCase() + classified.slice(1),
        shortLabel: classified,
        description: `Source position category: ${classified}.`,
        ring: 1,
        radius: 78,
        size: 9, // radius (diameter 18px)
        weight: 0,
        recordIds: []
      });
    }
    const spNode = sourcePositionsMap.get(classified);
    spNode.weight += 1;
    spNode.recordIds.push(String(record.id));
  });

  const sourcePositionNodes = Array.from(sourcePositionsMap.values())
    .filter(n => !removedNodeIds.has(n.id))
    .slice(0, 8);

  // 4. RECORD NODES (Ring 2, max 40)
  const recordNodes = [];
  const maxRecordsCap = 40;
  const recordsToMap = activeRecords.slice(0, maxRecordsCap - 1);
  const remainingRecords = activeRecords.slice(maxRecordsCap - 1);

  recordsToMap.forEach(record => {
    recordNodes.push({
      id: String(record.id),
      type: "record",
      label: record.title || "Record",
      shortLabel: truncateCardSummary(record.title || "Record", 24),
      description: record.description || `Selected record: ${record.title}.`,
      ring: 2,
      radius: 152,
      size: 7, // radius (diameter 14px)
      weight: 1,
      recordIds: [String(record.id)]
    });
  });

  if (remainingRecords.length > 0) {
    recordNodes.push({
      id: "record-cluster-more",
      type: "cluster",
      label: `+${remainingRecords.length} more records`,
      shortLabel: `+${remainingRecords.length} records`,
      description: `Grouped records to keep map readable: ${remainingRecords.map(r => r.title).slice(0, 10).join(", ")}`,
      ring: 2,
      radius: 152,
      size: 11, // radius (diameter 22px)
      weight: remainingRecords.length,
      recordIds: remainingRecords.map(r => String(r.id))
    });
  }

  const finalRecordNodes = recordNodes.filter(n => !removedNodeIds.has(n.id));
  const recordIdsMapped = new Set(finalRecordNodes.flatMap(n => n.recordIds));

  // 5. KEYWORDS/TAGS NODES (Ring 3, max 45)
  const keywordMap = new Map();
  activeRecords.forEach(record => {
    if (!recordIdsMapped.has(String(record.id))) return;
    const row = analysis.matrixRows.find(item => String(item.recordId) === String(record.id));
    const terms = [
      ...(record.tags || []),
      row ? row.provider : record.provider,
      row ? row.sourcePosition : record.sourceType
    ].filter(Boolean);

    const titlePhrases = extractBeyondDataKeywordPhrases(record.title, { source: "title", currentQuery }).map(item => item.term);
    const descPhrases = extractBeyondDataKeywordPhrases(record.description, { source: "description", currentQuery }).map(item => item.term);

    const allRecordTerms = [
      ...terms,
      ...titlePhrases,
      ...descPhrases
    ];

    const stop = getBeyondDataKeywordStopwords(currentQuery);
    const seenInRecord = new Set();

    allRecordTerms.forEach(rawTerm => {
      const term = normalizeBeyondDataKeywordTerm(rawTerm, currentQuery);
      if (!term || stop.has(term) || seenInRecord.has(term)) return;
      seenInRecord.add(term);

      if (!keywordMap.has(term)) {
        keywordMap.set(term, {
          id: `keyword-${slugify(term)}`,
          type: (record.tags || []).includes(rawTerm) ? "tag" : "keyword",
          label: term,
          shortLabel: term,
          description: `“${term}” appears in metadata. Relate this keyword to source concepts.`,
          ring: 3,
          radius: 228,
          size: 9, // radius
          weight: 0,
          recordIds: [],
          source: (record.tags || []).includes(rawTerm) ? "tag" : "title"
        });
      }
      const entry = keywordMap.get(term);
      entry.weight += 1;
      entry.recordIds.push(String(record.id));
    });
  });

  const queryWords = new Set(beyondLabelImportantWords(currentQuery).map(w => w.toLowerCase()));
  const keywordNodes = Array.from(keywordMap.values())
    .filter(n => !removedNodeIds.has(n.id) && n.weight >= 1)
    .sort((a, b) => {
      const aMatch = queryWords.has(a.label.toLowerCase()) || a.label.toLowerCase().includes(currentQuery.toLowerCase());
      const bMatch = queryWords.has(b.label.toLowerCase()) || b.label.toLowerCase().includes(currentQuery.toLowerCase());
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return b.weight - a.weight;
    })
    .slice(0, 45);

  const maxKwWeight = Math.max(...keywordNodes.map(n => n.weight), 1);
  keywordNodes.forEach(n => {
    n.size = 8 + Math.round((n.weight / maxKwWeight) * 6);
  });

  // 6. ABSENCE NODES (Ring 4, max 20)
  const absencesMap = new Map();
  activeRecords.forEach(record => {
    if (!recordIdsMapped.has(String(record.id))) return;
    const row = analysis.matrixRows.find(item => String(item.recordId) === String(record.id));
    if (!row || !row.possibleAbsences) return;

    row.possibleAbsences.forEach(absence => {
      if (!absencesMap.has(absence)) {
        absencesMap.set(absence, {
          id: `absence-${slugify(absence)}`,
          type: "absence",
          label: absence,
          shortLabel: absence,
          description: `This absence dimension shows what catalog labels or records do not easily display.`,
          ring: 4,
          radius: 304,
          size: 9, // radius
          weight: 0,
          recordIds: []
        });
      }
      const entry = absencesMap.get(absence);
      entry.weight += 1;
      entry.recordIds.push(String(record.id));
    });
  });

  const absenceNodes = Array.from(absencesMap.values())
    .filter(n => !removedNodeIds.has(n.id))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 20);

  const maxAbsWeight = Math.max(...absenceNodes.map(n => n.weight), 1);
  absenceNodes.forEach(n => {
    n.size = 8 + Math.round((n.weight / maxAbsWeight) * 5);
  });

  // 7. COUNTER-SEARCH NODES (Ring 5, max 16)
  const counterSearchesMap = new Map();
  activeRecords.forEach(record => {
    if (!recordIdsMapped.has(String(record.id))) return;
    const row = analysis.matrixRows.find(item => String(item.recordId) === String(record.id));
    if (!row) return;

    const suggested = row.suggestedCounterSearch;
    if (suggested) {
      if (!counterSearchesMap.has(suggested)) {
        counterSearchesMap.set(suggested, {
          id: `counter-${slugify(suggested)}`,
          type: "counter_search",
          label: suggested,
          shortLabel: truncateCardSummary(suggested, 24),
          description: `Counter-search query resisting standard metadata boundaries: “${suggested}”.`,
          ring: 5,
          radius: 388,
          size: 8, // radius
          weight: 0,
          recordIds: [],
          query: suggested
        });
      }
      const entry = counterSearchesMap.get(suggested);
      entry.weight += 1;
      entry.recordIds.push(String(record.id));
    }
  });

  analysis.clusters.forEach(cluster => {
    (cluster.counterSearches || []).forEach(cs => {
      const q = cs.query;
      if (!q) return;
      const clusterActiveRecords = (cluster.recordIds || []).filter(id => recordIdsMapped.has(String(id)));
      if (clusterActiveRecords.length === 0) return;

      if (!counterSearchesMap.has(q)) {
        counterSearchesMap.set(q, {
          id: `counter-${slugify(q)}`,
          type: "counter_search",
          label: q,
          shortLabel: truncateCardSummary(q, 24),
          description: cs.reason || `Counter-search query: “${q}”.`,
          ring: 5,
          radius: 388,
          size: 8,
          weight: 0,
          recordIds: [],
          query: q
        });
      }
      const entry = counterSearchesMap.get(q);
      clusterActiveRecords.forEach(id => {
        if (!entry.recordIds.includes(String(id))) {
          entry.recordIds.push(String(id));
          entry.weight += 1;
        }
      });
    });
  });

  const counterSearchNodes = Array.from(counterSearchesMap.values())
    .filter(n => !removedNodeIds.has(n.id))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 16);

  const maxCsWeight = Math.max(...counterSearchNodes.map(n => n.weight), 1);
  counterSearchNodes.forEach(n => {
    n.size = 7 + Math.round((n.weight / maxCsWeight) * 4);
  });

  // Deduplicate by ID (same slugified label from two different raw terms is the most common source)
  const _seenNodeIds = new Set();
  const nodes = [
    queryNode,
    ...sourcePositionNodes,
    ...finalRecordNodes,
    ...keywordNodes,
    ...absenceNodes,
    ...counterSearchNodes
  ].filter(n => {
    if (!n || !n.id || _seenNodeIds.has(n.id)) return false;
    _seenNodeIds.add(n.id);
    return true;
  });

  const nodesById = new Map(nodes.map(n => [n.id, n]));

  // 8. ASSIGN BASE ANGLES BY CLUSTERING
  sourcePositionNodes.forEach((node, i) => {
    node.baseAngle = (i / sourcePositionNodes.length) * Math.PI * 2 - Math.PI / 2;
  });

  const recordsBySource = new Map();
  sourcePositionNodes.forEach(sp => recordsBySource.set(sp.id, []));
  const otherRecords = [];

  finalRecordNodes.forEach(recNode => {
    const recId = recNode.recordIds[0];
    let classifiedSpId = "";
    sourcePositionNodes.forEach(sp => {
      if (sp.recordIds.includes(recId)) {
        classifiedSpId = sp.id;
      }
    });

    if (classifiedSpId) {
      recordsBySource.get(classifiedSpId).push(recNode);
    } else {
      otherRecords.push(recNode);
    }
  });

  sourcePositionNodes.forEach(sp => {
    const list = recordsBySource.get(sp.id);
    if (list.length === 0) return;
    const centerAngle = sp.baseAngle;
    const sectorWidth = 0.5;
    const count = list.length;
    list.forEach((recNode, i) => {
      const offset = count > 1 ? ((i / (count - 1)) - 0.5) * sectorWidth : 0;
      recNode.baseAngle = centerAngle + offset;
    });
  });

  otherRecords.forEach((node, i) => {
    node.baseAngle = (i / Math.max(otherRecords.length, 1)) * Math.PI * 2;
  });

  keywordNodes.forEach(kwNode => {
    let sumCos = 0;
    let sumSin = 0;
    let count = 0;
    kwNode.recordIds.forEach(recId => {
      const recNode = nodesById.get(recId);
      if (recNode && recNode.baseAngle !== undefined) {
        sumCos += Math.cos(recNode.baseAngle);
        sumSin += Math.sin(recNode.baseAngle);
        count++;
      }
    });
    if (count > 0) {
      kwNode.baseAngle = Math.atan2(sumSin, sumCos);
    } else {
      kwNode.baseAngle = Math.random() * Math.PI * 2;
    }
  });

  absenceNodes.forEach(absNode => {
    let sumCos = 0;
    let sumSin = 0;
    let count = 0;
    absNode.recordIds.forEach(recId => {
      const recNode = nodesById.get(recId);
      if (recNode && recNode.baseAngle !== undefined) {
        sumCos += Math.cos(recNode.baseAngle);
        sumSin += Math.sin(recNode.baseAngle);
        count++;
      }
    });
    if (count > 0) {
      absNode.baseAngle = Math.atan2(sumSin, sumCos);
    } else {
      absNode.baseAngle = Math.random() * Math.PI * 2;
    }
  });

  counterSearchNodes.forEach(csNode => {
    let sumCos = 0;
    let sumSin = 0;
    let count = 0;
    csNode.recordIds.forEach(recId => {
      const recNode = nodesById.get(recId);
      if (recNode && recNode.baseAngle !== undefined) {
        sumCos += Math.cos(recNode.baseAngle);
        sumSin += Math.sin(recNode.baseAngle);
        count++;
      }
    });
    absenceNodes.forEach(absNode => {
      const intersection = absNode.recordIds.filter(id => csNode.recordIds.includes(id));
      if (intersection.length > 0 && absNode.baseAngle !== undefined) {
        sumCos += Math.cos(absNode.baseAngle) * 2;
        sumSin += Math.sin(absNode.baseAngle) * 2;
        count += 2;
      }
    });
    if (count > 0) {
      csNode.baseAngle = Math.atan2(sumSin, sumCos);
    } else {
      csNode.baseAngle = Math.random() * Math.PI * 2;
    }
  });

  // 9. CREATE EDGES
  const edges = [];
  let edgeIdCounter = 1;
  const addEdge = (fromId, toId, type, strength = 1) => {
    if (!nodesById.has(fromId) || !nodesById.has(toId)) return;
    edges.push({
      id: `edge-${edgeIdCounter++}`,
      from: fromId,
      to: toId,
      type: type,
      strength: strength
    });
  };

  sourcePositionNodes.forEach(sp => {
    addEdge(queryNode.id, sp.id, "related_to", 1);
  });

  finalRecordNodes.forEach(recNode => {
    const recId = recNode.recordIds[0];
    sourcePositionNodes.forEach(sp => {
      if (sp.recordIds.includes(recId)) {
        addEdge(sp.id, recNode.id, "has_source_position", 1);
      }
    });
  });

  finalRecordNodes.forEach(recNode => {
    const recId = recNode.recordIds[0];
    keywordNodes.forEach(kw => {
      if (kw.recordIds.includes(recId)) {
        addEdge(recNode.id, kw.id, "contains_keyword", 1);
      }
    });
  });

  finalRecordNodes.forEach(recNode => {
    const recId = recNode.recordIds[0];
    absenceNodes.forEach(abs => {
      if (abs.recordIds.includes(recId)) {
        addEdge(recNode.id, abs.id, "raises_absence", 1);
      }
    });
  });

  counterSearchNodes.forEach(cs => {
    absenceNodes.forEach(abs => {
      const commonRecords = abs.recordIds.filter(id => cs.recordIds.includes(id));
      if (commonRecords.length > 0) {
        addEdge(abs.id, cs.id, "leads_to_search", 1.5);
      }
    });
    finalRecordNodes.forEach(recNode => {
      const recId = recNode.recordIds[0];
      if (cs.recordIds.includes(recId)) {
        addEdge(recNode.id, cs.id, "leads_to_search", 0.5);
      }
    });
  });

  const legend = [
    { type: "record", label: "Record" },
    { type: "keyword", label: "Keyword" },
    { type: "tag", label: "Tag" },
    { type: "source_position", label: "Source position" },
    { type: "absence", label: "Absence" },
    { type: "counter_search", label: "Counter-search" }
  ];

  const summaryLines = [
    "Beyond the Data Map",
    `Query: ${currentQuery || "(none)"}`,
    `Selected records: ${activeRecords.length}`,
    `Source frames: ${sourcePositionNodes.length}`,
    `Shared keywords: ${keywordNodes.slice(0, 6).map(node => node.label).join(", ") || "None"}`,
    `Repeated absences: ${absenceNodes.slice(0, 4).map(node => node.label).join(", ") || "None"}`,
    `Suggested counter-searches: ${counterSearchNodes.slice(0, 4).map(node => node.label).join("; ") || "None"}`,
    "Care note: Generated from visible metadata and selected records. Use as an inquiry map, not a final classification."
  ];

  const visualMap = {
    title,
    subtitle,
    generatedAt,
    currentQuery,
    mapVersion:beyondDataMapState.mapVersion || 0,
    nodes,
    edges:edges.filter(edge => nodesById.has(String(edge.from)) && nodesById.has(String(edge.to))),
    legend,
    summary:summaryLines.join("\n")
  };

  return {
    ...analysis,
    currentQuery,
    visualMap
  };
}

function createFlowLayout(nodes) {
  const groups = {
    query:["query"],
    first:["record"],
    second:["keyword","tag","data_dimension","source_position","visible_label"],
    third:["cluster","absence"],
    fourth:["counter_search"]
  };
  const columnSpacing = 260;
  const rowSpacing = 110;
  const positions = [];
  const grouped = {1:[],2:[],3:[],4:[]};
  nodes.forEach(node => {
    if (groups.query.includes(node.type)) grouped[1].push(node);
    else if (groups.first.includes(node.type)) grouped[1].push(node);
    else if (groups.second.includes(node.type)) grouped[2].push(node);
    else if (groups.third.includes(node.type)) grouped[3].push(node);
    else grouped[4].push(node);
  });
  const layoutNodes = nodes.map(node => ({...node}));
  Object.entries(grouped).forEach(([column, list]) => {
    const x = 120 + (Number(column) - 1) * columnSpacing;
    list.forEach((node, index) => {
      const item = layoutNodes.find(item => item.id === node.id);
      if (!item) return;
      item.x = x;
      item.y = 80 + index * rowSpacing;
      if (item.type === "query") {
        item.x = 120;
        item.y = 80;
      }
      if (item.type === "record" && item.id === "record-more") {
        item.x = x;
        item.y = 80 + Math.max(0, grouped[1].length - 1) * rowSpacing + 16;
      }
    });
  });
  return layoutNodes;
}

function createClusterLayout(nodes) {
  const centerX = 520;
  const centerY = 180;
  const radius = 220;
  const recordRadius = 120;
  const counterRadius = 310;
  const queryNode = nodes.find(node => node.type === "query");
  const clusterNodes = nodes.filter(node => node.type === "cluster");
  const sourceNodes = nodes.filter(node => node.type === "source_position");
  const visibleNodes = nodes.filter(node => node.type === "visible_label");
  const absenceNodes = nodes.filter(node => node.type === "absence");
  const recordNodes = nodes.filter(node => node.type === "record");
  const counterNodes = nodes.filter(node => node.type === "counter_search");
  const layoutNodes = nodes.map(node => ({...node}));
  if (queryNode) {
    const q = layoutNodes.find(item => item.id === queryNode.id);
    q.x = centerX;
    q.y = centerY;
  }
  const placeRing = (items, ringRadius, offset = 0) => {
    const count = items.length || 1;
    items.forEach((item, index) => {
      const node = layoutNodes.find(n => n.id === item.id);
      if (!node) return;
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2 + offset;
      node.x = centerX + Math.cos(angle) * ringRadius;
      node.y = centerY + Math.sin(angle) * ringRadius;
    });
  };
  placeRing(clusterNodes, radius, -0.4);
  placeRing(sourceNodes, radius - 70, 0.8);
  placeRing(visibleNodes, radius - 70, -1.2);
  placeRing(absenceNodes, radius - 40, 0.2);
  placeRing(recordNodes, recordRadius, 0.5);
  placeRing(counterNodes, counterRadius, -0.7);
  return layoutNodes;
}

function createSourcePositionLayout(nodes) {
  const layoutNodes = nodes.map(node => ({...node}));
  const queryNode = layoutNodes.find(node => node.type === "query");
  if (queryNode) {
    queryNode.x = 140;
    queryNode.y = 90;
  }
  const sourceNodes = layoutNodes.filter(node => node.type === "source_position");
  sourceNodes.forEach((node, index) => {
    node.x = 260;
    node.y = 90 + index * 140;
  });
  const recordNodes = layoutNodes.filter(node => node.type === "record");
  recordNodes.forEach((node, index) => {
    const parent = sourceNodes[index % Math.max(sourceNodes.length, 1)];
    node.x = parent ? parent.x + 180 : 420;
    node.y = 80 + (index % 4) * 110 + Math.floor(index / 4) * 10;
  });
  const restNodes = layoutNodes.filter(node => !["query","source_position","record"].includes(node.type));
  restNodes.forEach((node, index) => {
    node.x = 560 + Math.floor(index / 6) * 220;
    node.y = 80 + (index % 6) * 100;
  });
  return layoutNodes;
}

function getBeyondDataMapSummary(visualMap) {
  return visualMap.summary || "";
}

function getBeyondDataCompactNodeDescription(node) {
  if (!node) return "";
  const count = node.recordIds?.length || 0;
  if (node.type === "keyword" || node.type === "tag") {
    if (node.source === "query") return "From the current search.";
    if (node.source === "tag" || node.source === "subject") return "Explicit tag or subject.";
    if (node.source === "provider") return "Shared source term.";
    if (count > 1) return `Appears in ${count} selected records.`;
    return "Drawn from selected record language.";
  }
  if (node.type === "data_dimension") return "Reading dimension across selected records.";
  return node.description || "";
}

function getBeyondDataNodeBadge(type = "") {
  switch (type) {
    case "record": return "Record";
    case "keyword": return "Keyword";
    case "tag": return "Tag";
    case "data_dimension": return "Dimension";
    case "source_position": return "Source";
    case "absence": return "Absence";
    case "counter_search": return "Counter-search";
    case "visible_label": return "Label";
    case "cluster": return "Cluster";
    case "query": return "Query";
    default: return "Point";
  }
}

function renderBeyondDataIcon(name) {
  const attrs = `width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"`;
  if (name === "trash") {
    return `<svg ${attrs}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>`;
  }
  if (name === "eye-off") {
    return `<svg ${attrs}><path d="M3 3l18 18"/><path d="M10.6 10.6A2 2 0 0 0 13.4 13.4"/><path d="M9.9 4.24A10.7 10.7 0 0 1 12 4c7 0 10 8 10 8a14.3 14.3 0 0 1-3.1 4.5"/><path d="M6.6 6.6C3.2 8.9 2 12 2 12s3 8 10 8a10.9 10.9 0 0 0 4.1-.8"/></svg>`;
  }
  return `<svg ${attrs}><circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`;
}

function renderBeyondDataSimpleNodeCard(node, options = {}) {
  if (!node) return "";
  const active = String(beyondDataMapState.activeNodeId || "query") === String(node.id);
  const hovered = String(beyondDataMapState.hoveredNodeId || "") === String(node.id);
  const classes = [
    "bdm-simple-card",
    `bdm-simple-card--${String(node.type || "point").replace(/_/g, "-")}`,
    active ? "is-active" : "",
    hovered ? "is-hovered" : ""
  ].filter(Boolean).join(" ");
  const title = node.label || "Map point";
  const titleText = truncateCardSummary(title, options.titleLength || (node.type === "record" ? 72 : 92));
  const description = getBeyondDataCompactNodeDescription(node);
  const compact = value => String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const titleCompact = compact(title);
  const descriptionCompact = compact(description);
  const shouldShowDescription = Boolean(description)
    && descriptionCompact !== titleCompact
    && !titleCompact.includes(descriptionCompact)
    && !descriptionCompact.includes(titleCompact);
  const recordCount = node.recordIds?.length || 0;
  const canRemoveRecord = node.type === "record" && node.id !== "record-more";
  const canHide = !["query", "record"].includes(node.type || "");
  const action = canRemoveRecord
    ? `<button type="button" class="bdm-icon-button bdm-icon-button--danger bdm-simple-icon-action" data-beyond-data-remove-record="${escapeHtml(node.id)}" aria-label="Remove ${escapeHtml(title)} from map" title="Remove from map">${renderBeyondDataIcon("trash")}</button>`
    : canHide
      ? `<button type="button" class="bdm-icon-button bdm-simple-icon-action" data-beyond-data-hide-node="${escapeHtml(node.id)}" aria-label="Hide ${escapeHtml(title)} from map" title="Hide from map">${renderBeyondDataIcon("eye-off")}</button>`
      : "";
  const count = recordCount && node.type !== "record"
    ? `<span>${recordCount} record${recordCount !== 1 ? "s" : ""}</span>`
    : "";
  return `<article class="${classes}">
    <div class="bdm-simple-card-header">
      <button type="button" class="bdm-simple-card-main" data-beyond-data-node="${escapeHtml(node.id)}" aria-pressed="${active ? "true" : "false"}">
        <span class="bdm-simple-kicker">${escapeHtml(getBeyondDataNodeBadge(node.type))}</span>
        <strong>${escapeHtml(titleText)}</strong>
        ${shouldShowDescription ? `<p>${escapeHtml(truncateCardSummary(description, options.descriptionLength || 120))}</p>` : ""}
        ${count ? `<div class="bdm-simple-meta">${count}</div>` : ""}
      </button>
      ${action ? `<div class="bdm-simple-card-actions">${action}</div>` : ""}
    </div>
  </article>`;
}

function renderBeyondDataSimpleRecordRow(node) {
  if (!node) return "";
  const active = String(beyondDataMapState.activeNodeId || "query") === String(node.id);
  const title = node.label || "Untitled record";
  const rawDesc = getBeyondDataCompactNodeDescription(node);
  // Suppress description if it duplicates or echoes the title (common for image records)
  const titleNorm = title.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 28);
  const descNorm = (rawDesc || "").toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 28);
  const description = rawDesc && descNorm !== titleNorm ? rawDesc : "";
  return `<article class="bdm-simple-record-row ${active ? "is-active" : ""}">
    <button type="button" class="bdm-simple-row-main" data-beyond-data-node="${escapeHtml(node.id)}" aria-pressed="${active ? "true" : "false"}">
      <strong>${escapeHtml(truncateCardSummary(title, 82))}</strong>
      ${description ? `<p>${escapeHtml(truncateCardSummary(description, 96))}</p>` : ""}
    </button>
    <button type="button" class="bdm-icon-button bdm-icon-button--danger bdm-simple-icon-action" data-beyond-data-remove-record="${escapeHtml(node.id)}" aria-label="Remove ${escapeHtml(title)} from map" title="Remove from map">${renderBeyondDataIcon("trash")}</button>
  </article>`;
}

function renderBeyondDataSimpleFramePill(node) {
  if (!node) return "";
  const active = String(beyondDataMapState.activeNodeId || "query") === String(node.id);
  const title = node.label || "Map point";
  const recordCount = node.recordIds?.length || 0;
  const description = getBeyondDataCompactNodeDescription(node);
  return `<article class="bdm-simple-frame-pill bdm-simple-frame-pill--${String(node.type || "point").replace(/_/g, "-")} ${active ? "is-active" : ""}">
    <button type="button" class="bdm-simple-frame-main" data-beyond-data-node="${escapeHtml(node.id)}" aria-pressed="${active ? "true" : "false"}">
      <strong>${escapeHtml(truncateCardSummary(title, 54))}</strong>
      ${recordCount ? `<em>${recordCount} record${recordCount !== 1 ? "s" : ""}</em>` : ""}
      ${description ? `<p>${escapeHtml(truncateCardSummary(description, 72))}</p>` : ""}
    </button>
    <button type="button" class="bdm-icon-button bdm-simple-icon-action" data-beyond-data-hide-node="${escapeHtml(node.id)}" aria-label="Hide ${escapeHtml(title)} from map" title="Hide from map">${renderBeyondDataIcon("eye-off")}</button>
  </article>`;
}

function renderBeyondDataSimpleSearchPanel(node) {
  if (!node) {
    return `<article class="bdm-simple-search-panel">
      <span>Search otherwise</span>
      <strong>No counter-search generated yet</strong>
      <p>Select more records or change grouping to surface a sharper search path.</p>
    </article>`;
  }
  const active = String(beyondDataMapState.activeNodeId || "query") === String(node.id);
  const query = node.query || node.label || "Search selected records";
  const description = getBeyondDataCompactNodeDescription(node);
  return `<article class="bdm-simple-search-panel ${active ? "is-active" : ""}">
    <div class="bdm-simple-search-panel-head">
      <button type="button" class="bdm-simple-search-main" data-beyond-data-node="${escapeHtml(node.id)}" aria-pressed="${active ? "true" : "false"}">
        <span>Counter-search</span>
        <strong>${escapeHtml(truncateCardSummary(query, 88))}</strong>
        ${description ? `<p>${escapeHtml(truncateCardSummary(description, 118))}</p>` : ""}
      </button>
      <button type="button" class="bdm-icon-button bdm-simple-icon-action" data-beyond-data-hide-node="${escapeHtml(node.id)}" aria-label="Hide ${escapeHtml(query)} from map" title="Hide from map">${renderBeyondDataIcon("eye-off")}</button>
    </div>
    <div class="bdm-simple-search-action">
      <span>Suggested search</span>
      <strong>${escapeHtml(query)}</strong>
      <button type="button" data-beyond-data-search="${escapeHtml(query)}">Search this</button>
    </div>
  </article>`;
}

function getBeyondDataCommandTone(type = "") {
  if (type === "query") return "query";
  if (type === "record") return "record";
  if (type === "keyword" || type === "tag" || type === "data_dimension") return "keyword";
  if (type === "absence" || type === "care" || type === "living_practice") return "absence";
  if (type === "counter_search") return "counter";
  if (type === "source_position" || type === "visible_label" || type === "cluster") return "source";
  return "point";
}

function getBeyondDataCommandGlyph(type = "") {
  if (type === "query") return "Q";
  if (type === "record") return "R";
  if (type === "keyword" || type === "tag") return "#";
  if (type === "data_dimension") return "D";
  if (type === "absence") return "!";
  if (type === "counter_search") return "S";
  if (type === "source_position") return "P";
  if (type === "visible_label") return "L";
  if (type === "cluster") return "C";
  return "·";
}

function createBeyondDataCommandLayout(visualMap) {
  const nodes = Array.isArray(visualMap?.nodes) ? visualMap.nodes : [];
  const center = { x: 50, y: 51 };
  const buckets = {
    query:nodes.filter(node => node.type === "query").slice(0, 1),
    source:nodes.filter(node => ["source_position","visible_label","cluster"].includes(node.type || "")).slice(0, 7),
    record:nodes.filter(node => node.type === "record").slice(0, 10),
    keyword:nodes.filter(node => ["keyword","tag","data_dimension"].includes(node.type || "")).slice(0, 14),
    absence:nodes.filter(node => node.type === "absence").slice(0, 7),
    counter:nodes.filter(node => node.type === "counter_search").slice(0, 5)
  };
  const placed = new Map();
  const add = (node, x, y, ring) => {
    if (!node || placed.has(String(node.id))) return;
    placed.set(String(node.id), { ...node, cx:Math.max(7, Math.min(93, x)), cy:Math.max(9, Math.min(91, y)), ring });
  };
  add(buckets.query[0] || nodes[0], center.x, center.y, 0);
  const ringDefs = [
    { list:buckets.source, rx:18, ry:13, offset:-0.25, ring:1 },
    { list:buckets.record, rx:29, ry:21, offset:0.42, ring:2 },
    { list:buckets.keyword, rx:40, ry:29, offset:-0.08, ring:3 },
    { list:buckets.absence, rx:47, ry:36, offset:0.72, ring:4 },
    { list:buckets.counter, rx:48, ry:39, offset:2.2, ring:5 }
  ];
  ringDefs.forEach(def => {
    const count = Math.max(def.list.length, 1);
    def.list.forEach((node, index) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2 + def.offset;
      add(node, center.x + Math.cos(angle) * def.rx, center.y + Math.sin(angle) * def.ry, def.ring);
    });
  });
  return Array.from(placed.values());
}

function renderBeyondDataCommandCanvas(analysis) {
  const visualMap = analysis?.visualMap && typeof analysis.visualMap === "object"
    ? analysis.visualMap
    : { nodes:[], edges:[], currentQuery:"", legend:[] };
  const mapNodes = Array.isArray(visualMap.nodes) ? visualMap.nodes : [];
  const mapEdges = Array.isArray(visualMap.edges) ? visualMap.edges : [];
  const records = Array.isArray(analysis?.records) ? analysis.records : [];
  const activeNodeId = beyondDataMapState.activeNodeId || "query";
  const hoveredNodeId = beyondDataMapState.hoveredNodeId || "";
  const positioned = createBeyondDataCommandLayout(visualMap);
  const positionedById = new Map(positioned.map(node => [String(node.id), node]));
  const edgeDefs = mapEdges
    .filter(edge => positionedById.has(String(edge.from)) && positionedById.has(String(edge.to)))
    .slice(0, 38)
    .map(edge => {
      const from = positionedById.get(String(edge.from));
      const to = positionedById.get(String(edge.to));
      const active = [edge.from, edge.to].map(String).includes(String(activeNodeId)) || [edge.from, edge.to].map(String).includes(String(hoveredNodeId));
      const tone = getBeyondDataCommandTone(to?.type || from?.type || "");
      const midX = (from.cx + to.cx) / 2;
      const midY = (from.cy + to.cy) / 2 - 8;
      return `<path class="bdm-command-edge bdm-command-edge--${tone}${active ? " is-active" : ""}" d="M ${from.cx} ${from.cy} Q ${midX} ${midY} ${to.cx} ${to.cy}" />`;
    }).join("");
  const nodeMarkup = positioned.map(node => {
    const active = String(node.id) === String(activeNodeId);
    const hovered = String(node.id) === String(hoveredNodeId);
    const tone = getBeyondDataCommandTone(node.type || "");
    const count = node.recordIds?.length || 0;
    const label = node.label || "Map point";
    return `<button type="button"
      class="bdm-command-node bdm-command-node--${tone}${active ? " is-active" : ""}${hovered ? " is-hovered" : ""}"
      style="left:${node.cx}%; top:${node.cy}%;"
      data-beyond-data-node="${escapeHtml(node.id)}"
      aria-pressed="${active ? "true" : "false"}"
      aria-label="${escapeHtml(`${getBeyondDataNodeBadge(node.type)}: ${label}`)}"
      title="${escapeHtml(label)}">
        <span class="bdm-command-node-core"><span>${escapeHtml(getBeyondDataCommandGlyph(node.type))}</span></span>
        <span class="bdm-command-node-label">${escapeHtml(truncateCardSummary(label, node.type === "query" ? 48 : 28))}</span>
        ${count && node.type !== "query" ? `<span class="bdm-command-node-count">${count}</span>` : ""}
    </button>`;
  }).join("");
  const termCount = mapNodes.filter(node => ["keyword","tag","data_dimension"].includes(node.type || "")).length;
  const sourceCount = mapNodes.filter(node => ["source_position","visible_label","cluster"].includes(node.type || "")).length;
  const absenceCount = mapNodes.filter(node => node.type === "absence").length;
  const counterCount = mapNodes.filter(node => node.type === "counter_search").length;
  return `<div class="bdm-command-canvas" data-beyond-data-canvas="true" aria-label="Beyond the Data command map">
    <div class="bdm-command-asset-stage" aria-hidden="true">
      <img class="bdm-command-asset bdm-command-asset--field" src="/assets/beyond-data/network-field.svg" alt="" loading="eager" />
      <img class="bdm-command-asset bdm-command-asset--radar" src="/assets/beyond-data/proximity-radar.svg" alt="" loading="eager" />
    </div>
    <div class="bdm-command-rings" aria-hidden="true">
      <span></span><span></span><span></span><span></span><span></span>
    </div>
    <svg class="bdm-command-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${edgeDefs}</svg>
    ${nodeMarkup}
    <div class="bdm-command-map-title">
      <span>Map</span>
      <strong>${escapeHtml(truncateCardSummary(visualMap.currentQuery || "Selected records", 54))}</strong>
      <em>${records.length} record${records.length !== 1 ? "s" : ""} · ${termCount} terms · ${sourceCount} source frames · ${absenceCount} absences</em>
    </div>
    <div class="bdm-command-data-strip" aria-label="Map metrics">
      <span><strong>${records.length}</strong><em>Records</em></span>
      <span><strong>${termCount}</strong><em>Terms</em></span>
      <span><strong>${sourceCount}</strong><em>Sources</em></span>
      <span><strong>${absenceCount}</strong><em>Absences</em></span>
      <span><strong>${counterCount}</strong><em>Searches</em></span>
    </div>
    <div class="bdm-command-legend" aria-label="Map legend">
      <span><i class="is-record"></i>Records</span>
      <span><i class="is-keyword"></i>Keywords</span>
      <span><i class="is-source"></i>Source position</span>
      <span><i class="is-absence"></i>Absence</span>
      <span><i class="is-counter"></i>Counter-search</span>
    </div>
    <p class="bdm-command-care-note">Generated from visible metadata and selected records. Use as an inquiry map, not a final classification.</p>
  </div>`;
}

function renderBeyondDataInteractiveMapView(analysis) {
  const visualMap = analysis?.visualMap && typeof analysis.visualMap === "object"
    ? analysis.visualMap
    : { nodes:[], edges:[], currentQuery:"", legend:[] };
  const mapNodes = Array.isArray(visualMap.nodes) ? visualMap.nodes : [];
  const mapEdges = Array.isArray(visualMap.edges) ? visualMap.edges : [];
  const records = Array.isArray(analysis?.records) ? analysis.records : [];
  const activeNodeId = beyondDataMapState.activeNodeId || mapNodes[0]?.id || "query";
  const selectedNode = mapNodes.find(node => node.id === activeNodeId) || mapNodes[0];
  clearBeyondDataFlowCache();
  
  // Increment mapVersion so FlowMount fully remounts
  beyondDataMapState.mapVersion = (beyondDataMapState.mapVersion || 0) + 1;
  const flowState = {
    visualMap,
    layout: beyondDataMapState.activeLayout || "keyword",
    viewMode: "radial",
    activeNodeId,
    hoveredNodeId: beyondDataMapState.hoveredNodeId,
    mapVersion: beyondDataMapState.mapVersion,
  };

  try {
    window.__beyondDataFlowLastRender = flowState;
    window.dispatchEvent(new CustomEvent("beyond-data-flow:render", { detail: flowState }));
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent("beyond-data-flow:render", { detail: flowState }));
      } catch (e) {
        // swallow
      }
    }, 80);
  } catch (error) {
    console.warn("Unable to dispatch React Flow render event", error);
  }

  const hiddenCount = (beyondDataMapState.removedNodeIds || []).length + (beyondDataMapState.removedRecordIds || []).length;

  return `<section class="bdm-board bdm-graph-board">
    <div class="bdm-board-head">
      <div>
        <span>Command Map</span>
        <strong>Relation, absence, source position and counter-search</strong>
      </div>
      <div class="bdm-layout-controls" aria-label="Map layout">
        ${hiddenCount ? `<button type="button" class="bdm-layout-button" data-beyond-data-restore-hidden>Restore hidden</button>` : ""}
        <button type="button" class="bdm-layout-button" data-beyond-data-mode="graph">Interactive graph</button>
        <button type="button" class="bdm-layout-button" data-beyond-data-mode="matrix">View matrix</button>
        <button type="button" class="bdm-layout-button" data-beyond-data-mode="clusters">View clusters</button>
      </div>
    </div>
    <div id="beyondDataFlowHost" class="bdm-flow-root bdm-flow-root--full" role="region" aria-label="Interactive relational map canvas">
      <div class="bdm-flow-loading">Preparing interactive map…</div>
    </div>
  </section>`;
}

function renderBeyondDataReactMapView(analysis) {
  const visualMap = analysis?.visualMap && typeof analysis.visualMap === "object"
    ? analysis.visualMap
    : { nodes:[], edges:[], currentQuery:"", legend:[] };
  const mapNodes = Array.isArray(visualMap.nodes) ? visualMap.nodes : [];
  const mapEdges = Array.isArray(visualMap.edges) ? visualMap.edges : [];
  const records = Array.isArray(analysis?.records) ? analysis.records : [];
  const layout = beyondDataMapState.activeLayout || "keyword";
  const activeNodeId = beyondDataMapState.activeNodeId || mapNodes[0]?.id || "query";
  const hoveredNodeId = beyondDataMapState.hoveredNodeId;
  const selectedNode = mapNodes.find(node => node.id === activeNodeId) || mapNodes[0];
  // Increment mapVersion so FlowMount fully remounts (resets isMeasured) each time
  // the Interactive tab is activated, even if the underlying data hasn't changed.
  beyondDataMapState.mapVersion = (beyondDataMapState.mapVersion || 0) + 1;
  const flowState = {
    visualMap,
    layout,
    viewMode: "network",
    activeNodeId,
    hoveredNodeId,
    mapVersion: beyondDataMapState.mapVersion,
  };

  try {
    window.__beyondDataFlowLastRender = flowState;
    window.dispatchEvent(new CustomEvent("beyond-data-flow:render", { detail: flowState }));
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent("beyond-data-flow:render", { detail: flowState }));
      } catch (e) {
        // swallow
      }
    }, 80);
  } catch (error) {
    console.warn("Unable to dispatch React Flow render event", error);
  }

  const layoutButtons = [
    ["keyword", "Keyword map"],
    ["source_position", "Source map"],
    ["cluster", "Cluster map"]
  ].map(([id, label]) => `<button type="button" data-beyond-data-layout="${id}" class="bdm-layout-button${layout === id ? " is-active" : ""}" aria-pressed="${layout === id ? "true" : "false"}">${escapeHtml(label)}</button>`).join("");

  return `<section class="bdm-board bdm-graph-board">
    <div class="bdm-board-head">
      <div>
        <span>Interactive map</span>
        <strong>Explore record relations as an optional canvas</strong>
      </div>
      <div class="bdm-layout-controls" aria-label="Interactive map layout">
        ${layoutButtons}
        <button type="button" class="bdm-layout-button" data-beyond-data-reset-layout>Fit view</button>
      </div>
    </div>
    <div id="beyondDataFlowHost" class="bdm-flow-root bdm-flow-root--full" role="region" aria-label="Interactive relational map canvas">
      <div class="bdm-flow-loading">Preparing interactive map…</div>
    </div>
  </section>`;
}

function renderBeyondDataMapInspector(node, analysis) {
  if (!node) return "<aside class='bdm-inspector'><p>No node selected.</p></aside>";
  const recordCount = node.recordIds?.length || 0;
  const recordChips = (node.recordIds || []).slice(0, 5).map(id => {
    const record = getRecordByIdAny(id) || getSelectedBeyondDataRecords().find(record => String(record.id) === String(id));
    return record ? `<button type="button" data-beyond-label-record="${escapeHtml(record.id)}">${escapeHtml(truncateCardSummary(record.title || "Untitled record", 40))}</button>` : "";
  }).join("");
  let details = "";
  let actionButton = "";
  if (node.type === "record") {
    const record = getRecordByIdAny(node.id) || getSelectedBeyondDataRecords().find(record => String(record.id) === node.id);
    details = `<p><strong>Provider</strong><br>${escapeHtml(record?.provider || record?.source || "Unknown")}</p>
      <p><strong>Source position</strong><br>${escapeHtml(beyondDataSourcePosition(record || {}, analysis.currentQuery || ""))}</p>
      <p><strong>Visible terms</strong><br>${escapeHtml((record ? beyondDataRecordTerms(record, analysis.currentQuery || "") : []).slice(0, 5).join(", ") || "None")}</p>
      <p><strong>Possible absences</strong><br>${escapeHtml((record ? createBeyondLabelReading(record, analysis.currentQuery || "").outsideData.map(item => item.dimension).slice(0, 4).join(", ") : "None"))}</p>`;
    actionButton = `<button type="button" data-beyond-label-record="${escapeHtml(node.id)}">Read beyond the label</button>
      <button type="button" class="secondary" data-beyond-data-remove-record="${escapeHtml(node.id)}">Remove from map</button>`;
  } else if (node.type === "keyword" || node.type === "tag") {
    details = `<p>${escapeHtml(node.description || "Shared term across selected records.")}</p>
      <p><strong>Source</strong><br>${escapeHtml(node.source || "record language")}</p>
      <p><strong>Records using it</strong><br>${recordCount} record${recordCount !== 1 ? "s" : ""}</p>
      <div class="bdm-record-chip-list">${recordChips}</div>`;
    actionButton = `<button type="button" data-beyond-data-search="${escapeHtml(node.query || node.label || "")}">Search this keyword</button>
      <button type="button" class="secondary" data-beyond-data-hide-node="${escapeHtml(node.id)}">Hide from map</button>`;
  } else if (node.type === "data_dimension") {
    details = `<p>${escapeHtml(node.description || "Reading dimension across this map.")}</p>
      <p><strong>Records in this pattern</strong><br>${recordCount} record${recordCount !== 1 ? "s" : ""}</p>
      <div class="bdm-record-chip-list">${recordChips}</div>`;
    actionButton = `<button type="button" data-beyond-data-mode="matrix">View in matrix</button>
      <button type="button" class="secondary" data-beyond-data-hide-node="${escapeHtml(node.id)}">Hide from map</button>`;
  } else if (node.type === "cluster" || node.type === "source_position" || node.type === "visible_label") {
    details = `<p>${escapeHtml(node.description || "Cluster explanation.")}</p>
      <p><strong>Records</strong><br>${recordCount} record${recordCount !== 1 ? "s" : ""}</p>
      <div class="bdm-record-chip-list">${recordChips}</div>`;
    actionButton = `<button type="button" data-beyond-data-action="cluster" data-beyond-data-cluster="${escapeHtml(node.id)}">Read this cluster beyond the data</button>
      <button type="button" class="secondary" data-beyond-data-hide-node="${escapeHtml(node.id)}">Hide from map</button>`;
  } else if (node.type === "absence") {
    details = `<p>${escapeHtml(node.description || "This absence shows what the selected records do not easily carry.")}</p>
      <p><strong>Records</strong><br>${recordCount} record${recordCount !== 1 ? "s" : ""}</p>
      <div class="bdm-record-chip-list">${recordChips}</div>`;
    actionButton = `<button type="button" data-beyond-data-search="${escapeHtml(node.query || analysis.visualMap.currentQuery || "")}">Search this</button>
      <button type="button" class="secondary" data-beyond-data-hide-node="${escapeHtml(node.id)}">Hide from map</button>`;
  } else if (node.type === "counter_search") {
    details = `<p>${escapeHtml(node.description || "Suggested counter-search query.")}</p>`;
    actionButton = `<button type="button" data-beyond-data-search="${escapeHtml(node.query || "")}">Search this</button>
      <button type="button" class="secondary" data-beyond-data-hide-node="${escapeHtml(node.id)}">Hide from map</button>`;
  } else {
    details = `<p>${escapeHtml(node.description || "Map node details.")}</p>`;
  }
  return `<aside class="bdm-inspector" data-node-type="${escapeHtml(node.type || "")}" aria-label="Inspector panel">
    <div>
      <span>${escapeHtml(String(node.type || "point").replace(/_/g, " "))}</span>
      <strong>${escapeHtml(node.label || "Map point")}</strong>
      <p>${escapeHtml(node.description || "Click a node to inspect its meaning and connections.")}</p>
    </div>
    <div class="bdm-inspector-details">${details}</div>
    <div class="bdm-inspector-actions">${actionButton}</div>
  </aside>`;
}

function renderBeyondDataExportView(analysis) {
  const map = analysis?.visualMap && typeof analysis.visualMap === "object"
    ? analysis.visualMap
    : { title:"Beyond the Data Map", subtitle:"Relational reading map", generatedAt:new Date().toISOString(), currentQuery:"", nodes:[], edges:[], legend:[], summary:"" };
  map.nodes = Array.isArray(map.nodes) ? map.nodes : [];
  map.edges = Array.isArray(map.edges) ? map.edges : [];
  map.legend = Array.isArray(map.legend) ? map.legend : [];
  const records = Array.isArray(analysis?.records) ? analysis.records : [];
  const summary = getBeyondDataMapSummary(map);
  return `<section class="beyond-data-panel">
    <div class="beyond-data-section-heading">
      <span>Export this map</span>
      <strong>Download or copy a research artefact</strong>
      <p>Download the visual map or copy a text summary for notes, teaching or research.</p>
    </div>
    <div class="bdm-export-panel">
      <div class="bdm-export-summary">
        <p><strong>${escapeHtml(map.title)}</strong></p>
        <p>${escapeHtml(map.subtitle)}</p>
        <p>Generated: ${escapeHtml(new Date(map.generatedAt).toLocaleString())}</p>
        <p>Selected records: ${records.length}</p>
        <p>Current query: ${escapeHtml(map.currentQuery || "(none)")}</p>
      </div>
      <div class="bdm-export-actions">
        <button type="button" data-beyond-data-export="png">Download PNG</button>
        <button type="button" data-beyond-data-export="jpeg">Download JPEG</button>
        <button type="button" data-beyond-data-export="svg">Download SVG</button>
        <button type="button" data-beyond-data-export="summary">Copy summary</button>
        <button type="button" disabled aria-disabled="true">Save map to Workbench (coming soon)</button>
      </div>
      <div class="bdm-export-note">Exports are generated in your browser from the visible map.</div>
    </div>
    <div class="bdm-export-textarea">
      <label for="bdm-export-summary-text">Map summary</label>
      <textarea id="bdm-export-summary-text" readonly>${escapeHtml(summary)}</textarea>
    </div>
  </section>`;
}

function renderBeyondDataMakingView(analysis) {
  const records = Array.isArray(analysis?.records) ? analysis.records : [];
  const clusters = Array.isArray(analysis?.clusters) ? analysis.clusters : [];
  return `<section class="beyond-data-panel">
    <div class="beyond-data-section-heading">
      <span>How this map was made</span>
      <strong>From selected records to relational nodes</strong>
      <p>The map draws from visible record labels, repeated source positions, possible absences and suggested counter-search pathways.</p>
    </div>
    <div class="bdm-making-grid">
      <article>
        <strong>Selected records</strong>
        <p>${records.length} records were included in the map. The visual map limits visible record nodes to 12 for readability.</p>
      </article>
      <article>
        <strong>Clusters and patterns</strong>
        <p>${clusters.length} cluster${clusters.length !== 1 ? "s" : ""} were generated from source position, repeated terms, provider groups and absences.</p>
      </article>
      <article>
        <strong>Visible labels</strong>
        <p>Local labels and record titles are surfaced as visible-label nodes. That keeps the map grounded in what the record itself shows.</p>
      </article>
      <article>
        <strong>Counter-search paths</strong>
        <p>The map includes suggested counter-search queries to follow absences, raised terms and cluster connections beyond the selected results.</p>
      </article>
    </div>
  </section>`;
}

function renderBeyondDataMapSvgString(visualMap) {
  visualMap = visualMap && typeof visualMap === "object" ? visualMap : {};
  visualMap.nodes = Array.isArray(visualMap.nodes) ? visualMap.nodes : [];
  visualMap.edges = Array.isArray(visualMap.edges) ? visualMap.edges : [];
  visualMap.legend = Array.isArray(visualMap.legend) ? visualMap.legend : [];
  const nodes = createBeyondDataCommandLayout(visualMap).map(node => ({ ...node, x:(node.cx || 50) * 10.8, y:(node.cy || 50) * 6.2 }));
  const edges = visualMap.edges;
  const width = 1080;
  const height = 620;
  const selectedRecordCount = visualMap.nodes.filter(node => node.type === "record" && node.id !== "record-more").length + (visualMap.nodes.find(node => node.id === "record-more")?.recordIds?.length || 0);
  const nodeDefs = nodes.map(node => {
    const tone = getBeyondDataCommandTone(node.type || "");
    const nodeColor = tone === "query" ? "#2f6bff" : tone === "record" ? "#2f6bff" : tone === "keyword" ? "#34d8ff" : tone === "absence" ? "#ff314f" : tone === "counter" ? "#35d39a" : "#9b5cff";
    const glow = tone === "absence" ? "#ff314f" : tone === "keyword" ? "#34d8ff" : tone === "counter" ? "#35d39a" : "#2f6bff";
    const x = node.x || 100;
    const y = node.y || 100;
    const radius = tone === "query" ? 50 : tone === "record" ? 20 : 15;
    return `<g transform="translate(${x}, ${y})">
      <circle r="${radius + 9}" fill="${glow}" opacity="0.12" />
      <circle r="${radius}" fill="${nodeColor}" opacity="${tone === "query" ? "0.95" : "0.88"}" stroke="rgba(255,255,255,0.42)" stroke-width="1" />
      <text x="0" y="${radius + 20}" text-anchor="middle" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="11" font-weight="700" fill="#f7f7fb">${escapeHtml(truncateCardSummary(node.label, tone === "query" ? 34 : 20))}</text>
    </g>`;
  }).join("");
  const edgeDefs = edges.map(edge => {
    const from = nodes.find(node => node.id === edge.from);
    const to = nodes.find(node => node.id === edge.to);
    if (!from || !to) return "";
    const curve = `M ${from.x} ${from.y} C ${from.x + (to.x - from.x) * 0.3} ${from.y} ${to.x - (to.x - from.x) * 0.3} ${to.y} ${to.x} ${to.y}`;
    return `<path d="${curve}" fill="none" stroke="rgba(91,126,255,0.36)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />`;
  }).join("");
  const legendItems = visualMap.legend.map((item, index) => {
    const color = item.type === "record" ? "#2f6bff" : item.type === "keyword" || item.type === "tag" ? "#34d8ff" : item.type === "absence" ? "#ff314f" : item.type === "counter_search" ? "#35d39a" : "#9b5cff";
    return `<g transform="translate(0, ${index * 22})"><circle cx="6" cy="6" r="6" fill="${color}" /><text x="18" y="10" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="12" fill="#dfe3ff">${escapeHtml(item.label)}</text></g>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#070814; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;">
    <defs>
      <radialGradient id="bdmExportGlow" cx="62%" cy="18%" r="62%"><stop stop-color="#241a7a" stop-opacity="0.65"/><stop offset="1" stop-color="#070814" stop-opacity="0"/></radialGradient>
      <pattern id="bdmDots" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.14)"/></pattern>
    </defs>
    <rect width="100%" height="100%" fill="#070814" />
    <rect width="100%" height="100%" fill="url(#bdmExportGlow)" />
    <rect width="100%" height="100%" fill="url(#bdmDots)" opacity="0.42" />
    <g transform="translate(40,40)">
      <text x="0" y="0" font-size="24" font-weight="700" fill="#f7f7fb">${escapeHtml(visualMap.title)}</text>
      <text x="0" y="28" font-size="14" fill="#aeb5d8">${escapeHtml(visualMap.subtitle)}</text>
      <text x="0" y="52" font-size="12" fill="#8088aa">Generated: ${escapeHtml(new Date(visualMap.generatedAt).toLocaleString())}</text>
      <text x="0" y="70" font-size="12" fill="#8088aa">Query: ${escapeHtml(visualMap.currentQuery || "(none)")}</text>
      <text x="0" y="88" font-size="12" fill="#8088aa">Selected records: ${selectedRecordCount}</text>
    </g>
    <g transform="translate(0, 120)">${edgeDefs}${nodeDefs}</g>
    <g transform="translate(40, 520)">${legendItems}</g>
    <text x="40" y="580" font-size="10" fill="#8990b5">Generated from visible metadata and selected records. Read as an inquiry map, not a final classification.</text>
  </svg>`;
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function exportMapAsSvg(visualMap, filename) {
  try {
    const svgString = renderBeyondDataMapSvgString(visualMap);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, filename);
  } catch (error) {
    console.error(error);
    alert("Unable to export SVG map.");
  }
}

function exportMapAsPng(visualMap, filename) {
  const svgString = renderBeyondDataMapSvgString(visualMap);
  const img = new Image();
  const svg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 620;
    const ctx = canvas.getContext("2d");
    if (!ctx) return alert("PNG export is not supported by this browser.");
    ctx.fillStyle = "#070814";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return alert("Unable to create PNG export.");
      downloadBlob(blob, filename);
    }, "image/png");
  };
  img.onerror = () => alert("Unable to generate PNG export.");
  img.src = svg;
}

function exportMapAsJpeg(visualMap, filename) {
  const svgString = renderBeyondDataMapSvgString(visualMap);
  const img = new Image();
  const svg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 620;
    const ctx = canvas.getContext("2d");
    if (!ctx) return alert("JPEG export is not supported by this browser.");
    ctx.fillStyle = "#070814";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return alert("Unable to create JPEG export.");
      downloadBlob(blob, filename);
    }, "image/jpeg", 0.95);
  };
  img.onerror = () => alert("Unable to generate JPEG export.");
  img.src = svg;
}

function copyMapSummary(summary) {
  if (!summary) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(summary).then(() => {
      const message = document.querySelector(".bdm-copy-message");
      if (message) message.textContent = "Summary copied to clipboard.";
    }).catch(() => {
      prompt("Copy the summary below", summary);
    });
  } else {
    prompt("Copy the summary below", summary);
  }
}

function renderBeyondDataMapConfirmation() {
  const action = beyondDataMapState.pendingConfirm;
  if (!action) return "";
  const isNew = action === "new";
  return `<div class="bdm-confirm" role="alertdialog" aria-label="${isNew ? "Start a new map" : "Clear this map"}">
    <div>
      <strong>${isNew ? "Start a new map?" : "Clear this map?"}</strong>
      <p>${isNew ? "This clears the current map workspace and returns you to record selection." : "This removes selected records from the current map. Your library results remain unchanged."}</p>
    </div>
    <div>
      <button type="button" class="secondary" data-beyond-data-cancel-confirm>Cancel</button>
      <button type="button" data-beyond-data-confirm="${escapeHtml(action)}">${isNew ? "Start new map" : "Clear map"}</button>
    </div>
  </div>`;
}

function renderBeyondDataMapEmptyState() {
  return `<section class="bdm-empty-state">
    <span>No records mapped yet</span>
    <h3>Select records from the library to create a relational map.</h3>
    <p>The map workspace stays local to this browser view. Your library results are not changed when you clear or start again.</p>
    <div>
      <button type="button" data-beyond-data-close>Back to results</button>
      <button type="button" class="secondary" data-beyond-data-select-visible>Select first 6 results</button>
    </div>
  </section>`;
}

function renderBeyondDataMapNoMatchesState() {
  return `<section class="bdm-empty-state">
    <span>No matches inside this map</span>
    <h3>No selected records match the current map filter.</h3>
    <p>Clear the map search to return to the full workspace.</p>
    <div>
      <button type="button" data-beyond-data-clear-search>Clear map search</button>
      <button type="button" class="secondary" data-beyond-data-close>Back to results</button>
    </div>
  </section>`;
}

function renderBeyondDataMapAllRemovedState() {
  return `<section class="bdm-empty-state">
    <span>All records removed</span>
    <h3>All records have been removed from this map.</h3>
    <p>You can restore the removed records or start with a fresh library selection.</p>
    <div>
      <button type="button" data-beyond-data-restore-hidden>Restore records</button>
      <button type="button" class="secondary" data-beyond-data-new>Start new map</button>
    </div>
  </section>`;
}

function renderBeyondDataMapModal() {
  const root = ensureBeyondDataMapRoot();
  if (!beyondDataMapState.open) {
    root.innerHTML = "";
    document.body.classList.remove("beyond-data-map-is-open");
    return;
  }
  const allMapRecords = getAllBeyondDataMapRecords();
  const selectedRecords = getSelectedBeyondDataRecords();
  const records = getActiveBeyondDataRecords();
  const analysis = createBeyondDataMap(records, getEffectiveSearchQuery() || libraryQuery);
  const modeIcons = {
    interactive: `<svg class="bdm-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="4" cy="8" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><line x1="6" y1="7.1" x2="10" y2="5"/><line x1="6" y1="8.9" x2="10" y2="11"/></svg>`,
    graph: `<svg class="bdm-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="2.2"/><circle cx="2.5" cy="3" r="1.5"/><circle cx="13.5" cy="3" r="1.5"/><circle cx="2.5" cy="13" r="1.5"/><circle cx="13.5" cy="13" r="1.5"/><line x1="3.8" y1="3.8" x2="6.2" y2="6.5"/><line x1="12.2" y1="3.8" x2="9.8" y2="6.5"/><line x1="3.8" y1="12.2" x2="6.2" y2="9.5"/><line x1="12.2" y1="12.2" x2="9.8" y2="9.5"/></svg>`,
    clusters: `<svg class="bdm-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="6.5" r="3.5"/><circle cx="3" cy="12.5" r="2"/><circle cx="13" cy="12.5" r="2"/><line x1="5.5" y1="9.5" x2="4" y2="10.5"/><line x1="10.5" y1="9.5" x2="12" y2="10.5"/></svg>`,
    matrix: `<svg class="bdm-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="2" y="2" width="4" height="4" rx="1.2"/><rect x="9" y="2" width="4" height="4" rx="1.2"/><rect x="2" y="9" width="4" height="4" rx="1.2"/><rect x="9" y="9" width="4" height="4" rx="1.2"/></svg>`,
    export: `<svg class="bdm-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v8"/><path d="M5 5l3-3 3 3"/><path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2"/></svg>`,
  };
  const modes = [
    ["interactive", "Command Map"],
    ["graph", "Interactive Graph"],
    ["clusters", "Clusters"],
    ["matrix", "Matrix"],
    ["export", "Export"]
  ];
  const mode = beyondDataMapState.activeMode;
  const content = !allMapRecords.length
    ? renderBeyondDataMapEmptyState()
    : !selectedRecords.length
      ? renderBeyondDataMapAllRemovedState()
    : records.length === 0
      ? renderBeyondDataMapNoMatchesState()
      : mode === "matrix"
        ? renderBeyondDataMatrixView(analysis)
        : mode === "paths"
          ? renderBeyondDataReadingPathView(analysis)
          : mode === "graph"
            ? renderBeyondDataReactMapView(analysis)
          : mode === "interactive"
            ? renderBeyondDataInteractiveMapView(analysis)
            : mode === "export"
              ? renderBeyondDataExportView(analysis)
              : renderBeyondDataClusterView(analysis);
  const confirm = renderBeyondDataMapConfirmation();
  const queryLabel = getEffectiveSearchQuery() || libraryQuery || "Selected library records";
  const groupOptions = [
    ["source_position", "Source position"],
    ["keywords", "Keywords/tags"],
    ["provider", "Provider"],
    ["absence", "Possible absences"],
    ["counter_search", "Counter-search path"],
    ["record_type", "Record type"]
  ];
  const layoutOptions = [
    ["keyword", "Proximity map"],
    ["source_position", "Source map"]
  ];
  document.body.classList.add("beyond-data-map-is-open");
  root.innerHTML = `<div class="beyond-data-map-overlay" data-beyond-data-close>
    <section class="beyond-data-map-shell bdm-workspace" role="dialog" aria-modal="true" aria-labelledby="beyondDataMapTitle" tabindex="-1">
      <header class="bdm-header">
        <div class="bdm-title-block">
          <p>Beyond the Data Map</p>
          <h2 id="beyondDataMapTitle">Command Map</h2>
          <span>Map records by relation, absence, source position and counter-search.</span>
        </div>
        <div class="bdm-header-meta" aria-label="Map status">
          <div><span>Query</span><strong>${escapeHtml(truncateCardSummary(queryLabel, 34))}</strong></div>
          <div><span>Records</span><strong>${selectedRecords.length}${allMapRecords.length !== selectedRecords.length ? ` / ${allMapRecords.length} active` : ""}${records.length !== selectedRecords.length ? ` · ${records.length} shown` : ""}</strong></div>
        </div>
        <div class="bdm-header-actions">
          <button type="button" class="secondary" data-beyond-data-new>New map</button>
          <button type="button" class="secondary${allMapRecords.length ? "" : " is-disabled"}" data-beyond-data-clear-map ${allMapRecords.length ? "" : "disabled"}>Clear map</button>
          ${(beyondDataMapState.removedRecordIds.length || beyondDataMapState.removedNodeIds.length) ? `<button type="button" class="secondary" data-beyond-data-restore-hidden>Restore hidden points</button>` : ""}
          <button type="button" data-beyond-data-mode="export">Export</button>
          <button type="button" class="icon" data-beyond-data-close aria-label="Close Beyond the Data Map">&times;</button>
        </div>
      </header>
      <div class="bdm-toolbar">
        <label class="bdm-map-search">
          <span>Search inside map</span>
          <input type="search" data-beyond-data-search-within value="${escapeHtml(beyondDataMapState.searchWithinMap || "")}" placeholder="Filter records, tags, providers" />
        </label>
        <label>
          <span>Layout</span>
          <select data-beyond-data-layout-select>
            ${layoutOptions.map(([id, label]) => `<option value="${id}" ${beyondDataMapState.activeLayout === id ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Group by</span>
          <select data-beyond-data-group-by>
            ${groupOptions.map(([id, label]) => `<option value="${id}" ${beyondDataMapState.activeGroupBy === id ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
        <div class="bdm-toolbar-sep" role="separator"></div>
        <nav class="bdm-view-tabs" aria-label="Beyond the Data Map views">
          ${modes.map(([id, label]) => `<button type="button" data-beyond-data-mode="${id}" class="${mode === id ? "is-active" : ""}" aria-current="${mode === id ? "page" : "false"}">${modeIcons[id] || ""}${escapeHtml(label)}</button>`).join("")}
        </nav>
      </div>
      <div class="beyond-data-map-body bdm-body">
        ${confirm}
        ${beyondDataMapState.message ? `<div class="bdm-status-message" role="status">${escapeHtml(beyondDataMapState.message)}</div>` : ""}
        ${content}
      </div>
    </section>
  </div>`;
  bindBeyondDataMapModalEvents();
  root.querySelector(".beyond-data-map-shell")?.focus({ preventScroll:true });
}

function bindBeyondDataMapModalEvents() {
  const root = document.getElementById("beyondDataMapRoot");
  if (!root) return;
  const shell = root.querySelector(".beyond-data-map-shell");
  if (shell) {
    shell.addEventListener("keydown", event => {
      if (event.key === "Escape") closeBeyondDataMap();
    });
  }
  root.querySelectorAll("[data-beyond-data-close]").forEach(element => {
    element.addEventListener("click", event => {
      if (element === event.target || element.tagName === "BUTTON") closeBeyondDataMap();
    });
  });
  root.querySelectorAll("[data-beyond-data-mode]").forEach(button => {
    button.addEventListener("click", () => {
      beyondDataMapState = {...beyondDataMapState, activeMode:button.dataset.beyondDataMode || "interactive", pendingConfirm:"", message:""};
      renderBeyondDataMapModal();
    });
  });
  root.querySelectorAll("[data-beyond-data-layout]").forEach(button => {
    button.addEventListener("click", () => {
      beyondDataMapState = {...beyondDataMapState, activeLayout:button.dataset.beyondDataLayout || "flow", message:""};
      renderBeyondDataMapModal();
    });
  });
  root.querySelector("[data-beyond-data-layout-select]")?.addEventListener("change", event => {
    const select = event.currentTarget;
    beyondDataMapState = {...beyondDataMapState, activeLayout:select.value || "flow", message:""};
    renderBeyondDataMapModal();
  });
  root.querySelector("[data-beyond-data-group-by]")?.addEventListener("change", event => {
    const select = event.currentTarget;
    const nextGroup = select.value || "source_position";
    const nextLayout = nextGroup === "keywords" ? "keyword" : nextGroup === "provider" || nextGroup === "record_type" ? "source_position" : beyondDataMapState.activeLayout;
    beyondDataMapState = {...beyondDataMapState, activeGroupBy:nextGroup, activeLayout:nextLayout, activeNodeId:"query", message:""};
    renderBeyondDataMapModal();
  });
  root.querySelector("[data-beyond-data-search-within]")?.addEventListener("input", event => {
    const input = event.currentTarget;
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      beyondDataMapState = {...beyondDataMapState, searchWithinMap:input.value || "", activeNodeId:"query", message:""};
      renderBeyondDataMapModal();
    }, 180);
  });
  root.querySelectorAll("[data-beyond-data-clear-search]").forEach(button => {
    button.addEventListener("click", () => {
      beyondDataMapState = {...beyondDataMapState, searchWithinMap:"", message:""};
      renderBeyondDataMapModal();
    });
  });
  root.querySelectorAll("[data-beyond-data-new]").forEach(button => {
    button.addEventListener("click", () => {
      if (safeArray(beyondDataMapState.selectedRecordIds).length) {
        beyondDataMapState = {...beyondDataMapState, pendingConfirm:"new", message:""};
        renderBeyondDataMapModal();
      } else {
        closeBeyondDataMap();
      }
    });
  });
  root.querySelectorAll("[data-beyond-data-clear-map]").forEach(button => {
    button.addEventListener("click", () => {
      if (!safeArray(beyondDataMapState.selectedRecordIds).length) return;
      beyondDataMapState = {...beyondDataMapState, pendingConfirm:"clear", message:""};
      renderBeyondDataMapModal();
    });
  });
  root.querySelectorAll("[data-beyond-data-restore-hidden]").forEach(button => {
    button.addEventListener("click", () => restoreBeyondDataMapHiddenPoints());
  });
  root.querySelectorAll("[data-beyond-data-cancel-confirm]").forEach(button => {
    button.addEventListener("click", () => {
      beyondDataMapState = {...beyondDataMapState, pendingConfirm:"", message:""};
      renderBeyondDataMapModal();
    });
  });
  root.querySelectorAll("[data-beyond-data-confirm]").forEach(button => {
    button.addEventListener("click", () => {
      const action = button.dataset.beyondDataConfirm;
      if (action === "new") {
        clearBeyondDataMapWorkspace("New map started. Select records from the library to build it.");
        return;
      }
      if (action === "clear") {
        clearBeyondDataMapWorkspace("Map cleared.");
      }
    });
  });
  root.querySelectorAll("[data-beyond-data-remove-record]").forEach(button => {
    button.addEventListener("click", () => removeBeyondDataMapRecord(button.dataset.beyondDataRemoveRecord || ""));
  });
  root.querySelectorAll("[data-beyond-data-hide-node]").forEach(button => {
    button.addEventListener("click", () => hideBeyondDataMapNode(button.dataset.beyondDataHideNode || ""));
  });
  root.querySelectorAll("[data-beyond-data-reset-layout]").forEach(button => {
    button.addEventListener("click", () => {
      beyondDataMapState = {...beyondDataMapState, activeNodeId:"query", hoveredNodeId:"", message:"Map view reset."};
      renderBeyondDataMapModal();
    });
  });
  root.querySelectorAll("[data-beyond-data-select-visible]").forEach(button => {
    button.addEventListener("click", () => {
      const ids = getActiveBeyondDataRecords().slice(0, 6).map(record => String(record.id));
      if (!ids.length) return;
      setBeyondDataMapRecords(ids, { activeMode:"interactive", activeNodeId:"query", message:"First visible records added to the map." });
      renderBeyondDataMapModal();
    });
  });
  bindBeyondDataFlowEvents();
  if (window.__beyondDataFlowLastRender && document.getElementById("beyondDataFlowHost")) {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("beyond-data-flow:render", {
        detail: window.__beyondDataFlowLastRender,
      }));
    });
  }
  root.querySelectorAll("[data-beyond-data-export]").forEach(button => {
    button.addEventListener("click", async () => {
      const format = button.dataset.beyondDataExport;
      const analysis = createBeyondDataMap(getActiveBeyondDataRecords(), getEffectiveSearchQuery() || libraryQuery);
      const timestamp = new Date().toISOString().slice(0, 10);
      const slug = slugify(getEffectiveSearchQuery() || "selected-records");
      const filenameBase = `beyond-data-map-${slug}-${timestamp}`;
      const flowExport = window.beyondDataMapFlow || {};
      if (format === "png") {
        if (flowExport.exportAsPng) await flowExport.exportAsPng(`${filenameBase}.png`);
        else exportMapAsPng(analysis.visualMap, `${filenameBase}.png`);
      }
      if (format === "jpeg") {
        if (flowExport.exportAsJpeg) await flowExport.exportAsJpeg(`${filenameBase}.jpg`);
        else exportMapAsJpeg(analysis.visualMap, `${filenameBase}.jpg`);
      }
      if (format === "svg") {
        if (flowExport.exportAsSvg) await flowExport.exportAsSvg(`${filenameBase}.svg`);
        else exportMapAsSvg(analysis.visualMap, `${filenameBase}.svg`);
      }
      if (format === "summary") {
        if (flowExport.copySummary) await flowExport.copySummary(getBeyondDataMapSummary(analysis.visualMap));
        else copyMapSummary(getBeyondDataMapSummary(analysis.visualMap));
      }
    });
  });
  root.querySelectorAll("[data-beyond-data-node]").forEach(button => {
    button.addEventListener("mouseenter", () => {
      beyondDataMapState = {...beyondDataMapState, hoveredNodeId:button.dataset.beyondDataNode || ""};
      renderBeyondDataMapModal();
    });
    button.addEventListener("mouseleave", () => {
      beyondDataMapState = {...beyondDataMapState, hoveredNodeId:""};
      renderBeyondDataMapModal();
    });
    button.addEventListener("focus", () => {
      beyondDataMapState = {...beyondDataMapState, hoveredNodeId:button.dataset.beyondDataNode || "", activeNodeId:button.dataset.beyondDataNode || ""};
      renderBeyondDataMapModal();
    });
    button.addEventListener("click", () => {
      beyondDataMapState = {...beyondDataMapState, activeNodeId:button.dataset.beyondDataNode || ""};
      renderBeyondDataMapModal();
    });
  });
  root.querySelectorAll("[data-beyond-label-record]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const recordId = button.dataset.beyondLabelRecord || "";
      if (!recordId) return;
      closeBeyondDataMap();
      openBeyondLabel(recordId);
    });
  });
  root.querySelectorAll("[data-beyond-data-search]").forEach(button => {
    button.addEventListener("click", () => {
      const query = button.dataset.beyondDataSearch || "";
      closeBeyondDataMap();
      runBeyondLabelCounterSearch(query, "beyond_data_map");
    });
  });
}

function bindBeyondDataFlowEvents() {
  if (beyondDataFlowEventsBound) return;
  window.addEventListener("beyond-data-flow:node-click", (event) => {
    const nodeId = event.detail?.nodeId ?? null;
    // Only update state — do NOT call renderBeyondDataMapModal().
    // Rebuilding the modal DOM destroys #beyondDataFlowHost, which tears down
    // the React portal mid-render and causes every dot to jump/shake.
    // The React InspectorPanel already handles node detail display.
    beyondDataMapState = { ...beyondDataMapState, activeNodeId: nodeId ? String(nodeId) : "query" };
  });
  window.addEventListener("beyond-data-flow:hover-change", (event) => {
    const hoveredNodeId = String(event.detail?.hoveredNodeId || "");
    // Only update state — do NOT call renderBeyondDataMapModal().
    // Hover fires on every mouse-move; calling renderBeyondDataMapModal() here
    // was destroying and recreating #beyondDataFlowHost at ~60fps.
    beyondDataMapState = { ...beyondDataMapState, hoveredNodeId };
  });
  window.addEventListener("beyond-data-flow:remove-record", (event) => {
    removeBeyondDataMapRecord(event.detail?.recordId);
  });
  window.addEventListener("beyond-data-flow:hide-node", (event) => {
    hideBeyondDataMapNode(event.detail?.nodeId);
  });
  window.addEventListener("beyond-data-flow:search", (event) => {
    closeBeyondDataMap();
    runBeyondLabelCounterSearch(event.detail?.query, "beyond_data_map");
  });
  window.addEventListener("beyond-data-flow:open-record", (event) => {
    closeBeyondDataMap();
    openBeyondLabel(event.detail?.recordId);
  });
  window.addEventListener("beyond-data-flow:restore-hidden", () => {
    restoreBeyondDataMapHiddenPoints();
  });
  window.addEventListener("beyond-data-flow:clear-map", () => {
    if (!safeArray(beyondDataMapState.selectedRecordIds).length) return;
    clearBeyondDataMapWorkspace("Map cleared.");
  });
  window.addEventListener("beyond-data-flow:new-map", () => {
    clearBeyondDataMapWorkspace("New map started. Select records from the library to build it.");
    closeBeyondDataMap();
  });
  beyondDataFlowEventsBound = true;
}

function selectedBeyondLabelNode(record, analysis) {  const nodes = buildBeyondLabelNodes(record, analysis);
  return nodes.find(node => node.id === beyondLabelState.selectedNodeId) || nodes[0];
}

function buildBeyondLabelNodes(record, analysis) {
  // Minimal, resilient node builder for the Beyond the Label UI.
  // Returns an array of node objects with shape expected by renderers:
  // { id, type, label, title, why, caution, lens, search }
  const nodes = [];
  const archiveLabel = (analysis && analysis.archiveVoice && analysis.archiveVoice.label) || beyondLabelTitle(record) || "Untitled";

  // Primary visible label node
  nodes.push({
    id: "visible-archive",
    type: "visible",
    label: archiveLabel,
    title: archiveLabel,
    why: "Visible in the record",
  });

  // Add meaningful visible tokens if available (keep lightweight)
  try {
    const extras = [];
    if (record && record.creator) extras.push(beyondLabelTitle(record));
    if (Array.isArray(record?.subjects)) extras.push(...record.subjects.slice(0, 2));
    extras.forEach((t, i) => {
      if (!t) return;
      nodes.push({
        id: `visible-${i + 1}`,
        type: "visible",
        label: String(t),
        title: String(t),
        why: "Visible metadata",
      });
    });
  } catch (e) {
    // swallow — extras are optional
  }

  // Absence / outside-data nodes (lens-aware)
  if (analysis && Array.isArray(analysis.outsideData)) {
    analysis.outsideData.forEach(item => {
      const id = item && item.id ? String(item.id) : `absence-${Math.random().toString(36).slice(2,8)}`;
      nodes.push({
        id: `absence-${id}`,
        type: "absence",
        lens: item.id,
        label: item.dimension || item.id || "Absence",
        title: item.dimension || item.id || "Absence",
        why: item.whyThisRecordRaisesIt || item.whyItMatters || "",
        caution: item.doNotAssume || item.caution || "",
        search: item.searchQuery || "",
        intensity: item.intensity || undefined
      });
    });
  }

  // Counter-search suggestions
  if (analysis && Array.isArray(analysis.counterSearches)) {
    analysis.counterSearches.slice(0, 4).forEach((s, idx) => {
      nodes.push({
        id: `counter-${idx}`,
        type: "counter_search",
        label: s.query || `counter-${idx}`,
        title: s.query || s.type || `Counter ${idx}`,
        why: s.resists || "",
        search: s.query || ""
      });
    });
  }

  return nodes;
}

function openBeyondDataMap(opts = {}) {
  const hasIncomingSelection = Array.isArray(opts.selectedRecordIds);
  beyondDataMapState = {
    ...beyondDataMapState,
    open: true,
    activeMode: beyondDataMapState.activeMode || "interactive",
    activeNodeId: beyondDataMapState.activeNodeId || "query",
    removedRecordIds:hasIncomingSelection ? [] : beyondDataMapState.removedRecordIds || [],
    removedNodeIds:hasIncomingSelection ? [] : beyondDataMapState.removedNodeIds || [],
    mapVersion:hasIncomingSelection ? (beyondDataMapState.mapVersion || 0) + 1 : beyondDataMapState.mapVersion || 0,
    pendingConfirm:"",
    message:"",
    // allow callers to pass initial selected ids
    selectedRecordIds: hasIncomingSelection ? opts.selectedRecordIds.slice(0, 30) : safeArray(beyondDataMapState.selectedRecordIds)
  };
  if (hasIncomingSelection) clearBeyondDataFlowCache();
  renderBeyondDataMapModal();
}

// Expose the open function to the global window so external scripts and
// headless tests can open the legacy modal reliably even when this file is
// loaded as a module.
try {
  if (typeof window !== "undefined") window.openBeyondDataMap = openBeyondDataMap;
} catch (e) {
  // noop
}

try {
  document.addEventListener("click", event => {
    const target = event.target;
    const button = target?.closest?.("[data-beyond-data-open]");
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    openBeyondDataMap();
  }, true);
} catch (e) {
  // noop
}

try {
  window.addEventListener("beyond-data-map:open", event => {
    event.preventDefault?.();
    openBeyondDataMap();
  });
} catch (e) {
  // noop
}

function closeBeyondDataMap() {
  beyondDataMapState = {...beyondDataMapState, open: false, activeClusterId: "", pendingConfirm:"", message: ""};
  clearBeyondDataFlowCache();
  const root = document.getElementById('beyondDataMapRoot');
  if (root) root.innerHTML = "";
  document.body.classList.remove('beyond-data-map-is-open');
}

function renderBeyondLabelNode(node) {
  const active = node.id === beyondLabelState.selectedNodeId;
  const classes = [
    "beyond-label-node",
    node.type === "absence" || node.type === "absence-more" ? "beyond-label-node--absence" : "beyond-label-node--visible",
    active ? "is-active" : "",
    node.intensity ? `is-${node.intensity}` : ""
  ].filter(Boolean).join(" ");
  return `<button type="button" class="${classes}" data-beyond-label-node="${escapeHtml(node.id)}" aria-pressed="${active ? "true" : "false"}" aria-label="Read layer: ${escapeHtml(node.title)}">
    <span class="beyond-label-node-dot" aria-hidden="true"></span>
    <span class="beyond-label-node-text">${escapeHtml(node.label)}</span>
  </button>`;
}

function renderBeyondLabelConstellation(record, analysis) {
  const nodes = buildBeyondLabelNodes(record, analysis);
  const visibleNodes = nodes.filter(node => node.type === "visible");
  const absenceNodes = nodes.filter(node => node.type !== "visible");
  return `<section class="beyond-label-constellation" aria-label="Beyond the Label relation panel">
    <div class="beyond-label-archive-card">
      <span>Source label</span>
      <strong class="beyond-label-archive-title" title="${escapeHtml(analysis.archiveVoice.label)}">${escapeHtml(analysis.archiveVoice.label)}</strong>
      <small>${escapeHtml(analysis.archiveVoice.provider || beyondLabelSourceTypeLabel(analysis.archiveVoice.sourceType))}</small>
    </div>
    <div class="beyond-label-relation-group">
      <div class="beyond-label-relation-heading"><span><i class="visible"></i>Visible in the record</span></div>
      <div class="beyond-label-node-list">${visibleNodes.map(renderBeyondLabelNode).join("")}</div>
    </div>
    <div class="beyond-label-relation-group">
      <div class="beyond-label-relation-heading"><span><i class="absence"></i>Outside the data</span></div>
      <div class="beyond-label-node-list">${absenceNodes.map(renderBeyondLabelNode).join("")}</div>
    </div>
  </section>`;
}

function renderArchiveVoiceCard(analysis) {
  return `<article class="beyond-label-voice-card">
    <p class="beyond-label-kicker">The archive says</p>
    <h3>${escapeHtml(analysis.archiveVoice.label)}</h3>
    <p>${escapeHtml(analysis.archiveVoice.note)}</p>
  </article>`;
}

function renderCounterReadingLensPicker(analysis) {
  const activePrompt = analysis.counterReadings.find(item => item.id === beyondLabelState.selectedLens)?.prompt || analysis.counterReadings[0]?.prompt || "";
  return `<section class="beyond-label-lens-panel">
    <div class="beyond-label-section-heading">
      <span>Read against the record</span>
      <strong>${escapeHtml(BEYOND_LABEL_LENSES.find(lens => lens.id === beyondLabelState.selectedLens)?.label || "Lens")}</strong>
    </div>
    <div class="beyond-label-lens-picker" role="list" aria-label="Counter-reading lenses">
      ${BEYOND_LABEL_LENSES.map(lens => `<button type="button" class="beyond-label-lens ${lens.id === beyondLabelState.selectedLens ? "is-active" : ""}" data-beyond-label-lens="${escapeHtml(lens.id)}">${escapeHtml(lens.label)}</button>`).join("")}
    </div>
    <p class="beyond-label-lens-prompt">${escapeHtml(activePrompt)}</p>
  </section>`;
}

function renderCounterSearchCard(search, index) {
  return `<article class="beyond-label-search-card" style="--delay:${Math.min(index * 70, 350)}ms">
    <div class="beyond-label-search-card-meta">
      <span class="beyond-label-search-type">${escapeHtml(search.type.replace(/_/g, " "))}</span>
      <code>${escapeHtml(search.query)}</code>
    </div>
    <div class="beyond-label-search-card-copy">
      <p><strong>What it resists</strong>${escapeHtml(search.resists)}</p>
      <p><strong>What it may recover</strong>${escapeHtml(search.recovers)}</p>
    </div>
    <button type="button" data-beyond-label-search="${escapeHtml(search.query)}" data-beyond-label-search-type="${escapeHtml(search.type)}" aria-label="Search this: ${escapeHtml(search.query)}">Search this</button>
  </article>`;
}

function renderRedescriptionWorksheet(analysis) {
  const values = beyondLabelState.worksheet;
  const prompts = analysis?.redescriptionPrompts || {
    canSay:"What can be said from the visible record?",
    cannotAssume:"What should not be assumed from the label?",
    needsAnotherSource:"What needs another source?",
    careQuestion:"What needs cultural care?"
  };
  return `<section class="beyond-label-worksheet">
    <div class="beyond-label-section-heading">
      <span>Re-describe with care</span>
      <strong>${escapeHtml(prompts.canSay)}</strong>
    </div>
    <label>
      <span>What I can say from the record</span>
      <small>${escapeHtml(prompts.canSay)}</small>
      <textarea data-beyond-label-field="fromRecord">${escapeHtml(values.fromRecord)}</textarea>
    </label>
    <label>
      <span>What I cannot assume</span>
      <small>${escapeHtml(prompts.cannotAssume)}</small>
      <textarea data-beyond-label-field="cannotAssume">${escapeHtml(values.cannotAssume)}</textarea>
    </label>
    <label>
      <span>What needs another source</span>
      <small>${escapeHtml(prompts.needsAnotherSource)}</small>
      <textarea data-beyond-label-field="needsSource">${escapeHtml(values.needsSource)}</textarea>
    </label>
    <label>
      <span>What needs cultural care</span>
      <small>${escapeHtml(prompts.careQuestion)}</small>
      <textarea data-beyond-label-field="care">${escapeHtml(values.care)}</textarea>
    </label>
    <div class="beyond-label-worksheet-actions">
      <button type="button" data-beyond-label-copy>Copy reflection</button>
      <span aria-live="polite">${escapeHtml(beyondLabelState.copyMessage || "")}</span>
    </div>
  </section>`;
}

function renderBeyondLabelOpening(record, analysis) {
  const absences = analysis.outsideData.slice(0, 5);
  return `<section class="beyond-label-opening">
    <article class="beyond-label-contrast-card beyond-label-contrast-card--archive">
      <p class="beyond-label-kicker">The archive says</p>
      <h3>${escapeHtml(analysis.archiveVoice.label)}</h3>
      <dl>
        <div><dt>Source</dt><dd>${escapeHtml(analysis.archiveVoice.provider || "Catalogue voice")}</dd></div>
        <div><dt>Position</dt><dd>${escapeHtml(analysis.archiveVoice.sourcePosition || beyondLabelSourceTypeLabel(analysis.archiveVoice.sourceType))}</dd></div>
      </dl>
      <p>${escapeHtml(analysis.archiveVoice.note)}</p>
    </article>
    <article class="beyond-label-contrast-card beyond-label-contrast-card--absence">
      <p class="beyond-label-kicker">What the label cannot hold</p>
      <h3>What this record asks us to check.</h3>
      <ul>${absences.map(item => `<li>${escapeHtml(item.dimension)}</li>`).join("")}</ul>
    </article>
    <p class="beyond-label-opening-statement">${escapeHtml(analysis.careNote)}</p>
  </section>`;
}

function renderBeyondLabelAbsenceCards(analysis) {
  return `<section class="beyond-label-absence-list">
    ${analysis.outsideData.slice(0, 5).map(item => {
      const search = analysis.counterSearches.find(candidate => candidate.type === item.id) || makeCounterSearch(`${item.dimension} ${libraryQuery || ""}`.trim(), "A single catalogue field standing in for a wider relation.", "Sources that can name this relation more responsibly.", item.id);
      const query = item.searchQuery || search.query;
      return `<article class="beyond-label-absence-card">
        <h4>${escapeHtml(item.dimension)}</h4>
        <p><strong>Why this record raises it</strong>${escapeHtml(item.whyThisRecordRaisesIt || item.whyItMatters)}</p>
        <p><strong>Do not assume</strong>${escapeHtml(item.doNotAssume || item.caution || "This absence needs another source, not an invented answer.")}</p>
        <div class="beyond-label-query-preview"><span>Search against this absence</span><code>${escapeHtml(query)}</code></div>
        <button type="button" data-beyond-label-search="${escapeHtml(query)}" data-beyond-label-search-type="${escapeHtml(item.id)}" aria-label="Search this: ${escapeHtml(query)}">Search this</button>
      </article>`;
    }).join("")}
  </section>`;
}

function getBeyondLabelSearchForNode(node, analysis) {
  return analysis.counterSearches.find(search => search.type === node.lens || search.type === node.id.replace(/^absence-/, "")) ||
    makeCounterSearch(node.search, "The record being read only through its received label.", "A wider path through maker, place, language, collection or care.", node.lens || "node");
}

function renderBeyondLabelSelectedCard(node, analysis, options = {}) {
  const search = getBeyondLabelSearchForNode(node, analysis);
  const pill = options.pill || (node.type === "absence" || node.type === "absence-more" ? "Meaningful absence" : "Visible in the record");
  return `<article class="beyond-label-selected-card">
    <span class="beyond-label-selected-pill">${escapeHtml(pill)}</span>
    <h3>${escapeHtml(node.title)}</h3>
    <p>${escapeHtml(node.why)}</p>
    <p><strong>Do not assume</strong>${escapeHtml(node.caution || "The label is useful evidence, not the whole account.")}</p>
    <div class="beyond-label-search-brief">
      <span>Search against this ${node.type === "visible" ? "label" : "absence"}</span>
      <code>${escapeHtml(search.query)}</code>
      <p><strong>What it resists</strong>${escapeHtml(search.resists)}</p>
      <p><strong>What it may recover</strong>${escapeHtml(search.recovers)}</p>
    </div>
    <button type="button" data-beyond-label-search="${escapeHtml(search.query)}" data-beyond-label-search-type="${escapeHtml(search.type)}" aria-label="Search this: ${escapeHtml(search.query)}">Search this</button>
  </article>`;
}

function renderBeyondLabelStepContent(record, analysis, selectedNode) {
  const filteredSearches = analysis.counterSearches
    .filter(search => beyondLabelState.activeStep !== "position" || search.type === beyondLabelState.selectedLens || search.type === "adjacent");
  const activeSearches = (filteredSearches.length ? filteredSearches : analysis.counterSearches)
    .slice(0, beyondLabelState.activeStep === "search" ? 6 : 2);
  if (beyondLabelState.activeStep === "label") {
    return `<section class="beyond-label-step-panel">
      <div class="beyond-label-section-heading"><span>What the label does</span><strong>Question the label</strong></div>
      <div class="beyond-label-operation-grid">
        ${analysis.labelOperations.slice(0, 3).map(item => `<article><h4>${escapeHtml(item.title.replace(/^It /, ""))}</h4><p>${escapeHtml(item.explanation)}</p></article>`).join("")}
      </div>
    </section>`;
  }
  if (beyondLabelState.activeStep === "absence") {
    const nodes = buildBeyondLabelNodes(record, analysis);
    const selectedAbsence = nodes.find(node => node.id === beyondLabelState.selectedNodeId && (node.type === "absence" || node.type === "absence-more")) ||
      nodes.find(node => node.type === "absence") ||
      selectedNode;
    const related = nodes
      .filter(node => (node.type === "absence" || node.type === "absence-more") && node.id !== selectedAbsence.id)
      .slice(0, 3);
    return `<section class="beyond-label-step-panel">
      <div class="beyond-label-section-heading beyond-label-section-heading--stacked">
        <span>What the data cannot hold</span>
        <strong>Some absences are produced by the way records are made.</strong>
      </div>
      ${renderBeyondLabelSelectedCard(selectedAbsence, analysis, {pill:"Meaningful absence"})}
      ${related.length ? `<div class="beyond-label-related-absence"><span>Related absences</span>${related.map(node => `<button type="button" data-beyond-label-node="${escapeHtml(node.id)}">${escapeHtml(node.title)}</button>`).join("")}</div>` : ""}
    </section>`;
  }
  if (beyondLabelState.activeStep === "position") {
    return `<section class="beyond-label-step-panel">
      ${renderCounterReadingLensPicker(analysis)}
      <div class="beyond-label-search-grid beyond-label-search-grid--compact">${activeSearches.map(renderCounterSearchCard).join("")}</div>
    </section>`;
  }
  if (beyondLabelState.activeStep === "search") {
    return `<section class="beyond-label-step-panel">
      <div class="beyond-label-section-heading"><span>Search against the label</span><strong>Counter-search as method</strong></div>
      <div class="beyond-label-search-grid">${analysis.counterSearches.map(renderCounterSearchCard).join("")}</div>
    </section>`;
  }
  if (beyondLabelState.activeStep === "care") {
    return renderRedescriptionWorksheet(analysis);
  }
  if (beyondLabelState.activeStep === "node") {
    return `<section class="beyond-label-step-panel">
      <div class="beyond-label-section-heading beyond-label-section-heading--stacked">
        <span>${selectedNode.type === "visible" ? "Visible in the record" : "What the data cannot hold"}</span>
        <strong>${escapeHtml(selectedNode.meaning)}</strong>
      </div>
      ${renderBeyondLabelSelectedCard(selectedNode, analysis)}
    </section>`;
  }
  return renderBeyondLabelOpening(record, analysis);
}

function renderBeyondLabelExperience(record) {
  const analysis = createBeyondLabelAnalysis(record, getEffectiveSearchQuery() || libraryQuery);
  const selectedNode = selectedBeyondLabelNode(record, analysis);
  return `<div class="beyond-label-overlay" data-beyond-label-overlay>
    <section class="beyond-label-shell" role="dialog" aria-modal="true" aria-labelledby="beyondLabelTitle" tabindex="-1">
      <header class="beyond-label-header">
        <div>
          <p class="beyond-label-eyebrow">BEYOND THE LABEL</p>
          <h2 id="beyondLabelTitle">Read records otherwise</h2>
          <p class="beyond-label-intro">Read this result through source voice, absence, relation and counter-search.</p>
        </div>
        <button type="button" class="beyond-label-close" data-beyond-label-close aria-label="Close Beyond the Label">&times;</button>
      </header>
      <div class="beyond-label-layer-rail" aria-label="Beyond the Label layers">
        ${BEYOND_LABEL_LAYERS.map((layer, index) => `<button type="button" class="${beyondLabelState.activeStep === layer.id ? "is-active" : ""}" data-beyond-label-step="${escapeHtml(layer.id)}" aria-current="${beyondLabelState.activeStep === layer.id ? "step" : "false"}" data-short-label="${escapeHtml(["Archive","Label","Outside","Position","Search","Care"][index])}"><b>${index + 1}</b><span>${escapeHtml(layer.label)}</span></button>`).join("")}
      </div>
      <div class="beyond-label-grid">
        <div class="beyond-label-left">
          ${renderBeyondLabelConstellation(record, analysis)}
          <p class="beyond-label-care-note">${escapeHtml(analysis.careNote || "")}</p>
        </div>
        <div class="beyond-label-right">${renderBeyondLabelStepContent(record, analysis, selectedNode)}</div>
      </div>
    </section>
  </div>`;
}

function ensureBeyondLabelRoot() {
  let root = document.getElementById("beyondLabelRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "beyondLabelRoot";
    document.body.appendChild(root);
  }
  return root;
}

function ensureBeyondDataMapRoot() {
  let root = document.getElementById("beyondDataMapRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "beyondDataMapRoot";
    document.body.appendChild(root);
  }
  return root;
}

function renderBeyondLabelModal() {
  const root = ensureBeyondLabelRoot();
  if (!beyondLabelState.open || !beyondLabelState.recordId) {
    root.innerHTML = "";
    document.body.classList.remove("beyond-label-is-open");
    document.removeEventListener("keydown", handleBeyondLabelKeydown);
    return;
  }
  const record = getRecordByIdAny(beyondLabelState.recordId);
  if (!record) return;
  root.innerHTML = renderBeyondLabelExperience(record);
  document.body.classList.add("beyond-label-is-open");
  bindBeyondLabelModalEvents();
  document.removeEventListener("keydown", handleBeyondLabelKeydown);
  document.addEventListener("keydown", handleBeyondLabelKeydown);
  const shell = root.querySelector(".beyond-label-shell");
  if (shell) shell.focus({ preventScroll:true });
}

function openBeyondLabel(recordId) {
  const record = getRecordByIdAny(recordId);
  if (!record) return;
  const changingRecord = beyondLabelState.recordId !== recordId;
  beyondLabelState = {
    ...beyondLabelState,
    open:true,
    recordId,
    selectedNodeId:"source",
    activeStep:"archive",
    selectedLens:"place",
    copyMessage:"",
    worksheet:changingRecord ? { fromRecord:"", cannotAssume:"", needsSource:"", care:"" } : beyondLabelState.worksheet
  };
  renderBeyondLabelModal();
}

function closeBeyondLabel() {
  beyondLabelState = {...beyondLabelState, open:false, copyMessage:""};
  renderBeyondLabelModal();
}

function handleBeyondLabelKeydown(event) {
  if (event.key === "Escape" && beyondLabelState.open) {
    event.preventDefault();
    closeBeyondLabel();
  }
}

function bindBeyondLabelModalEvents() {
  const root = document.getElementById("beyondLabelRoot");
  if (!root) return;
  root.querySelectorAll("[data-beyond-label-close]").forEach(button => {
    button.addEventListener("click", closeBeyondLabel);
  });
  root.querySelectorAll("[data-beyond-label-overlay]").forEach(overlay => {
    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeBeyondLabel();
    });
  });
  root.querySelectorAll("[data-beyond-label-node]").forEach(button => {
    button.addEventListener("click", () => {
      beyondLabelState = {...beyondLabelState, activeStep:"node", selectedNodeId:button.dataset.beyondLabelNode || "source", copyMessage:""};
      renderBeyondLabelModal();
    });
  });
  root.querySelectorAll("[data-beyond-label-step]").forEach(button => {
    button.addEventListener("click", () => {
      beyondLabelState = {...beyondLabelState, activeStep:button.dataset.beyondLabelStep || "archive", copyMessage:""};
      renderBeyondLabelModal();
    });
  });
  root.querySelectorAll("[data-beyond-label-lens]").forEach(button => {
    button.addEventListener("click", () => {
      const lens = button.dataset.beyondLabelLens || "place";
      const record = getRecordByIdAny(beyondLabelState.recordId);
      const analysis = record ? createBeyondLabelAnalysis(record, getEffectiveSearchQuery() || libraryQuery) : null;
      const match = record && analysis ? buildBeyondLabelNodes(record, analysis).find(node => node.lens === lens) : null;
      beyondLabelState = {
        ...beyondLabelState,
        activeStep:"position",
        selectedLens:lens,
        selectedNodeId:match ? match.id : beyondLabelState.selectedNodeId,
        copyMessage:""
      };
      renderBeyondLabelModal();
    });
  });
  root.querySelectorAll("[data-beyond-label-search]").forEach(button => {
    button.addEventListener("click", () => {
      runBeyondLabelCounterSearch(button.dataset.beyondLabelSearch || "", button.dataset.beyondLabelSearchType || "");
    });
  });
  root.querySelectorAll("[data-beyond-label-field]").forEach(field => {
    field.addEventListener("input", () => {
      beyondLabelState.worksheet = {
        ...beyondLabelState.worksheet,
        [field.dataset.beyondLabelField]:field.value
      };
      beyondLabelState.copyMessage = "";
    });
  });
  const copyButton = root.querySelector("[data-beyond-label-copy]");
  if (copyButton) copyButton.addEventListener("click", copyBeyondLabelReflection);
}

async function copyBeyondLabelReflection() {
  const values = beyondLabelState.worksheet;
  const text = [
    "Beyond the Label reflection",
    "",
    `What I can say from the record:\n${values.fromRecord || ""}`,
    `What I cannot assume:\n${values.cannotAssume || ""}`,
    `What needs another source:\n${values.needsSource || ""}`,
    `What needs cultural care:\n${values.care || ""}`
  ].join("\n\n").trim();
  try {
    await navigator.clipboard.writeText(text);
    beyondLabelState = {...beyondLabelState, copyMessage:"Copied"};
  } catch (error) {
    console.warn("Beyond the Label copy failed", error);
    beyondLabelState = {...beyondLabelState, copyMessage:"Copy failed. Select the text manually."};
  }
  renderBeyondLabelModal();
}

function runBeyondLabelCounterSearch(rawQuery, suggestionType = "counter") {
  const query = compactBeyondLabelQuery(rawQuery);
  if (!query) return;
  const originalQuery = String(getEffectiveSearchQuery() || libraryQuery || "").trim();
  try {
    if (typeof trackLibraryActivity === "function") {
      trackLibraryActivity("beyond_label_counter_search_clicked", {
        query,
        sourceScope:sourceMode ? "all_sources" : "archive",
        metadata:{
          original_query:originalQuery,
          suggested_query:query,
          suggestion_type:suggestionType,
          area:"library",
          mode:"beyond_label"
        }
      });
    }
  } catch (error) {
    console.warn("Beyond the Label analytics skipped.", error);
  }
  closeBeyondLabel();
  pushRecentSearch(query);
  currentPage = "library";
  selectedRecordId = null;
  clearMetadataFilters();
  searchSuggestions = [];
  activeSuggestionIndex = -1;
  locationSearchHydrated = false;
  applyLibraryQuery(query, true);
  const nextUrl = `/library?q=${encodeURIComponent(query)}`;
  if (window.location.pathname + window.location.search !== nextUrl) {
    window.history.pushState({ archiveRoute:true, page:"library" }, "", nextUrl);
  }
  render();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(() => {
    const input = document.getElementById("mainSearch");
    if (input) {
      input.value = query;
      input.focus({ preventScroll:true });
    }
    document.querySelector(".library-results-stack")?.scrollIntoView({
      behavior:reducedMotion ? "auto" : "smooth",
      block:"start"
    });
  });
}

function renderBeyondLabelRecordEntry(record) {
  return `<section class="record-sidebar-card beyond-label-entry-card">
    <p class="beyond-label-kicker">Beyond the Label</p>
    <h2>Read records otherwise</h2>
    <p>Move through source voice, absence, relation and counter-search without treating the label as neutral.</p>
    <button type="button" data-beyond-label-record="${escapeHtml(record.id)}">Begin reading</button>
  </section>`;
}

function getSelectedBeyondDataRecords() {
  const selectedRecordIds = safeArray(beyondDataMapState.selectedRecordIds);
  const removedRecordIds = safeArray(beyondDataMapState.removedRecordIds).map(String);
  return selectedRecordIds
    .filter(id => !removedRecordIds.includes(String(id)))
    .map(id => getRecordByIdAny(id))
    .filter(Boolean);
}

function getAllBeyondDataMapRecords() {
  return safeArray(beyondDataMapState.selectedRecordIds)
    .map(id => getRecordByIdAny(id))
    .filter(Boolean);
}

function getActiveBeyondDataRecords() {
  const records = getSelectedBeyondDataRecords();
  const query = compactBeyondLabelQuery(beyondDataMapState.searchWithinMap || "").toLowerCase();
  if (!query) return records;
  return records.filter(record => {
    const mappable = normalizeMappableRecord(record);
    const haystack = [
      mappable.title,
      mappable.creator,
      mappable.provider,
      mappable.source,
      mappable.description,
      mappable.year,
      mappable.place,
      ...(mappable.tags || [])
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function setBeyondDataMapRecords(nextIds, patch = {}) {
  const uniqueIds = Array.from(new Set((nextIds || []).map(id => String(id)).filter(Boolean))).slice(0, 30);
  const currentRemovedRecordIds = safeArray(beyondDataMapState.removedRecordIds);
  beyondDataMapState = {
    ...beyondDataMapState,
    selectedRecordIds:uniqueIds,
    removedRecordIds:Array.isArray(patch.removedRecordIds) ? patch.removedRecordIds : currentRemovedRecordIds.filter(id => uniqueIds.includes(String(id))),
    removedNodeIds:Array.isArray(patch.removedNodeIds) ? patch.removedNodeIds : safeArray(beyondDataMapState.removedNodeIds),
    activeNodeId:uniqueIds.length ? (patch.activeNodeId || beyondDataMapState.activeNodeId || "query") : "query",
    hoveredNodeId:"",
    pendingConfirm:"",
    message:"",
    mapVersion:(beyondDataMapState.mapVersion || 0) + 1,
    ...patch
  };
}

function removeBeyondDataMapRecord(recordId) {
  const id = String(recordId || "");
  if (!id) return;
  const removed = Array.from(new Set([...(beyondDataMapState.removedRecordIds || []), id]));
  const selectedRecordIds = safeArray(beyondDataMapState.selectedRecordIds);
  const remaining = selectedRecordIds.filter(item => !removed.includes(String(item)));
  setBeyondDataMapRecords(selectedRecordIds, {
    removedRecordIds:removed,
    activeNodeId:beyondDataMapState.activeNodeId === id ? "query" : beyondDataMapState.activeNodeId,
    message:remaining.length ? "Record removed from this map." : "All records have been removed from this map."
  });
  clearBeyondDataFlowCache();
  renderBeyondDataMapModal();
}

function hideBeyondDataMapNode(nodeId) {
  const id = String(nodeId || "");
  if (!id || id === "query") return;
  const removedNodeIds = Array.from(new Set([...(beyondDataMapState.removedNodeIds || []), id]));
  beyondDataMapState = {
    ...beyondDataMapState,
    removedNodeIds,
    activeNodeId:"query",
    hoveredNodeId:"",
    mapVersion:(beyondDataMapState.mapVersion || 0) + 1,
    message:"Point hidden from this map."
  };
  clearBeyondDataFlowCache();
  renderBeyondDataMapModal();
}

function restoreBeyondDataMapHiddenPoints() {
  beyondDataMapState = {
    ...beyondDataMapState,
    removedRecordIds:[],
    removedNodeIds:[],
    activeNodeId:"query",
    hoveredNodeId:"",
    mapVersion:(beyondDataMapState.mapVersion || 0) + 1,
    message:"Hidden points restored."
  };
  clearBeyondDataFlowCache();
  renderBeyondDataMapModal();
}

function clearBeyondDataFlowCache() {
  try {
    delete window.__beyondDataFlowLastRender;
    window.dispatchEvent(new CustomEvent("beyond-data-flow:unmount"));
  } catch (error) {
    // noop
  }
}

function clearBeyondDataMapWorkspace(message = "Map cleared.") {
  setBeyondDataMapRecords([], {
    activeMode:"interactive",
    activeClusterId:"",
    activeNodeId:"query",
    removedRecordIds:[],
    removedNodeIds:[],
    searchWithinMap:"",
    message
  });
  clearBeyondDataFlowCache();
  renderBeyondDataMapModal();
}

function isBeyondDataRecordSelected(recordId) {
  return safeArray(beyondDataMapState.selectedRecordIds).includes(String(recordId));
}

function toggleBeyondDataRecordSelection(recordId, selected) {
  const id = String(recordId || "");
  if (!id) return;
  const current = new Set(safeArray(beyondDataMapState.selectedRecordIds));
  if (selected) current.add(id);
  else current.delete(id);
  beyondDataMapState = {
    ...beyondDataMapState,
    selectedRecordIds:Array.from(current).slice(0, 30),
    message:""
  };
  render();
}

function renderBeyondDataSelectionBar() {
  const records = getSelectedBeyondDataRecords();
  const count = records.length;
  if (!count) {
    return `<div class="beyond-data-map-hint" role="note">
      <div>
        <strong>Beyond the Data Map</strong>
        <span>Step 1: choose records with the “Add to map” controls on result cards below. Step 2: create a cluster and matrix map.</span>
      </div>
      <button type="button" data-beyond-data-select-visible>Select first 6 results</button>
    </div>`;
  }
  return `<div class="beyond-data-map-bar" role="region" aria-label="Beyond the Data Map selection">
    <div>
      <strong>${count} selected</strong>
      <span>${count < 2 ? "Select one more record below, or use Select first 6 results, to create a reading map." : "Ready. Click Map selected records to open clusters, matrix, constellation and reading paths."}</span>
    </div>
    <div class="beyond-data-map-bar-actions">
      <button type="button" class="secondary" data-beyond-data-select-visible>Select first 6</button>
      <button type="button" class="secondary" data-beyond-data-clear>Clear</button>
      <button type="button" data-beyond-data-open onclick="event.preventDefault(); window.dispatchEvent(new CustomEvent('beyond-data-map:open'));" ${count < 2 ? "disabled" : ""}>Map selected records</button>
    </div>
  </div>`;
}

function renderBeyondDataRecordChips(recordIds, recordsById) {
  return recordIds
    .map(id => {
      const record = recordsById.get(String(id)) || getRecordByIdAny(id);
      if (!record) return "";
      return `<button type="button" class="beyond-data-record-chip" data-beyond-label-record="${escapeHtml(record.id)}" title="${escapeHtml(record.title || "Open record in Beyond the Label")}">${escapeHtml(truncateCardSummary(record.title || "Untitled record", 70))}</button>`;
    })
    .join("");
}

function renderBeyondDataClusterCard(cluster, analysis, recordsById, active) {
  const counterSearches = Array.isArray(cluster?.counterSearches) ? cluster.counterSearches : [];
  const recordIds = Array.isArray(cluster?.recordIds) ? cluster.recordIds : [];
  const searches = counterSearches.length
    ? counterSearches
    : [{ query:`${getEffectiveSearchQuery() || libraryQuery || cluster?.label || "selected records"} ${cluster?.label || ""}`, reason:"Search beyond this cluster." }];
  return `<article class="beyond-data-cluster-card${active ? " is-active" : ""}" data-beyond-data-cluster="${escapeHtml(cluster?.id || "")}" tabindex="0">
    <div class="beyond-data-cluster-head">
      <span>${escapeHtml(String(cluster?.type || "cluster").replace(/_/g, " "))}</span>
      <strong>${escapeHtml(cluster?.label || "Cluster")}</strong>
      <em>${recordIds.length} record${recordIds.length !== 1 ? "s" : ""}</em>
    </div>
    <p>${escapeHtml(cluster?.explanation || "Records grouped by a shared source position, term or reading dimension.")}</p>
    <div class="beyond-data-record-chip-list">${renderBeyondDataRecordChips(recordIds, recordsById)}</div>
    <div class="beyond-data-counter-list">
      ${searches.map(search => `<div class="beyond-data-counter">
        <span>Search this path</span>
        <code>${escapeHtml(search.query)}</code>
        <p>${escapeHtml(search.reason || "Use this search to move beyond the visible label.")}</p>
        <button type="button" data-beyond-data-search="${escapeHtml(search.query)}">Search this path</button>
      </div>`).join("")}
    </div>
  </article>`;
}

function renderBeyondDataClusterView(analysis) {
  const recordsById = new Map(getSelectedBeyondDataRecords().map(record => [String(record.id), record]));
  const clusters = Array.isArray(analysis?.clusters) ? analysis.clusters : [];
  const activeId = beyondDataMapState.activeClusterId || clusters[0]?.id || "";
  return `<section class="beyond-data-panel">
    <div class="beyond-data-section-heading">
      <span>Clusters</span>
      <strong>Patterns across selected records</strong>
      <p>Clusters are built from source position, provider, repeated terms and possible absences. They are starting points for reading, not final claims.</p>
    </div>
    <div class="beyond-data-cluster-grid">
      ${clusters.length ? clusters.map(cluster => renderBeyondDataClusterCard(cluster, analysis, recordsById, cluster.id === activeId)).join("") : `<p>No clusters were generated for this map yet.</p>`}
    </div>
  </section>`;
}

function renderBeyondDataMatrixView(analysis) {
  const rows = Array.isArray(analysis?.matrixRows) ? analysis.matrixRows : [];
  return `<section class="beyond-data-panel">
    <div class="beyond-data-section-heading">
      <span>Matrix</span>
      <strong>Compare records across reading dimensions</strong>
      <p>Rows keep the record visible while columns ask what is centred, what may sit outside the data and where counter-search should begin.</p>
    </div>
    <div class="beyond-data-matrix-wrap">
      <table class="beyond-data-matrix">
        <thead>
          <tr>
            <th>Record</th>
            <th>Source position</th>
            <th>Provider</th>
            <th>Centred voice</th>
            <th>Possible absences</th>
            <th>Counter-search</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>
            <td><button type="button" data-beyond-label-record="${escapeHtml(row.recordId)}">${escapeHtml(row.title)}</button></td>
            <td>${escapeHtml(row.sourcePosition)}</td>
            <td>${escapeHtml(row.provider || "Unclear")}</td>
            <td>${escapeHtml(row.centredVoice)}</td>
            <td>${(Array.isArray(row.possibleAbsences) ? row.possibleAbsences : []).map(absence => `<span>${escapeHtml(absence)}</span>`).join("")}</td>
            <td><code>${escapeHtml(row.suggestedCounterSearch)}</code><button type="button" data-beyond-data-search="${escapeHtml(row.suggestedCounterSearch)}">Search this</button></td>
          </tr>`).join("") || `<tr><td colspan="6">No matrix rows were generated for this map yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  </section>`;
}

function renderBeyondDataConstellationView(analysis) {
  const terms = (Array.isArray(analysis?.sharedTerms) ? analysis.sharedTerms : []).slice(0, 8);
  return `<section class="beyond-data-panel">
    <div class="beyond-data-section-heading">
      <span>Constellation</span>
      <strong>Shared terms and relations</strong>
      <p>This v1 keeps the graph calm: repeated terms become relation anchors, and selected records remain accessible through chips.</p>
    </div>
    <div class="beyond-data-constellation">
      ${terms.length ? terms.map(term => `<article>
        <span>${escapeHtml(term.count)} records</span>
        <strong>${escapeHtml(term.term)}</strong>
        <div class="beyond-data-record-chip-list">${renderBeyondDataRecordChips(term.recordIds, new Map(getSelectedBeyondDataRecords().map(record => [String(record.id), record])))}</div>
      </article>`).join("") : `<p>No repeated terms emerged strongly enough yet. Try selecting records with a shared theme, provider or source type.</p>`}
    </div>
  </section>`;
}

function renderBeyondDataReadingPathView(analysis) {
  const recordsById = new Map(getSelectedBeyondDataRecords().map(record => [String(record.id), record]));
  const paths = Array.isArray(analysis?.suggestedReadingPaths) ? analysis.suggestedReadingPaths : [];
  return `<section class="beyond-data-panel">
    <div class="beyond-data-section-heading">
      <span>Reading path</span>
      <strong>Move from list to method</strong>
      <p>Each path suggests a way to read the selected records as a relation, then search outward from the limits of the data.</p>
    </div>
    <div class="beyond-data-path-grid">
      ${paths.length ? paths.map(path => `<article class="beyond-data-path-card">
        <strong>${escapeHtml(path.title)}</strong>
        <p>${escapeHtml(path.why)}</p>
        <div class="beyond-data-record-chip-list">${renderBeyondDataRecordChips(path.recordIds, recordsById)}</div>
        ${(path.counterSearches || []).slice(0, 3).map(search => `<div class="beyond-data-counter">
          <code>${escapeHtml(search.query)}</code>
          <p>${escapeHtml(search.reason || "Follow this path through search.")}</p>
          <button type="button" data-beyond-data-search="${escapeHtml(search.query)}">Search this path</button>
        </div>`).join("")}
      </article>`).join("") : `<p>No reading paths were generated for this map yet.</p>`}
    </div>
  </section>`;
}

function renderCard(record) {
  const summary = getRecordCardSummary(record);
  const mode = getResultMode(record);
  const streamOrigin = libraryStreamOriginLabel(record);
  const streamOriginClass = libraryStreamOriginClass(record);
  const sourceSlug = libraryCardSourceSlug(record);
  const subSource = record.sourceName || record.institution || record.source || 'Archive record';
  const actionHint = mode === 'external_handoff' ? 'Open source' : 'Open record';
  const sourceUrl = safeUrl(record.sourceUrl);
  const trustState = getCardTrustState(record);
  const drawerOpen = getCardDrawerOpen(record.id);
  const hasThumb = recordHasDisplayableImage(record);

  const isLiveExternal =
    getResultMode(record) === "live" || String(record.id || "").startsWith("live-");
  const summaryBadge = isLiveExternal
    ? `<span class="record-card-summary-badge">${record.abstract ? "Scholarly abstract" : "External metadata"}</span>`
    : "";
  const creatorLine = record.creator ? `<div class="record-card-creator">${escapeHtml(record.creator)}</div>` : "";
  const sourceBits = [];
  if (subSource) sourceBits.push(escapeHtml(subSource));
  if (record.period) sourceBits.push(escapeHtml(record.period));
  const sourceLine = !hasThumb && sourceBits.length
    ? `<div class="record-card-source">${sourceBits.join(' <span class="record-card-source-dot" aria-hidden="true">·</span> ')}</div>`
    : "";

  const sourceActionLabel = record.sourceActionLabel || (String(record.liveSourceHint || "").toLowerCase() === "library-of-congress" ? "View at Library of Congress" : "View source");
  const primarySourceControl = sourceUrl
    ? `<a class="archiveAction archiveActionPrimary" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" data-stop-card-open="true" aria-label="${escapeHtml(sourceActionLabel)} (opens in new tab)">
        <span class="archiveAction__icon archiveAction__iconLeft" aria-hidden="true">→</span>
        <span class="archiveAction__text">${escapeHtml(sourceActionLabel)}</span>
        <span class="archiveAction__icon archiveAction__iconRight" aria-hidden="true">→</span>
      </a>`
    : `<button type="button" class="archiveAction archiveActionOutline" data-card-open-record aria-label="View full record details">View details</button>`;

  const recordTypeLabel = escapeHtml(displayCardRecordType(record).toUpperCase());
  const handoffLayerClass = getResultRankGroup(record) === 1 ? " is-handoff-layer" : "";
  const mapSelected = isBeyondDataRecordSelected(record.id);
  const mapSelectControl = `<label class="beyond-data-select-control" data-stop-card-open="true">
    <input type="checkbox" data-beyond-data-select="${escapeHtml(record.id)}" ${mapSelected ? "checked" : ""} aria-label="Add ${escapeHtml(record.title || "this record")} to Beyond the Data Map" />
    <span>${mapSelected ? "Added to map" : "Add to map"}</span>
  </label>`;

  const labelRow = hasThumb
    ? ""
    : `<div class="record-card-label-row">
        <span class="record-card-label type-label">${recordTypeLabel}</span>
        <span class="record-card-label source-label ${streamOriginClass}">${escapeHtml(streamOrigin)}</span>
      </div>`;
  const mediaHero = hasThumb
    ? renderRecordCardMediaHero(record, { recordTypeLabel, streamOrigin, streamOriginClass })
    : "";

  return `<article class="card record-card archive-card archive-record-card search-result-card${handoffLayerClass}${hasThumb ? " has-image has-thumb" : " no-image no-thumb"}" data-id="${escapeHtml(record.id)}" data-mode="${escapeHtml(mode)}" data-source="${escapeHtml(sourceSlug)}" data-origin="${escapeHtml(streamOrigin)}" data-trust="${escapeHtml(trustState)}" data-result-kind="${escapeHtml(getResultKind(record))}" ${mode === 'external_handoff' && sourceUrl ? `data-url="${escapeHtml(sourceUrl)}"` : ''} role="button" tabindex="0" aria-label="${escapeHtml(actionHint)} ${escapeHtml(record.title)}">
    ${mediaHero}
    <div class="record-card-body archive-card-body">
      ${labelRow}
      <div class="record-card-main">
        <div class="record-card-top">
          <div class="record-card-copy">
            <h3 class="record-card-title archive-card-title">${escapeHtml(record.title)}</h3>
            ${creatorLine}
            ${sourceLine}
            ${summary ? `<div class="record-card-summary-row">${summaryBadge}<p class="record-card-summary">${escapeHtml(summary)}</p></div>` : ""}
            <div class="record-card-divider" aria-hidden="true"></div>
            ${renderRecordMediaIndicators(record)}
            ${renderCardRightsBlock(record)}
            ${renderCardChips(record)}
          </div>
        </div>
      </div>
    </div>
    <footer class="record-card-actions cardFooter card-footer" data-stop-card-open="true">
      ${mapSelectControl}
      <div class="record-card-actions-icons cardFooter__icons card-footer-icons">
        ${renderCardWorkspaceActions(record)}
      </div>
      <div class="record-card-actions-buttons cardFooter__actions card-footer-actions">
        <button type="button" class="record-card-secondary-btn actionSecondary beyond-label-card-btn" data-beyond-label-record="${escapeHtml(record.id)}">Read beyond the label</button>
        <button type="button" class="record-card-secondary-btn actionSecondary" data-card-drawer-toggle aria-expanded="${drawerOpen ? "true" : "false"}">${drawerOpen ? "Hide details" : "More details"}</button>
        ${primarySourceControl}
      </div>
    </footer>
    <section class="record-card-drawer ${drawerOpen ? "is-open" : ""}" aria-hidden="${drawerOpen ? "false" : "true"}">
      <div class="record-card-drawer-label">Metadata</div>
      ${renderExpandedMetadataDrawer(record)}
    </section>
  </article>`;
}

function recordPlainValue(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return humanList(value);
  const str = String(value).trim();
  if (str === "undefined" || str === "null" || str === "") return "";
  return str;
}

function firstRecordValue(...values) {
  for (const value of values) {
    const text = recordPlainValue(value);
    if (text) return text;
  }
  return "";
}

function getRecordPeriodValue(record) {
  return firstRecordValue(record.period, record.year, record.date, record.datePublished, record.dateCreated);
}

function getRecordSourceValue(record) {
  return firstRecordValue(record.sourceName, record.source, record.institution, record.provider, record.collection);
}

function getRecordAccessValue(record) {
  return firstRecordValue(record.accessType, record.rightsStatus, record.reusePermission, record.licence);
}

function renderRecordKeyChips(record) {
  const chips = [
    getRecordPeriodValue(record),
    firstRecordValue(record.region, record.country, record.community),
    getRecordSourceValue(record),
  ].filter(Boolean).slice(0, 3);
  if (!chips.length) return "";
  return `<div class="record-reset-chip-row" aria-label="Key record details">${chips.map(chip => `<span class="record-reset-chip">${escapeHtml(chip)}</span>`).join("")}</div>`;
}

function renderRecordHeroBadges(record, mode) {
  const badges = [
    record.type || "Record",
    getRecordPeriodValue(record),
    resultModeLabel(mode),
    getRecordSourceValue(record),
  ].filter(Boolean).slice(0, 4);
  if (!badges.length) return "";
  return `<div class="record-hero-badges" aria-label="Record categories">
    ${badges.map(value => `<span class="record-hero-badge">${escapeHtml(value)}</span>`).join("")}
  </div>`;
}

function renderRecordHeroFacts(record) {
  const facts = [
    getRecordPeriodValue(record),
    firstRecordValue(record.region, record.country, record.community),
    getRecordSourceValue(record),
  ].filter(Boolean).slice(0, 3);
  if (!facts.length) return "";
  return `<div class="record-hero-facts" aria-label="Key record details">
    ${facts.map(value => `<span class="record-hero-fact">${escapeHtml(value)}</span>`).join("")}
  </div>`;
}

function renderRecordHeroContext(record) {
  const context = [
    record.institution,
    record.collection,
    firstRecordValue(record.country, record.region, record.community),
  ].filter(Boolean);
  if (!context.length) return "";
  return `<div class="record-hero-context">
    ${context.map((value, index) => `${index ? `<span class="record-hero-context-sep" aria-hidden="true">·</span>` : ""}<span>${escapeHtml(value)}</span>`).join("")}
  </div>`;
}

function renderRecordTopActions(record) {
  const selected = isBeyondDataRecordSelected(record.id);
  return `<div class="record-top-actions" aria-label="Record actions">
    <button type="button" class="record-top-action" data-record-scroll-target=".record-citation-card">Cite</button>
    <button type="button" class="record-top-action" data-record-scroll-target=".record-workspace-tools">Save</button>
    <button type="button" class="record-top-action" data-record-scroll-target=".record-workspace-tools">Add to reading list</button>
    <button type="button" class="record-top-action" data-record-add-to-map="${escapeHtml(record.id)}">${selected ? "Added to map" : "Add to map"}</button>
  </div>`;
}

function renderRecordInfoGrid(fields) {
  const rows = fields
    .map(([label, value, variant]) => [label, metadataDisplayValue(value), variant])
    .filter(([, value]) => value);
  if (!rows.length) return `<p class="record-muted">No structured fields are available for this section yet.</p>`;
  return `<div class="record-summary-grid">${rows.map(([label, value, variant]) => `<div class="record-summary-item ${variant ? `is-${escapeHtml(variant)}` : ""}">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  </div>`).join("")}</div>`;
}

function getRecordSummaryFields(record) {
  return [
    ["Creator", record.creator || humanList(record.contributors)],
    ["Year / period", getRecordPeriodValue(record)],
    ["Source", getRecordSourceValue(record)],
    ["Record type", record.type || resultModeLabel(getResultMode(record))],
    ["Access", getRecordAccessValue(record), getRecordAccessValue(record) ? "access" : ""],
    ["Category", record.cat || record.collection],
  ];
}

function getRecordLabelChips(record) {
  return [
    ["Source", getRecordSourceValue(record)],
    ["Region", firstRecordValue(record.region, record.country, record.community)],
    ["Category", record.cat],
    ["Record type", record.type],
    ["Access", record.accessType],
    ["Rights", record.rightsStatus],
  ].filter(([, value]) => metadataDisplayValue(value));
}

function getRightsReviewChips(record) {
  return [
    ["Rights", record.rightsStatus || record.rights],
    ["Access", record.accessType],
    ["Reuse", record.reusePermission || record.licence],
    ["Sensitivity", record.culturalSensitivity],
    ["Community review", record.communityReviewStatus],
    ["Verification", record.verificationStatus],
  ].filter(([, value]) => metadataDisplayValue(value));
}

function recordKeywordTerms(record, limit = 8) {
  const sourceText = [
    record.title,
    record.alternateTitle,
    record.creator,
    record.region,
    record.country,
    record.community,
    record.cat,
    record.type,
    record.collection,
    humanList(record.concepts),
    humanList(record.knowledgeAreas || record.themes),
    humanList(record.tags),
  ].filter(Boolean).join(" ");
  return extractBeyondDataKeywordPhrases(sourceText, { source:"record", currentQuery: libraryQuery })
    .map(item => item.term)
    .filter(Boolean)
    .filter((term, index, list) => list.indexOf(term) === index)
    .slice(0, limit);
}

function getCounterSearchSuggestions(record) {
  const titleTerms = extractBeyondDataKeywordPhrases(record.title || "", { source:"title", currentQuery: libraryQuery }).map(item => item.term);
  const region = firstRecordValue(record.region, record.country, record.community);
  const category = firstRecordValue(record.cat, record.type, record.collection);
  const creator = firstRecordValue(record.creator);
  const source = getRecordSourceValue(record);
  const base = titleTerms[0] || record.title || libraryQuery || category || "archive record";
  const raw = [
    {
      query: [base, "critique"].filter(Boolean).join(" "),
      recovers: "field debates, source position and alternative readings around the record.",
    },
    {
      query: [region, category || base, "community context"].filter(Boolean).join(" "),
      recovers: "place, community or practice contexts that may sit outside the visible label.",
    },
    {
      query: [creator || source || base, "interview direct voice"].filter(Boolean).join(" "),
      recovers: "direct voice, authorship or reception beyond catalogue description.",
    },
    {
      query: [base, "history provenance"].filter(Boolean).join(" "),
      recovers: "how the record, object, argument or source may have been made and circulated.",
    },
  ];
  const seen = new Set();
  return raw
    .map(item => ({ ...item, query: item.query.replace(/\s+/g, " ").trim() }))
    .filter(item => item.query && !seen.has(item.query.toLowerCase()) && seen.add(item.query.toLowerCase()))
    .slice(0, 4);
}

function renderReadOtherwisePrompts() {
  const prompts = [
    ["Who is centred?", "What institution, author, archive or discipline frames this record?", "record-summary-section"],
    ["What is missing?", "Which voices, languages, places, practices or communities are absent?", "record-label-check-section"],
    ["What relations matter?", "What people, histories, lands, practices or struggles sit around this record?", "record-relations-section"],
    ["Where else can this lead?", "What counter-searches could open another pathway?", "record-counter-search-section"],
  ];
  return `<section class="record-reading-card record-read-otherwise" id="record-read-otherwise">
    <div class="record-card-heading">
      <span>Reading mode</span>
      <h2>Read this record otherwise</h2>
      <p>Use these prompts to question how this record is framed.</p>
    </div>
    <div class="record-prompt-grid">
      ${prompts.map(([title, copy, target], index) => `<button type="button" class="record-prompt-card" data-record-scroll-target="#${target}">
        <span class="record-prompt-mark" aria-hidden="true">${index + 1}</span>
        <strong>${escapeHtml(title)}</strong>
        <em>${escapeHtml(copy)}</em>
        <span class="record-prompt-arrow" aria-hidden="true">→</span>
      </button>`).join("")}
    </div>
  </section>`;
}

function renderRecordSummaryAndLabelCheck(record) {
  const labelChips = getRecordLabelChips(record);
  const renderedLabelChips = labelChips.length
    ? labelChips.map(([label, value]) => `<span class="record-reset-label-chip">
        <span class="record-reset-label-name">${escapeHtml(label)}</span>
        <span class="record-reset-label-value">${escapeHtml(metadataDisplayValue(value))}</span>
      </span>`).join("")
    : `<span class="record-muted">No source labels are available.</span>`;
  return `<div class="record-summary-pair">
    <section class="record-reading-card" id="record-summary-section">
      <div class="record-card-heading">
        <span>Record summary</span>
        <h2>Key details about this record</h2>
      </div>
      ${renderRecordInfoGrid(getRecordSummaryFields(record))}
    </section>
    <section class="record-reset-label-check record-card" id="record-label-check-section">
      <div class="record-reset-label-check-header">
        <p class="record-eyebrow">Label check</p>
        <h2>Labels are framing devices</h2>
        <p>These labels describe how this record is framed. Treat them as framing devices, not neutral facts.</p>
      </div>
      <div class="record-reset-label-list" aria-label="Record framing labels">
        ${renderedLabelChips}
      </div>
      <div class="record-reset-label-check-footer">
        <p>Which labels help? Which labels flatten the record?</p>
        <button type="button" data-record-scroll-target=".record-workspace-tools">Add your reflection</button>
      </div>
    </section>
  </div>`;
}

/* ── Node popup — shows keyword/value on click before searching ── */
function showNodePopup(triggerEl, label, value) {
  // Remove any existing popup
  document.querySelectorAll('.record-node-popup').forEach(p => p.remove());

  const popup = document.createElement('div');
  popup.className = 'record-node-popup';
  popup.setAttribute('role', 'tooltip');
  popup.innerHTML = `
    <button class="record-node-popup-close" type="button" aria-label="Dismiss">×</button>
    <span class="record-node-popup-type">${escapeHtml(label)}</span>
    <strong class="record-node-popup-value">${escapeHtml(value)}</strong>
    <button type="button" class="record-node-popup-search">Search for this →</button>
  `;
  document.body.appendChild(popup);

  // Defer positioning until after the browser has laid out the popup,
  // so offsetHeight / offsetWidth return real values instead of 0.
  requestAnimationFrame(() => {
    const rect = triggerEl.getBoundingClientRect();
    const ph = popup.offsetHeight || 110;
    const pw = popup.offsetWidth || 220;
    let top = rect.top + window.scrollY - ph - 10;
    let left = rect.left + window.scrollX + rect.width / 2 - pw / 2;
    if (top < window.scrollY + 8) top = rect.bottom + window.scrollY + 10;
    if (left < 8) left = 8;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - 8 - pw;
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    popup.style.opacity = '1'; // reveal after position is set
  });
  popup.style.opacity = '0'; // hide until positioned

  const close = () => popup.remove();
  popup.querySelector('.record-node-popup-close').addEventListener('click', close);
  popup.querySelector('.record-node-popup-search').addEventListener('click', () => {
    close();
    applyLibraryQuery(value);
    navigate('library');
  });

  // Dismiss on outside click
  const outside = (e) => {
    if (!popup.contains(e.target) && e.target !== triggerEl) {
      close();
      document.removeEventListener('click', outside, true);
    }
  };
  setTimeout(() => document.addEventListener('click', outside, true), 80);
}

function renderRelationPreview(record, related = []) {
  const terms = recordKeywordTerms(record, 5);
  const nodes = [
    ["Creator", record.creator],
    ["Source", getRecordSourceValue(record)],
    ["Region", firstRecordValue(record.region, record.country, record.community)],
    ...terms.slice(0, 3).map(term => ["Keyword", term]),
    ...related.slice(0, 2).map(item => ["Related", item.title]),
    ["Possible absence", "community voice"],
    ["Counter-search", getCounterSearchSuggestions(record)[0]?.query || ""],
  ].filter(([, value]) => value).slice(0, 9);
  return `<section class="record-reading-card record-relation-preview" id="record-relations-section">
    <div class="record-card-heading">
      <span>Relations around this record</span>
      <h2>People, places, concepts and sources connected to this record</h2>
    </div>
    ${nodes.length ? `<div class="record-network-preview" aria-label="Relation preview">
      <div class="record-network-core" aria-hidden="true">Record</div>
      ${nodes.map(([label, value], index) => {
        const angle = (index / nodes.length) * Math.PI * 2;
        const x = 50 + Math.cos(angle) * 34;
        const y = 50 + Math.sin(angle) * 34;
        const searchable = ["Creator", "Source", "Region", "Keyword", "Counter-search"].includes(label);
        const val = metadataDisplayValue(value);
        if (searchable) {
          return `<button type="button" class="record-network-node is-searchable" data-record-counter-search="${escapeHtml(val)}" data-record-node-label="${escapeHtml(label)}" style="--x:${x.toFixed(2)}%; --y:${y.toFixed(2)}%;" title="Search: ${escapeHtml(val)}"><i></i>${escapeHtml(label)}</button>`;
        }
        return `<span class="record-network-node" style="--x:${x.toFixed(2)}%; --y:${y.toFixed(2)}%;" title="${escapeHtml(`${label}: ${val}`)}"><i></i>${escapeHtml(label)}</span>`;
      }).join("")}
    </div>
    <div class="record-network-legend">
      ${["Creator", "Source", "Keywords", "Region", "Related records", "Possible absences", "Counter-search pathways"].map(item => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>` : `<p class="record-muted">Add this record to a map to see relations, absences and counter-search pathways.</p>`}
    <div class="record-section-actions">
      <button type="button" class="record-secondary-button" data-record-add-to-map="${escapeHtml(record.id)}">Add to map</button>
      <button type="button" class="record-secondary-button" data-record-open-map="${escapeHtml(record.id)}">Open full map</button>
    </div>
  </section>`;
}

function renderCounterSearchSection(record) {
  const suggestions = getCounterSearchSuggestions(record);
  if (!suggestions.length) return "";
  return `<section class="record-reading-card record-counter-searches" id="record-counter-search-section">
    <div class="record-card-heading">
      <span>Search against the label</span>
      <h2>Try searches that challenge the framing</h2>
      <p>These pathways are generated from visible record data and may recover context outside the source label.</p>
    </div>
    <div class="record-counter-search-grid">
      ${suggestions.map(item => `<article class="record-counter-card">
        <span>Counter-search</span>
        <strong>${escapeHtml(item.query)}</strong>
        <p><b>May recover:</b> ${escapeHtml(item.recovers)}</p>
        <button type="button" class="record-primary-button" data-record-counter-search="${escapeHtml(item.query)}">Search this</button>
      </article>`).join("")}
    </div>
  </section>`;
}

function renderCommunityReading(record) {
  const notes = getRecordCommunityNotes(record.id);
  const activeAction = recordCommunityDraftState.recordId === record.id ? recordCommunityDraftState.action : "";
  const activeNoteId = recordCommunityDraftState.recordId === record.id ? recordCommunityDraftState.noteId || "" : "";
  const editingNote = activeNoteId ? notes.find(note => note.id === activeNoteId) : null;
  const activeMeta = activeAction ? getCommunityActionMeta(activeAction) : null;
  const noteHtml = notes.length
    ? `<div class="record-community-note-list">
        ${notes.map(note => `<article class="record-community-note" data-community-note-id="${escapeHtml(note.id || "")}">
          <div class="record-community-note-header">
            <div class="record-community-note-heading">
              <span>${escapeHtml(note.label || "Community note")}</span>
              <strong>${escapeHtml(note.title || "Community contribution")}</strong>
            </div>
            <div class="record-community-note-actions">
              <button type="button" class="record-community-note-action" data-record-community-edit="${escapeHtml(note.id || "")}" data-record-id="${escapeHtml(record.id)}" aria-label="Edit ${escapeHtml(note.title || "community note")}" title="Edit">Edit</button>
              <button type="button" class="record-community-note-action is-danger" data-record-community-delete="${escapeHtml(note.id || "")}" data-record-id="${escapeHtml(record.id)}" aria-label="Remove ${escapeHtml(note.title || "community note")}" title="Remove">Remove</button>
            </div>
          </div>
          <p>${escapeHtml(note.body || "")}</p>
          <div class="record-community-note-meta">
            ${note.contact ? `<small>Contact: ${escapeHtml(note.contact)}</small>` : ""}
            ${note.updatedAt ? `<small>Updated ${escapeHtml(new Date(note.updatedAt).toLocaleDateString())}</small>` : note.createdAt ? `<small>Added ${escapeHtml(new Date(note.createdAt).toLocaleDateString())}</small>` : ""}
          </div>
        </article>`).join("")}
      </div>`
    : `<div class="record-community-empty">
        <strong>No community notes yet.</strong>
        <p>Be the first to add context, suggest a correction or request a community review.</p>
      </div>`;
  const formHtml = activeMeta ? `<form class="record-community-form" data-record-community-form data-record-id="${escapeHtml(record.id)}" data-community-action="${escapeHtml(activeMeta.id)}" data-community-note-id="${escapeHtml(editingNote?.id || "")}">
      <div class="record-community-form-header">
        <span>${escapeHtml(activeMeta.label)}</span>
        <strong>${escapeHtml(editingNote ? `Edit ${activeMeta.label.toLowerCase()}` : activeMeta.title)}</strong>
        <p>${escapeHtml(editingNote ? "Update this locally saved contribution. It still does not alter source metadata." : activeMeta.helper)}</p>
      </div>
      <label>
        <span>Short title</span>
        <input name="title" type="text" maxlength="120" placeholder="${escapeHtml(activeMeta.title)}" value="${escapeHtml(editingNote?.title || "")}" required>
      </label>
      <label>
        <span>Context</span>
        <textarea name="body" rows="5" maxlength="1200" placeholder="${escapeHtml(activeMeta.placeholder)}" required>${escapeHtml(editingNote?.body || "")}</textarea>
      </label>
      <label>
        <span>Contact or source link <small>(optional)</small></span>
        <input name="contact" type="text" maxlength="180" placeholder="Email, source URL or attribution note" value="${escapeHtml(editingNote?.contact || "")}">
      </label>
      <p class="record-community-privacy">Saved locally in this browser for now. It does not change the source metadata or claim community review.</p>
      <div class="record-community-form-actions">
        <button type="button" class="record-secondary-button" data-record-community-cancel>Cancel</button>
        <button type="submit" class="record-primary-button">${editingNote ? "Save changes" : "Save locally"}</button>
      </div>
    </form>` : "";
  return `<section class="record-reading-card record-community-card" id="record-community-section">
    <div class="record-card-heading">
      <span>Community reading</span>
      <h2>Context from people connected to the record</h2>
      <p>${notes.length ? "Locally saved reader notes for this record. These notes do not change the source metadata or claim community review." : "Community notes are not present for this record yet. You can add context, suggest a correction or request review without treating this metadata as complete."}</p>
    </div>
    <div class="record-community-grid">
      ${noteHtml}
      <div class="record-community-actions">
        ${RECORD_COMMUNITY_ACTIONS.map(item => `<button type="button" class="record-secondary-button ${activeAction === item.id ? "is-active" : ""}" data-record-community-action="${escapeHtml(item.id)}" data-record-id="${escapeHtml(record.id)}">${escapeHtml(item.label)}</button>`).join("")}
      </div>
    </div>
    ${formHtml}
  </section>`;
}

function renderCareNote(record, compact = false) {
  const sensitivity = String(record.culturalSensitivity || "").trim();
  const elevated = sensitivity && !/public|none|not required/i.test(sensitivity);
  return `<section class="record-care-note ${compact ? "is-compact" : ""} ${elevated ? "is-elevated" : ""}">
    <h2>Care note</h2>
    <p>${elevated ? "This record carries a visible sensitivity or review signal. Check the original source and consider community protocols before reuse." : "This record may be public metadata, but its labels can still carry institutional, disciplinary or colonial assumptions. Check the original source and consider whose knowledge is represented or absent."}</p>
  </section>`;
}

function renderReadingChecks(record) {
  const checks = [
    ["Source position identified", Boolean(getRecordSourceValue(record))],
    ["Community voice considered", false],
    ["Language and naming checked", Boolean(record.language || record.script)],
    ["Rights and reuse checked", Boolean(getRecordAccessValue(record))],
    ["Related records mapped", isBeyondDataRecordSelected(record.id)],
    ["Counter-search created", false],
  ];
  return `<section class="record-reading-checks">
    <h2>Reading checks</h2>
    <p>Use this as a guide for a more critical and ethical reading.</p>
    <ul>${checks.map(([label, done]) => `<li><span class="${done ? "is-done" : "is-todo"}"></span>${escapeHtml(label)}</li>`).join("")}</ul>
    <div class="record-check-legend"><span>Todo</span><span>Done</span></div>
  </section>`;
}

function renderRecordDisclosure(id, title, bodyHtml, open = false) {
  if (!bodyHtml) return "";
  return `<details class="record-disclosure" id="${escapeHtml(id)}" ${open ? "open" : ""}>
    <summary>${escapeHtml(title)}<span aria-hidden="true">⌄</span></summary>
    <div class="record-disclosure-body">${bodyHtml}</div>
  </details>`;
}

function renderContextSection(record) {
  return renderRecordDisclosure("record-context-section", "Context", renderRecordInfoGrid([
    ["Institution", record.institution],
    ["Region", firstRecordValue(record.region, record.country, record.community)],
    ["Collection", record.collection],
    ["Source type", record.sourceType || resultModeLabel(getResultMode(record))],
    ["Mode", resultModeLabel(getResultMode(record))],
  ]), false);
}

function renderRightsReviewSection(record) {
  const chips = getRightsReviewChips(record);
  if (!chips.length) return "";
  const tokenHtml = chips.map(([label, value]) => {
    const labelText = String(label || "").trim();
    const valueText = metadataDisplayValue(value);
    return `<span class="record-rights-token" aria-label="${escapeHtml(`${labelText}: ${valueText}`)}">${escapeHtml(labelText)} · ${escapeHtml(valueText)}</span>`;
  }).join("");

  return `<section class="record-rights-clean" id="record-rights-review-section" aria-labelledby="record-rights-review-heading">
    <div class="record-rights-clean-heading">
      <p id="record-rights-review-heading">Rights and review</p>
    </div>
    <div class="record-rights-clean-body">
      <div class="record-rights-token-list" aria-label="Rights and review labels">${tokenHtml}</div>
      <article class="record-rights-clean-care">
        <h3>Care note</h3>
        <p>This record may be public metadata, but its labels can still carry institutional, disciplinary or colonial assumptions. Check the original source and consider whose knowledge is represented or absent.</p>
      </article>
    </div>
  </section>`;
}

function renderProvenanceSection(record) {
  const notes = [
    record.provenance,
    record.rights ? `Rights statement: ${record.rights}` : "",
    record.source ? `External source rights apply through ${record.source}.` : "",
  ].filter(Boolean);
  if (!notes.length) return "";
  return renderRecordDisclosure("record-provenance-section", "Provenance", `<div class="record-note-block">${notes.map(note => `<p>${escapeHtml(note)}</p>`).join("")}</div>`, false);
}

function renderTechnicalDetailsSection(rows) {
  if (!rows.length) return "";
  const body = `<div class="record-technical-list">${rows.map(([label, value]) => `<div class="record-technical-row"><span>${escapeHtml(label)}</span><code>${escapeHtml(metadataDisplayValue(value))}</code><button type="button" data-record-copy-value="${escapeHtml(metadataDisplayValue(value))}" aria-label="Copy ${escapeHtml(label)}">Copy</button></div>`).join("")}</div>`;
  return renderRecordDisclosure("record-technical-details-section", "Technical details", body, false);
}

function renderAtAGlanceCard(record) {
  return `<section class="record-sidebar-card record-at-a-glance">
    <h2>At a glance</h2>
    <p>The essential details.</p>
    ${renderRecordInfoGrid([
      ["Year", getRecordPeriodValue(record)],
      ["Source", getRecordSourceValue(record)],
      ["Record type", record.type || resultModeLabel(getResultMode(record))],
      ["Access", getRecordAccessValue(record), "access"],
    ])}
  </section>`;
}

function renderRecord() {
  const record = getRecordByIdAny(selectedRecordId);
  if (!record) {
    return `<div class="page active">
        <div class="detail record-detail-page">
          <div class="detail-shell record-detail-shell">
            <div class="breadcrumb record-detail-breadcrumb">
              <a href="/home" data-page="home">Archive</a>
              <span>›</span>
              <a href="/library" data-page="library">Library</a>
              <span>›</span>
              <span>Record</span>
            </div>
            <div class="empty record-empty" role="status">
              <h3>Record not found</h3>
              <p>The requested record is not available in the archive index or current external result cache. Return to the library and continue browsing.</p>
            </div>
          </div>
        </div>
      </div>`;
  }

  const overviewBlock = getRecordOverviewBlock(record);
  const {primary, secondary} = getPrimaryNarrative(record, overviewBlock);
  const identifierRows = [
    ['Record ID', record.recordIdentifier],
    ['Archive ID', record.archiveIdentifier],
    ['Mode', resultModeLabel(getResultMode(record))],
  ].filter(([, value]) => value);
  const narrativeMetadataRows = [
    ['Provenance', record.provenance],
    ['Rights statement', record.rights],
  ].filter(([, value]) => value);
  const metadataRows = [
    ['Title', record.title],
    ['Alternate title', record.alternateTitle],
    ['Creator', record.creator],
    ['Contributors', humanList(record.contributors)],
    ['Institution', record.institution],
    ['Source', record.source],
    ['Country', record.country],
    ['Region', record.region],
    ['Community', record.community],
    ['Period', record.period],
    ['Category', record.cat],
    ['Record type', record.type],
    ['Collection', record.collection],
    ['Material', record.material],
    ['Medium', record.medium],
    ['Language', humanList(record.language)],
    ['Script / Writing System', humanList(record.script)],
    ['Rights Status', record.rightsStatus],
    ['Licence', record.licence],
    ['Access Type', record.accessType],
    ['Reuse Permission', record.reusePermission],
    ['Cultural Sensitivity', record.culturalSensitivity],
    ['Community Review Status', record.communityReviewStatus],
    ['Verification Status', record.verificationStatus],
    ['Date Accessed', record.dateAccessed],
    ['Source Type', record.sourceType],
  ].filter(([, value]) => value);
  const recordDetailMetadataRows = [
    ...metadataRows,
    ...narrativeMetadataRows,
    ...identifierRows,
  ].filter(([, value]) => value);
  const related = getResultMode(record) === 'local' || getResultMode(record) === 'hybrid'
    ? getRelatedRecords(record, 3)
    : [];
  const leadImage = canDisplayMedia(record) ? getLeadImage(record) : null;
  const gallery = canDisplayMedia(record) ? getGalleryImages(record) : [];
  const warning = rightsWarning(record);
  const mode = getResultMode(record);
  const citation = generateCitationByStyle(record, citationStyle);
  const relatedSection = related.length
    ? `<section class="record-reset-related">
        <div class="record-reset-related-header">
          <h2>Related Records</h2>
        </div>
        <div class="record-reset-related-grid">${related.map(entry => renderRelatedRecordCard(entry.item, entry.reason)).join('')}</div>
      </section>`
    : '';

  return `<div class="page active">
    <div class="detail record-detail-page">
      <div class="detail-shell record-detail-shell">
        <div class="breadcrumb record-detail-breadcrumb">
          <a href="/home" data-page="home">Archive</a>
          <span>›</span>
          <a href="/library" data-page="library">Library</a>
          <span>›</span>
          <span>${escapeHtml(record.type || 'Record')}</span>
        </div>

        <header class="record-hero-reset">
          ${renderRecordHeroBadges(record, mode)}
          <div class="record-hero-title-block">
            <h1 class="record-hero-title">${escapeHtml(record.title)}</h1>
            ${record.alternateTitle ? `<div class="record-hero-alt">${escapeHtml(record.alternateTitle)}</div>` : ''}
            ${record.creator ? `<div class="record-hero-creator">${escapeHtml(record.creator)}</div>` : ''}
          </div>
          ${renderRecordHeroFacts(record)}
          ${renderRecordHeroContext(record)}
          <div class="record-hero-action-row">
            ${renderRecordTopActions(record)}
            ${record.sourceUrl ? `<a class="record-hero-source-button" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open original source record">Open original source <span aria-hidden="true">↗</span></a>` : ''}
          </div>
        </header>

        ${warning ? `<section class="record-hero-notice">
          <div class="record-hero-notice-label">Rights and cultural protocol</div>
          <p>${escapeHtml(warning)}</p>
          ${record.culturalProtocolNote ? `<p>${escapeHtml(record.culturalProtocolNote)}</p>` : ''}
          ${record.sourceUrl ? `<a href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open original source</a>` : ''}
        </section>` : ''}

        ${leadImage ? `<figure class="detail-media" data-media-root>
          <div class="detail-media-main"><img src="${escapeHtml(leadImage.src)}" alt="${escapeHtml(leadImage.alt)}" loading="lazy"/></div>
          ${leadImage.caption ? `<figcaption class="detail-media-caption">${escapeHtml(leadImage.caption)}</figcaption>` : ''}
          ${gallery.length ? `<div class="gallery-grid">${gallery.map(image => `<figure class="gallery-thumb"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy"/>${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}
        </figure>` : ''}

        <div class="detail-body record-detail-layout">
          <main class="detail-main record-detail-main">
            ${renderRecordOverviewBlock(record)}
            ${renderReadOtherwisePrompts()}
            <section class="detail-summary record-reading-card record-narrative-summary">
              <div class="label">${escapeHtml(primary.label)}</div>
              ${primary.content.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
            </section>
            ${secondary.map(section => `<section class="detail-section alt"><h2>${escapeHtml(section.label)}</h2><div class="detail-copy">${section.content.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div></section>`).join('')}
            ${renderRecordSummaryAndLabelCheck(record)}
            ${renderRelationPreview(record, related)}
            ${renderCounterSearchSection(record)}
            ${renderCommunityReading(record)}
            ${renderContextSection(record)}
            ${renderRightsReviewSection(record)}
            ${renderProvenanceSection(record)}
            ${renderTechnicalDetailsSection(recordDetailMetadataRows)}
            ${renderTagSection('Concepts', record.concepts, 'concept-tag')}
            ${renderTagSection('Knowledge Areas', record.knowledgeAreas || record.themes, 'theme-chip')}
            ${renderTagSection('Tags', record.tags)}
          </main>

          <aside class="detail-side record-detail-sidebar">
            ${renderAtAGlanceCard(record)}
            ${renderReadingChecks(record)}
            ${renderCareNote(record, true)}
            ${renderBeyondLabelRecordEntry(record)}
            ${renderRecordWorkspaceTools(record)}
            ${renderActionList(record)}
            <section class="record-sidebar-card record-citation-card">
              <h2>Citation</h2>
              <div class="record-citation-controls">
                <label class="record-field record-citation-style-field">
                  <span>Style</span>
                  <select id="citationStyleSelect" class="record-select">
                    <option value="apa" ${citationStyle === 'apa' ? 'selected' : ''}>APA 7</option>
                    <option value="chicago" ${citationStyle === 'chicago' ? 'selected' : ''}>Chicago</option>
                    <option value="mla" ${citationStyle === 'mla' ? 'selected' : ''}>MLA 9</option>
                    <option value="harvard" ${citationStyle === 'harvard' ? 'selected' : ''}>Harvard</option>
                  </select>
                </label>
                <button class="record-icon-button" id="copyCitationInlineBtn" type="button" aria-label="Copy citation" title="Copy citation" aria-live="polite">⎘</button>
              </div>
              <blockquote class="record-citation-text" id="citationText">${escapeHtml(citation)}</blockquote>
            </section>
            ${(record.notes || []).length ? `<section class="record-sidebar-card record-notes-card"><h2>Notes</h2><div class="note-list">${(record.notes || []).map(note => `<p>${escapeHtml(note)}</p>`).join('')}</div></section>` : ''}
            ${(record.externalLinks || []).length ? `<section class="record-sidebar-card record-external-references-card"><h2>External References</h2><div class="inline-links">${(record.externalLinks || []).map(link => `<a class="inline-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join('')}</div></section>` : ''}
          </aside>
        </div>

        ${relatedSection}
      </div>
    </div>
  </div>`;
}
function renderLiveStatus(){ const effectiveQuery = getEffectiveSearchQuery(); if (!effectiveQuery || !sourceMode) return ''; const alertText = liveStatus.state === "error" ? [liveStatus.message || "External source discovery failed.", liveStatus.openAccessWarning].filter(Boolean).join(" ") : (liveStatus.openAccessWarning || ""); const alertHtml = alertText ? `<div class="live-status-warning" role="alert">${escapeHtml(alertText)}</div>` : ""; return `<div class="source-status">${alertHtml}<div class="live-status-detail"><div>${escapeHtml(liveStatus.message || 'External source discovery is ready when archive results are sparse.')}</div>${liveStatus.sources && liveStatus.sources.length ? `<div class="live-status-meta">${liveStatus.sources.map(source => `<span class="live-status-chip ${source.state === 'ok' ? 'ok' : source.state === 'fail' ? 'fail' : ''}">${formatLiveStatusChip(source)}</span>`).join('')}</div>` : ''}</div></div>`; }

function formatLiveStatusChip(source) {
  if (source.state === "fail") {
    const detail = source.detail ? ` — ${source.detail}` : " — unavailable";
    return `${escapeHtml(source.label)}${escapeHtml(detail)}`;
  }
  if (source.state === "loading") return `${escapeHtml(source.label)} · …`;
  return `${escapeHtml(source.label)}${typeof source.count === "number" ? ` · ${source.count}` : ""}`;
}
function renderSearchSaveAction(effectiveQuery){
  if (!effectiveQuery) return "";
  if (memberWorkspaceState.status === "idle") {
    ensureLibraryMemberAuth();
  }
  if (!canUseAdvancedSearch()) return "";
  const defaultLabel = effectiveQuery || libraryQuery || "";
  const message = memberWorkspaceState.message ? `<span class="search-save-message">${escapeHtml(memberWorkspaceState.message)}</span>` : "";
  return `
    <form class="search-save-action search-save-inline" id="saveSearchForm" data-save-search>
      <input type="hidden" name="query" value="${escapeHtml(effectiveQuery || libraryQuery)}" />
      <input
        class="search-save-inline-input"
        name="label"
        value="${escapeHtml(defaultLabel)}"
        aria-label="Saved search label"
        placeholder="Name this search"
      />
      <button class="search-save-inline-button" type="submit">
        ${memberWorkspaceState.status === "saving" ? `<span class="record-action-spinner" aria-hidden="true"></span>` : "Save this search"}
      </button>
      ${message}
    </form>
  `;
}

function parseAdvancedTerms(value) {
  return String(value || "")
    .split(/[,;\n]+/)
    .map(term => term.trim())
    .filter(Boolean);
}

function quoteAdvancedTerm(term, force = false) {
  const clean = String(term || "").trim().replace(/^["']|["']$/g, "");
  if (!clean) return "";
  return force || /\s/.test(clean) ? `"${clean.replace(/"/g, '\\"')}"` : clean;
}

function uniqueAdvancedTerms(terms) {
  const seen = new Set();
  const result = [];
  terms.forEach(term => {
    const clean = String(term || "").trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) return;
    seen.add(key);
    result.push(clean);
  });
  return result;
}

function buildAdvancedConceptClause(concept) {
  const terms = uniqueAdvancedTerms([
    concept.mainTerm,
    ...parseAdvancedTerms(concept.synonyms),
  ]);
  const phrases = uniqueAdvancedTerms(parseAdvancedTerms(concept.exactPhrases));
  const parts = [
    ...terms.map(term => quoteAdvancedTerm(term)),
    ...phrases.map(term => quoteAdvancedTerm(term, true))
  ].filter(Boolean);
  if (!parts.length) return "";
  return parts.length === 1 ? parts[0] : `(${parts.join(" OR ")})`;
}

function buildAdvancedSearchQuery() {
  const conceptClauses = advancedSearchState.concepts
    .map(buildAdvancedConceptClause)
    .filter(Boolean);
  const exclusions = uniqueAdvancedTerms(
    advancedSearchState.concepts.flatMap(concept => parseAdvancedTerms(concept.excludeTerms))
  );
  const parts = [];
  if (conceptClauses.length) parts.push(conceptClauses.join("\nAND\n"));
  if (exclusions.length) {
    parts.push(`NOT\n(${exclusions.map(term => quoteAdvancedTerm(term)).join(" OR ")})`);
  }
  return parts.join("\n").trim();
}

function blankAdvancedConcept(label) {
  return { label, mainTerm: "", synonyms: "", exactPhrases: "", excludeTerms: "" };
}

function renumberAdvancedConceptLabels() {
  advancedSearchState.concepts.forEach((concept, index) => {
    concept.label = `Concept ${index + 1}`;
  });
}

function addAdvancedConcept() {
  if (advancedSearchState.concepts.length >= ADVANCED_SEARCH_MAX_CONCEPTS) {
    advancedSearchState.message = `Maximum of ${ADVANCED_SEARCH_MAX_CONCEPTS} concepts.`;
    render();
    return;
  }
  syncAdvancedSearchStateFromPanel();
  advancedSearchState.concepts.push(
    blankAdvancedConcept(`Concept ${advancedSearchState.concepts.length + 1}`)
  );
  advancedSearchState.message = "";
  render();
}

function removeAdvancedConcept(index) {
  if (advancedSearchState.concepts.length <= ADVANCED_SEARCH_MIN_CONCEPTS) return;
  syncAdvancedSearchStateFromPanel();
  advancedSearchState.concepts.splice(index, 1);
  renumberAdvancedConceptLabels();
  advancedSearchState.message = "";
  render();
}

function buildAdvancedSearchExport(format = "plain") {
  const query = buildAdvancedSearchQuery();
  const searchedAt = new Date().toISOString();
  const sourceLabels = advancedSearchState.sources
    .map(id => ADVANCED_SEARCH_SOURCES.find(source => source[0] === id)?.[1] || id)
    .join(", ");
  const resultCounts = {
    archive: localResults.length,
    live: safeArray(liveResults).filter(item => getResultMode(item) === "live").length,
    handoffs: safeArray(liveResults).filter(item => getResultMode(item) === "external_handoff").length,
    sources: liveStatus.sources || []
  };
  const payload = {
    title: advancedSearchState.title,
    reviewQuestion: advancedSearchState.reviewQuestion,
    query,
    searchedAt,
    sources: advancedSearchState.sources,
    sourceLabels,
    filters: advancedSearchState.filters,
    resultCounts,
    concepts: advancedSearchState.concepts,
    notes: advancedSearchState.notes
  };

  if (format === "json") return JSON.stringify(payload, null, 2);
  if (format === "csv") {
    const csvEscape = value => {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    return [
      "title,query,searched_at,sources,filters_json,result_counts_json,notes",
      [
        payload.title,
        payload.query,
        payload.searchedAt,
        payload.sourceLabels,
        JSON.stringify(payload.filters),
        JSON.stringify(payload.resultCounts),
        payload.notes
      ].map(csvEscape).join(",")
    ].join("\n");
  }
  if (format === "prisma") {
    return [
      "PRISMA-style search log",
      "========================",
      "",
      `Search title: ${payload.title || "Untitled search"}`,
      payload.reviewQuestion ? `Review question: ${payload.reviewQuestion}` : "",
      `Search date: ${payload.searchedAt}`,
      `Databases searched: ${payload.sourceLabels || "Not specified"}`,
      `Limits: ${payload.filters.yearFrom || "*"}-${payload.filters.yearTo || "*"}${payload.filters.openAccessOnly ? "; open access only" : ""}`,
      "",
      "Search strategy",
      "---------------",
      payload.query,
      "",
      "Results returned",
      "----------------",
      `Internal archive: ${payload.resultCounts.archive}`,
      `Live records: ${payload.resultCounts.live}`,
      `Source handoffs: ${payload.resultCounts.handoffs}`,
      payload.notes ? `Notes: ${payload.notes}` : ""
    ].filter(Boolean).join("\n");
  }
  if (format === "database") {
    return [
      `# Database search strategy: ${payload.title || "Untitled search"}`,
      `# Search date: ${payload.searchedAt}`,
      `# Databases: ${payload.sourceLabels || "Not specified"}`,
      "",
      payload.query,
      "",
      `Limits: ${payload.filters.yearFrom || "*"}-${payload.filters.yearTo || "*"}${payload.filters.openAccessOnly ? "; open access only" : ""}`,
      payload.notes ? `Notes: ${payload.notes}` : ""
    ].filter(Boolean).join("\n");
  }
  return [
    payload.title || "Advanced Library search",
    "",
    "Search string:",
    payload.query,
    "",
    `Date searched: ${payload.searchedAt}`,
    `Sources: ${payload.sourceLabels || "Not specified"}`,
    `Filters: years ${payload.filters.yearFrom || "*"}-${payload.filters.yearTo || "*"}${payload.filters.openAccessOnly ? "; open access only" : ""}`,
    payload.notes ? `Notes: ${payload.notes}` : ""
  ].filter(Boolean).join("\n");
}

function renderAdvancedSearchPanel() {
  ensureLibraryMemberAuth();

  if (memberWorkspaceState.status === "loading" && memberWorkspaceState.authenticated !== true) {
    return `<section class="library-advanced-search library-advanced-search--locked" aria-label="Advanced Library search">
      <button id="advancedSearchLocked" type="button" class="library-advanced-toggle library-advanced-toggle--locked" aria-busy="true">
        Advanced search
      </button>
      <p class="library-advanced-locked-note">Checking sign-in…</p>
    </section>`;
  }

  if (!canUseAdvancedSearch()) {
    if (advancedSearchOpen) advancedSearchOpen = false;
    return `<section class="library-advanced-search library-advanced-search--locked" aria-label="Advanced Library search">
      <button id="advancedSearchLocked" type="button" class="library-advanced-toggle library-advanced-toggle--locked" aria-describedby="advancedSearchLockedNote">
        Advanced search
      </button>
      <p id="advancedSearchLockedNote" class="library-advanced-locked-note">Sign in to build systematic and scoping review search strategies.</p>
    </section>`;
  }

  const query = buildAdvancedSearchQuery();
  const sourceButtons = ADVANCED_SEARCH_SOURCES.map(([id, label]) => {
    const active = advancedSearchState.sources.includes(id);
    return `<button type="button" class="library-advanced-source${active ? " is-active" : ""}" data-advanced-source="${escapeHtml(id)}" aria-pressed="${active ? "true" : "false"}">${escapeHtml(label)}</button>`;
  }).join("");
  const conceptBlocks = advancedSearchState.concepts.map((concept, index) => {
    const canRemove = advancedSearchState.concepts.length > ADVANCED_SEARCH_MIN_CONCEPTS;
    return `
    <section class="library-advanced-concept" data-advanced-concept="${index}">
      <header>
        <div>
          <strong>${escapeHtml(concept.label)}</strong>
          <small>OR within concept</small>
        </div>
        <div class="library-advanced-concept-actions">
          <span>${index + 1}</span>
          ${canRemove ? `<button type="button" class="library-advanced-remove-concept" data-advanced-remove-concept="${index}" aria-label="Remove ${escapeHtml(concept.label)}">Remove</button>` : ""}
        </div>
      </header>
      <div class="library-advanced-field-grid">
        <label class="library-advanced-field-main">
          <span>Main term</span>
          <input data-advanced-field="mainTerm" value="${escapeHtml(concept.mainTerm)}" placeholder="e.g. climate change" />
        </label>
        <label>
          <span>Exact phrases</span>
          <textarea data-advanced-field="exactPhrases" rows="1" placeholder="emergency communication">${escapeHtml(concept.exactPhrases)}</textarea>
        </label>
        <label>
          <span>Synonyms</span>
          <textarea data-advanced-field="synonyms" rows="1" placeholder="heatwave, extreme heat">${escapeHtml(concept.synonyms)}</textarea>
        </label>
        <label>
          <span>Exclude</span>
          <textarea data-advanced-field="excludeTerms" rows="1" placeholder="terms to exclude">${escapeHtml(concept.excludeTerms)}</textarea>
        </label>
      </div>
    </section>
  `;
  }).join("");
  const canAddConcept = advancedSearchState.concepts.length < ADVANCED_SEARCH_MAX_CONCEPTS;

  return `<section class="library-advanced-search" aria-label="Advanced Library search">
    <button id="advancedSearchToggle" class="library-advanced-toggle" type="button" aria-expanded="${advancedSearchOpen ? "true" : "false"}" aria-controls="advancedSearchPanel">
      Advanced search
      <span aria-hidden="true">${advancedSearchOpen ? "−" : "+"}</span>
    </button>
    ${advancedSearchOpen ? `
      <div id="advancedSearchPanel" class="library-advanced-panel">
        <div class="library-advanced-header">
          <div>
            <p>Systematic and scoping review builder</p>
            <h2>Build a structured search string</h2>
          </div>
          <button id="advancedSearchClose" type="button">Close</button>
        </div>
        <div class="library-advanced-meta library-advanced-compact-meta">
          <label>
            <span>Search title</span>
            <input id="advancedSearchTitle" value="${escapeHtml(advancedSearchState.title)}" />
          </label>
          <label>
            <span>Review question</span>
            <input id="advancedReviewQuestion" value="${escapeHtml(advancedSearchState.reviewQuestion)}" placeholder="Optional" />
          </label>
        </div>
        <div class="library-advanced-grid">
          <div class="library-advanced-concepts-wrap">
            <div class="library-advanced-concepts-toolbar">
              <span>Concept blocks are combined with AND. Terms within each block use OR.</span>
              ${canAddConcept ? `<button id="advancedAddConcept" type="button" class="library-advanced-add-concept">Add concept</button>` : `<span class="library-advanced-concept-limit">Up to ${ADVANCED_SEARCH_MAX_CONCEPTS} concepts</span>`}
            </div>
            <div class="library-advanced-concepts">
              ${conceptBlocks}
            </div>
          </div>
          <aside class="library-advanced-side">
            <div class="library-advanced-preview">
              <div class="library-advanced-section-title">Generated Boolean string</div>
              <pre id="advancedSearchPreview">${escapeHtml(query || "Add concept terms to preview the generated search string.")}</pre>
            </div>
            <div class="library-advanced-filters">
              <div class="library-advanced-section-title">Filters</div>
              <div class="library-advanced-filter-grid">
                <label>
                  <span>Year from</span>
                  <input id="advancedYearFrom" type="number" min="1400" max="2100" value="${escapeHtml(advancedSearchState.filters.yearFrom)}" />
                </label>
                <label>
                  <span>Year to</span>
                  <input id="advancedYearTo" type="number" min="1400" max="2100" value="${escapeHtml(advancedSearchState.filters.yearTo)}" />
                </label>
              </div>
              <label class="library-advanced-check">
                <input id="advancedOpenAccess" type="checkbox" ${advancedSearchState.filters.openAccessOnly ? "checked" : ""} />
                <span>Open access only</span>
              </label>
              <label class="library-advanced-check">
                <input id="advancedDecolonialMode" type="checkbox" ${advancedSearchState.filters.decolonialMode ? "checked" : ""} />
                <span>Decolonial mode (boost Africa, Indigenous, diaspora, oral history)</span>
              </label>
            </div>
            <div class="library-advanced-sources">
              <div class="library-advanced-section-title">Sources / databases</div>
              <div class="library-advanced-source-list">${sourceButtons}</div>
            </div>
            <label class="library-advanced-notes">
              <span>Notes</span>
              <textarea id="advancedSearchNotes" rows="3" placeholder="Search limits, inclusion notes, database-specific caveats">${escapeHtml(advancedSearchState.notes)}</textarea>
            </label>
          </aside>
        </div>
        <div class="library-advanced-actions">
          <button id="advancedRunSearch" class="library-advanced-primary" type="button">Run search</button>
          <button id="advancedSaveSearch" type="button">Save search</button>
          <label>
            <span class="sr-only">Export format</span>
            <select id="advancedExportFormat">
              <option value="plain">Plain text</option>
              <option value="database">Database strategy</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="prisma">PRISMA log</option>
            </select>
          </label>
          <button id="advancedExportSearch" type="button">Export string</button>
          <button id="advancedAddToReview" type="button">Add to review</button>
        </div>
        <p id="advancedSearchMessage" class="library-advanced-message" role="status">${escapeHtml(advancedSearchState.message || "")}</p>
      </div>
    ` : ""}
  </section>`;
}

function getEffectiveSearchQuery(){ const filterParts = Object.values(metadataFilters).flat().map(value => (value || '').trim()).filter(Boolean); const parts = [libraryQuery, ...filterParts].map(value => (value || '').trim()).filter(Boolean); return uniqueValues(parts).join(' '); }
function refreshBlendedDiscovery(forceLive = false) {
  const effectiveQuery = getEffectiveSearchQuery();
  externalDiscovery = effectiveQuery ? buildExternalDiscovery(effectiveQuery) : [];
  if (!sourceMode || !effectiveQuery) {
    if (!effectiveQuery) {
      liveResults = [];
      openAccessNotices = null;
      liveStatus = { state: "idle", message: "", sources: [] };
    }
    return Promise.resolve([]);
  }
  const hasLiveSections = DISCOVERY_SECTION_ORDER.some(
    (id) => (discoverySections[id]?.displayedCount || 0) > 0,
  );
  if (forceLive || !hasLiveSections || liveResults.length === 0) {
    return maybeFetchLiveResults(effectiveQuery);
  }
  return Promise.resolve(liveResults);
}
function renderOpenAccessNoticeStrip() {
  if (!openAccessNotices) return "";
  const ext = openAccessNotices.externalRights;
  const dm = openAccessNotices.doabMetadata;
  if (!ext && !dm) return "";
  const parts = [];
  if (ext) parts.push(`<p class="external-source-notice__p">${escapeHtml(ext)}</p>`);
  if (dm) parts.push(`<p class="external-source-notice__p external-source-notice__p--doab">${escapeHtml(dm)}</p>`);
  return `<div class="external-source-notice" role="note">${parts.join("")}</div>`;
}

function isOpenAccessDiscoveryRecord(item) {
  if (!item || typeof item !== "object") return false;
  const src = String(item.source || item.institution || item.sourceName || "").toLowerCase();
  const coll = String(item.collection || "").toLowerCase();
  const st = String(item.sourceType || "").toLowerCase();
  if (item.liveSourceHint === "openAccessPack") return true;
  if (st === "open_access" || st === "open_access_books" || st === "open_textbook" || st === "oer") return true;
  if (coll.includes("open access books") || coll.includes("oer")) return true;
  const needles = ["doab", "openstax", "project gutenberg", "open textbook library", "libretexts", "pressbooks", "jstor open access"];
  if (needles.some((n) => src.includes(n))) return true;
  return false;
}

function dedupeLibraryStreamItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key =
      item.id ||
      item.recordIdentifier ||
      item.sourceUrl ||
      (item.title && item.source ? `${item.title}::${item.source}` : "") ||
      (item.title ? String(item.title) : "");
    if (!String(key || "").trim()) return true;
    const clean = String(key).toLowerCase().trim();
    if (seen.has(clean)) return false;
    seen.add(clean);
    return true;
  });
}

function weaveLibraryStreamResults(groups) {
  const q = getEffectiveSearchQuery() || libraryQuery || "";
  const pools = groups.map((group) =>
    [...(group.items || [])].sort(
      (a, b) => scoreBlendedResult(b, q) - scoreBlendedResult(a, q)
    )
  );
  const pattern = groups.flatMap((group, groupIndex) =>
    Array.from({ length: Math.max(1, Number(group.weight) || 0) }, () => groupIndex)
  );
  const output = [];
  let safety = 0;
  while (pools.some((pool) => pool.length) && safety < 10000) {
    for (const index of pattern) {
      const item = pools[index]?.shift();
      if (item) output.push(item);
    }
    safety++;
  }
  return dedupeLibraryStreamItems(output);
}

/** Slug for `data-source` on unified search cards (matches CSS accent tokens). */
function libraryCardSourceSlug(record) {
  const hint = String(record.liveSourceHint || "").toLowerCase();
  const src = String(
    [record.source, record.sourceName, record.institution, record.collection, record.sourceType]
      .filter(Boolean)
      .join(" "),
  ).toLowerCase();

  if (hint === "openalex" || record.unifiedSourceKey === "openalex") return "openalex";
  if (hint === "core" || record.unifiedSourceKey === "core") return "core";
  if (hint === "crossref" || record.unifiedSourceKey === "crossref") return "crossref";
  if (hint === "semantic-scholar" || record.unifiedSourceKey === "semantic-scholar") return "semantic-scholar";
  if (hint === "wikidata" || record.unifiedSourceKey === "wikidata") return "wikidata";
  if (hint === "wikimedia") return "catalogue-wikimedia";
  if (hint === "openlibrary") return "internet-archive";
  if (hint === "library-of-congress") return "library-of-congress";
  if (hint === "smithsonian") return "smithsonian";
  if (hint === "loc") return "catalogue-loc";
  if (hint === "met") return "catalogue-met";
  if (hint === "trove" || src.includes("trove")) return "trove";
  if (hint.includes("semantic") || src.includes("semantic scholar")) return "semantic-scholar";

  if (src.includes("wikidata")) return "wikidata";

  if (
    record.unifiedSourceKey === "openaccess" ||
    record.liveSourceHint === "openAccessPack" ||
    isOpenAccessDiscoveryRecord(record)
  ) {
    if (src.includes("doaj")) return "doaj";
    if (src.includes("europe pmc") || src.includes("europepmc")) return "europe-pmc";
    if (src.includes("internet archive") || src.includes("archive.org")) return "internet-archive";
    return "openaccess";
  }

  if (record.unifiedSourceKey === "handoff" || getResultMode(record) === "external_handoff") {
    return "handoff";
  }

  const mode = getResultMode(record);
  if (mode === "local" || mode === "hybrid" || record.unifiedSourceKey === "archive") return "archive";

  if (record.unifiedSourceKey && record.unifiedSourceKey !== "external") {
    return String(record.unifiedSourceKey).replace(/_/g, "-");
  }

  return "external";
}

function libraryStreamOriginLabel(record) {
  if (record.unifiedSourceLabel) return record.unifiedSourceLabel;
  const mode = getResultMode(record);
  const hint = String(record.liveSourceHint || "").toLowerCase();
  if (hint === "openalex") return "OpenAlex";
  if (hint === "core") return "CORE";
  if (hint === "crossref") return "Crossref";
  if (hint === "semantic-scholar") return "Semantic Scholar";
  if (hint === "wikidata") return "Wikidata";
  if (hint === "library-of-congress") return "Library of Congress";
  if (hint === "smithsonian") return "Smithsonian";
  if (hint === "wikimedia") return "Wikimedia Commons";
  if (hint === "openlibrary") return "Open Library";
  if (hint === "met") return "The Met";
  const text = [
    record.liveSourceHint,
    record.sourceType,
    record.sourceCategoryGroup,
    record.collection,
    record.source,
    record.institution,
    record.cat,
    record.rightsStatus
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("public domain")) return "Public Domain";
  if (record.liveSourceHint === "openAccessPack" || isOpenAccessDiscoveryRecord(record)) {
    return "Open Access";
  }
  if (mode === "external_handoff") return "Source Handoff";
  if (mode === "live") return getUnifiedSourceLabel(getUnifiedSourceKey(record));
  return "Archive";
}

function libraryStreamOriginClass(record) {
  const slug = libraryCardSourceSlug(record);
  return `is-source-${slug}`;
}

function renderLibraryResultsSection({ className, eyebrow, title, description, countLabel, bodyHtml, loadMoreHtml = "" }) {
  if (!bodyHtml) return "";
  return `<section class="library-results-section ${className}">
    <header class="library-results-section-header">
      <div>
        <p class="library-results-eyebrow">${escapeHtml(eyebrow)}</p>
        <h2>${escapeHtml(title)}</h2>
        ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      </div>
      <span class="library-results-count">${escapeHtml(countLabel)}</span>
    </header>
    ${bodyHtml}
    ${loadMoreHtml}
  </section>`;
}

function isAnyDiscoverySectionLoadingMore() {
  return DISCOVERY_SECTION_ORDER.some((id) => discoverySections[id]?.loadingMore);
}

function formatDiscoverySectionCountLabel(sectionId, section, shown) {
  const meta = DISCOVERY_SECTION_LABELS[sectionId];
  if (section.count != null && section.count > shown) {
    return `Showing ${shown} of ${Number(section.count).toLocaleString()} results`;
  }
  if (section.count != null) {
    return `${shown} of ${Number(section.count).toLocaleString()} results`;
  }
  if (meta?.preview && shown > 0) {
    return `Preview: ${shown} results (more available at source)`;
  }
  return `${shown} result${shown === 1 ? "" : "s"}`;
}

function canLoadMoreDiscoverySection(sectionId) {
  if (sectionId === "previews") return canLoadMorePreviewsSection();
  if (sectionId === "openAccess") return canLoadMoreOpenAccessReleased();
  const section = discoverySections[sectionId];
  const meta = DISCOVERY_SECTION_LABELS[sectionId];
  if (!sourceMode || !section || !meta?.loadMore) return false;
  if (section.state === "error") return false;
  const shown = filterDisplayedRecords(section.results).filter((item) => getResultMode(item) === "live").length;
  if (!shown && section.state !== "loading") return false;
  if (section.nextCursor) return true;
  if (section.nextOffset != null) {
    if (section.count != null) return shown < section.count;
    return true;
  }
  return false;
}

/** Per-source blocks (used only inside advanced load-more drawer). */
function renderDiscoverySourceSections() {
  const renderOrder = ["openalex", "core", "crossref", "semantic-scholar", "wikidata", "library-of-congress", "smithsonian", "openAccess", "previews"];
  return renderOrder
    .map((sectionId) => {
      const section = discoverySections[sectionId];
      const meta = DISCOVERY_SECTION_LABELS[sectionId];
      if (!section) return "";
      const cards = filterDisplayedRecords(section.results).filter((item) => getResultMode(item) === "live");
      if (!cards.length && section.state !== "loading" && !section.error) return "";

      const shown = cards.length;
      const countLabel = formatDiscoverySectionCountLabel(sectionId, section, shown);
      const loadMoreHtml = canLoadMoreDiscoverySection(sectionId)
        ? `<div class="load-more-wrap"><button type="button" class="library-results-load-more load-more-btn" data-discovery-load-more="${sectionId}">${section.loadingMore ? "Loading…" : meta.loadMore}</button></div>`
        : "";
      const errorHtml = section.error
        ? `<p class="library-results-error" role="status">${escapeHtml(section.error)}</p>`
        : "";
      const loadingHtml =
        section.state === "loading" && !shown
          ? `<p class="library-results-loading" role="status">Loading ${escapeHtml(meta.title.toLowerCase())}…</p>`
          : "";

      return renderLibraryResultsSection({
        className: `library-results-discovery library-results-${sectionId}`,
        eyebrow: "External discovery",
        title: meta.title,
        description: meta.preview
          ? "Browser preview from a public API — use Load more on scholarly sections for full pagination."
          : "Scholarly and open metadata from this source.",
        countLabel,
        bodyHtml: `${errorHtml}${loadingHtml}${cards.length ? `<div class="library-results-grid card-grid results-grid">${cards.map(renderCard).join("")}</div>` : ""}`,
        loadMoreHtml,
      });
    })
    .filter(Boolean)
    .join("");
}

function renderUnifiedSortControls() {
  const activeLabel =
    UNIFIED_SORT_OPTIONS.find((option) => option.id === unifiedStreamSort)?.label || "Relevance";
  const sortHint =
    unifiedStreamSort === "relevance"
      ? "Sorted by relevance"
      : `Sorted by ${activeLabel.toLowerCase()}`;

  return `<div class="library-unified-sortbar">
    <span class="library-unified-sort-label">${escapeHtml(sortHint)}</span>
    <label class="library-unified-sort-control">
      <span class="library-unified-sort-sr">Sort results</span>
      <select id="unifiedSortSelect" data-unified-sort aria-label="Sort results">
        ${UNIFIED_SORT_OPTIONS.map(
          (option) =>
            `<option value="${option.id}"${unifiedStreamSort === option.id ? " selected" : ""}>${escapeHtml(option.label)}</option>`,
        ).join("")}
      </select>
    </label>
  </div>`;
}

function renderUnifiedSourceFilters() {
  return `<div class="library-unified-filters" role="toolbar" aria-label="Filter results by source">${UNIFIED_SOURCE_FILTERS.map(
    (filter) =>
      `<button type="button" class="library-unified-filter${unifiedStreamFilter === filter.id ? " is-active" : ""}" data-unified-filter="${filter.id}">${escapeHtml(filter.label)}</button>`,
  ).join("")}</div>`;
}

function renderUnifiedResultsGrid(records) {
  let dividerShown = false;
  return records
    .map((record) => {
      let html = "";
      if (!dividerShown && getResultRankGroup(record) === 1) {
        html += `<div class="library-unified-handoff-divider" role="separator"><span>Related archive platforms and collection handoffs</span></div>`;
        dividerShown = true;
      }
      html += renderCard(record);
      return html;
    })
    .join("");
}

function renderUnifiedSearchStream(effectiveQuery) {
  const rankedAll = filterDisplayedRecords(
    mergeAndRankSearchResults({
      query: effectiveQuery || libraryQuery,
      internalResults: getInternalResultsForMerge(),
      includeHandoffs: sourceMode,
    }),
  );
  const filtered = rankedAll.filter((record) => matchesUnifiedStreamFilter(record, unifiedStreamFilter));
  const visible = filtered.slice(0, unifiedStreamVisibleCount);
  const estimatedTotal = estimateUnifiedTotalCount(rankedAll);
  const sourceNames = getUnifiedSourceNames(rankedAll);
  const canLoadMore = canLoadMoreUnifiedStream(filtered);
  const streamExhausted = isUnifiedStreamExhausted(filtered);
  const hasBufferedMore = unifiedStreamVisibleCount < filtered.length;
  const summaryCount =
    estimatedTotal > filtered.length
      ? `Showing ${visible.length} of ${filtered.length.toLocaleString()} loaded (${estimatedTotal.toLocaleString()} reported across sources)`
      : `Showing ${visible.length} of ${filtered.length.toLocaleString()} results`;
  const sourceSummary =
    sourceNames.length > 1
      ? ` across ${sourceNames.join(", ")}`
      : sourceNames.length === 1
        ? ` from ${sourceNames[0]}`
        : "";

  const statusLine = sourceMode ? getDiscoverySourcesStatusLine() : "Archive search";
  const openAccessStrip = sourceMode && effectiveQuery ? renderOpenAccessNoticeStrip() : "";
  const loadingHint =
    liveStatus.state === "loading"
      ? `<p class="library-unified-loading" role="status">Searching external sources…</p>`
      : "";

  const loadMoreLabel = unifiedStreamLoadingMore
    ? "Loading…"
    : hasBufferedMore
      ? "Show more results"
      : "Load more results";

  const endMessage = streamExhausted
    ? `<p class="library-unified-end" role="status">You’ve reached the end of available results.</p>`
    : "";

  const loadMoreBlock = canLoadMore
    ? `<div class="load-more-wrap library-unified-load-more">
        <button type="button" id="loadMoreUnifiedBtn" class="library-results-load-more load-more-btn"${unifiedStreamLoadingMore ? " disabled" : ""}>${escapeHtml(loadMoreLabel)}</button>
      </div>`
    : streamExhausted
      ? `<div class="load-more-wrap library-unified-load-more">${endMessage}</div>`
      : "";

  return renderLibraryResultsSection({
    className: "library-results-unified",
    eyebrow: "Search results",
    title: effectiveQuery ? `Results for “${effectiveQuery}”` : "Archive search",
    description: "",
    countLabel: `${visible.length} shown`,
    bodyHtml: `${openAccessStrip}<p class="library-unified-summary">${escapeHtml(summaryCount)}${escapeHtml(sourceSummary)}.</p><p class="library-unified-status">${escapeHtml(statusLine)}</p>${renderUnifiedSortControls()}${renderUnifiedSourceFilters()}${renderBeyondDataSelectionBar()}${loadingHint}${
      visible.length
        ? `<div class="library-results-grid card-grid results-grid library-unified-grid">${renderUnifiedResultsGrid(visible)}</div>`
        : `<div class="empty library-empty" role="status"><p>No results match this filter yet. Try another source tab or broaden your search.</p></div>`
    }`,
    loadMoreHtml: loadMoreBlock,
  });
}

function renderLibraryLoader(){
  const shouldShow = currentPage === 'library' && (
    liveStatus.state === 'loading' ||
    isAnyDiscoverySectionLoadingMore() ||
    unifiedStreamLoadingMore
  );

  if (!shouldShow) return '';

  const label = isAnyDiscoverySectionLoadingMore() || unifiedStreamLoadingMore
    ? 'Loading more results…'
    : 'Loading library results…';

  return `<div class="library-loader" role="status" aria-live="polite" aria-busy="true">
    <div class="library-loader-bar"><span></span></div>
    <div class="library-loader-text">${escapeHtml(label)}</div>
  </div>`;
}

function renderFilterSection(label, content, options = {}) {
  const {accordion = false, open = false} = options;
  if (accordion) {
    return `<details class="filter-accordion" ${open ? "open" : ""}><summary>${escapeHtml(label)}</summary><div class="filter-accordion-panel">${content}</div></details>`;
  }
  return `<div class="sidebar-section"><div class="sidebar-label">${escapeHtml(label)}</div>${content}</div>`;
}

function renderMetadataFilterGroup(group, records, options = {}) {
  const selected = new Set(metadataFilters[group.key] || []);
  const facetOptions = group.dynamic
    ? buildFacetOptions(records, record => getRecordFacetValues(record, group.key), 18).map(option => option.value)
    : group.options;
  if (!facetOptions.length) return "";
  const content = facetOptions.map(option => `<label class="filter-opt"><input type="checkbox" data-filter-key="${escapeHtml(group.key)}" value="${escapeHtml(option)}" ${selected.has(option) ? 'checked' : ''}/><span>${escapeHtml(option)}</span></label>`).join('');
  return renderFilterSection(group.label, content, options);
}

function renderQuickFilters(options = {}) {
  const items = [
    ["openAccess","Show only open access"],
    ["verified","Show only verified records"],
    ["hideSensitive","Hide culturally sensitive records"],
    ["metadataOnly","Show metadata-only records"],
    ["needsReview","Show records needing review"]
  ];
  const content = items.map(([key, label]) => `<label class="filter-opt"><input type="checkbox" data-quick-filter="${escapeHtml(key)}" ${quickFilters[key] ? 'checked' : ''}/><span>${escapeHtml(label)}</span></label>`).join('');
  return renderFilterSection(options.accordion ? "Quick Filters" : "Quick filters", content, options);
}

function renderMobileFilterDrawer(totalResults, activeFilterCount) {
  if (!mobileFiltersOpen) return "";
  const resultLabel = `${totalResults.toLocaleString()} result${totalResults === 1 ? "" : "s"}`;
  const groups = [
    renderQuickFilters({accordion:true, open:true}),
    ...METADATA_FILTER_GROUPS.map(group => renderMetadataFilterGroup(group, RECORDS, {
      accordion:true,
      open: group.key === "sourceOrigin"
    }))
  ].join("");
  return `<button class="mobile-filter-backdrop" id="mobileFilterBackdrop" type="button" aria-label="Close filters"></button><section class="mobile-filter-drawer" id="mobileFilterDrawer" role="dialog" aria-modal="true" aria-labelledby="mobileFilterTitle"><header class="mobile-filter-header"><div><p class="mobile-filter-kicker">${activeFilterCount ? `${activeFilterCount} active` : "Refine results"}</p><h2 id="mobileFilterTitle">Filters</h2></div><div class="mobile-filter-header-actions">${activeFilterCount ? `<button id="mobileFilterClearDrawer" class="mobile-filter-clear-all" type="button">Clear all</button>` : ""}<button id="mobileFilterClose" class="mobile-filter-close" type="button" aria-label="Close filters">&times;</button></div></header><div class="mobile-filter-body">${groups}</div><footer class="mobile-filter-footer"><button id="mobileFilterApply" class="mobile-filter-apply" type="button">Show ${escapeHtml(resultLabel)}</button></footer></section>`;
}

function renderLibrary() {
  const effectiveQuery = getEffectiveSearchQuery();
  const rankedAll = mergeAndRankSearchResults({
    query: effectiveQuery || libraryQuery,
    internalResults: getInternalResultsForMerge(),
    includeHandoffs: sourceMode,
  });
  const filteredCount = rankedAll.filter((record) =>
    matchesUnifiedStreamFilter(record, unifiedStreamFilter),
  ).length;
  const totalGroupedResults = Math.min(unifiedStreamVisibleCount, filteredCount) || rankedAll.length;

  const relatedSearches = getRelatedSearchSuggestions(effectiveQuery || libraryQuery, 18);
  const collectionSuggestions = getCollectionSuggestions(effectiveQuery || libraryQuery, 8);
  const topKnowledgeAreas = getFeaturedThemes(12);
  const topSources = SOURCES.filter(source => source.access === "search").slice(0, 6);
  const hasFilter = hasAnyMetadataFilter() || libraryQuery;
  const activeFilterCount = getActiveFilterCount();

  const qEsc = effectiveQuery ? escapeHtml(effectiveQuery) : "";

  const emptyGuide = `<div class="empty empty-guide library-empty search-empty" role="status"><h3>No matching records yet</h3><p>Try a broader search, clear filters, or explore these discovery paths.</p>${relatedSearches.length ? `<div class="empty-guide-block"><div class="empty-guide-title">Related searches</div>${renderRelatedSearchTags(relatedSearches.slice(0, 8))}</div>` : ""}${topKnowledgeAreas.length ? `<div class="empty-guide-block"><div class="empty-guide-title">Top knowledge areas</div>${renderRelatedSearchTags(topKnowledgeAreas.slice(0, 10))}</div>` : ""}${collectionSuggestions.length ? `<div class="empty-guide-block"><div class="empty-guide-title">Curated collection pathways</div><div class="coll-grid">${collectionSuggestions.slice(0, 4).map(renderCollectionCard).join("")}</div></div>` : ""}${topSources.length ? `<div class="empty-guide-block"><div class="empty-guide-title">Source pathways</div><div class="source-grid">${topSources.map(source => renderSourceCard(source)).join("")}</div></div>` : ""}</div>`;

  const unifiedSection =
    rankedAll.length > 0 || liveStatus.state === "loading" || (sourceMode && effectiveQuery)
      ? renderUnifiedSearchStream(effectiveQuery)
      : "";

  const relatedSection = renderLibraryResultsSection({
    className: "library-results-related",
    eyebrow: "Related searches",
    title: "Related searches",
    countLabel: `${relatedSearches.length} discovery route${relatedSearches.length !== 1 ? "s" : ""}`,
    bodyHtml: relatedSearches.length ? renderRelatedSearchTags(relatedSearches) : ""
  });

  const collectionsSection = renderLibraryResultsSection({
    className: "library-results-collections",
    eyebrow: "Collection matches",
    title: "Collection matches",
    countLabel: `${collectionSuggestions.length} collection match${collectionSuggestions.length !== 1 ? "es" : ""}`,
    bodyHtml: collectionSuggestions.length ? `<div class="coll-grid">${collectionSuggestions.map(renderCollectionCard).join("")}</div>` : ""
  });

  const groupedResults = [unifiedSection, relatedSection, collectionsSection].filter(Boolean).join("");
  const resultsBody = totalGroupedResults > 0 || groupedResults ? groupedResults : emptyGuide;

  return `<div class="page active"><div class="library-layout"><aside class="sidebar">${hasFilter ? `<button class="clear-btn" id="clearBtn" type="button">Clear all filters</button>` : ""}${renderQuickFilters()}${METADATA_FILTER_GROUPS.map(group => renderMetadataFilterGroup(group, RECORDS)).join("")}</aside><div class="main-results library-blended-discovery"><div class="search-bar"><input type="text" id="mainSearch" aria-label="Search archive records and metadata" value="${escapeHtml(libraryQuery)}" placeholder="Search metadata, provenance, rights, source, and cultural protocol fields…" autocomplete="off"/><button id="localSearchBtn" type="button">Search</button><button class="secondary ${sourceMode ? "live-on" : "live-off"}" id="sourceSearchBtn" type="button">${sourceMode ? "External sources on" : "External sources off"}</button></div>${renderAdvancedSearchPanel()}${renderSearchSuggestions()}${renderRecentSearches("library")}${renderSearchSaveAction(effectiveQuery)}<div class="mobile-filter-bar"><button id="mobileFilterToggle" class="mobile-filter-btn ${mobileFiltersOpen ? "active" : ""}" type="button" aria-expanded="${mobileFiltersOpen ? "true" : "false"}" aria-controls="mobileFilterDrawer">Filters${activeFilterCount ? ` (${activeFilterCount})` : ""}</button>${activeFilterCount ? `<button id="mobileClearFilters" class="mobile-clear-btn" type="button">Clear</button>` : ""}</div>${renderMobileFilterDrawer(totalGroupedResults, activeFilterCount)}${renderLibraryLoader()}${renderLiveStatus()}<div class="results-stack library-results-stack" aria-label="${totalGroupedResults} search result${totalGroupedResults !== 1 ? "s" : ""}${effectiveQuery ? ` for “${qEsc}”` : ""}">${resultsBody}</div></div></div></div>`;
}

function applyLibraryQuery(value, clearSources = true) {
  const nextQuery = value.trim();
  const queryChanged = nextQuery !== libraryQuery;
  console.log("[APPLY QUERY]", { value: nextQuery, clearSources, queryChanged, beforeLiveResults: liveResults.length });

  // Log search event to admin analytics (fire-and-forget)
  if (nextQuery && queryChanged && typeof window.__logArchiveEvent === 'function') {
    window.__logArchiveEvent({
      eventType: 'search_submitted',
      area: 'library',
      query: nextQuery,
      sourceScope: sourceMode ? 'all_sources' : 'archive',
    });
  }

  libraryQuery = nextQuery;
  localResults = searchLocalRecords(getEffectiveSearchQuery() || libraryQuery);
  refreshArchiveSearchPool();
  if (queryChanged) {
    archiveLoadedCount = Math.min(DISCOVERY_PAGE_SIZE, archiveSearchPool.length);
  } else {
    archiveLoadedCount = Math.min(archiveLoadedCount, archiveSearchPool.length);
  }
  if (clearSources && queryChanged) {
    liveResults = [];
    openAccessNotices = null;
    externalDiscovery = [];
    LIVE_RESULT_CACHE.clear();
    resetDiscoverySections();
    resetUnifiedStreamUi();
    liveStatus = {
      state: "idle",
      message: getEffectiveSearchQuery()
        ? "Archive results loaded. External source discovery is available."
        : "",
      sources: [],
    };
  }
  refreshBlendedDiscovery(true);
}

function applyArchiveGuideSuggestedSearch(detail = {}) {
  const query = String(detail.suggestedQuery || detail.query || "").trim();
  if (!query) return;
  const originalQuery = String(detail.originalQuery || libraryQuery || "").trim();
  const suggestionType = String(detail.suggestionType || "broader");
  const mode = String(detail.mode || "");
  try {
    trackLibraryActivity("archive_guide_suggested_search_clicked", {
      query,
      sourceScope: sourceMode ? "all_sources" : "archive",
      metadata: {
        original_query: originalQuery,
        suggested_query: query,
        suggestion_type: suggestionType,
        area: "library",
        mode,
      },
    });
  } catch (error) {
    console.warn("Archive Guide search analytics skipped.", error);
  }
  pushRecentSearch(query);
  currentPage = "library";
  selectedRecordId = null;
  clearMetadataFilters();
  searchSuggestions = [];
  activeSuggestionIndex = -1;
  applyLibraryQuery(query, true);
  const nextUrl = `/library?q=${encodeURIComponent(query)}`;
  if (window.location.pathname + window.location.search !== nextUrl) {
    window.history.pushState({ archiveRoute: true, page: "library" }, "", nextUrl);
  }
  render();
  requestAnimationFrame(() => {
    const input = document.getElementById("mainSearch");
    if (input) {
      input.value = query;
      input.focus({ preventScroll: true });
    }
    document.querySelector(".library-results-stack")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

window.DecolonisingArchive = {
  ...(window.DecolonisingArchive || {}),
  applyLibrarySearch: applyArchiveGuideSuggestedSearch,
};

window.addEventListener("archive-guide:suggested-search-clicked", (event) => {
  applyArchiveGuideSuggestedSearch(event.detail || {});
});

function closeMobileFilters() {
  mobileFiltersOpen = false;
  render();
}

function syncLibraryFilterBodyLock() {
  const body = document.body;
  if (!body) return;
  if (currentPage === "library" && mobileFiltersOpen) {
    body.classList.add("filters-open");
  } else {
    body.classList.remove("filters-open");
  }
  const locked =
    body.classList.contains("menu-open") ||
    body.classList.contains("filters-open") ||
    body.classList.contains("workspace-drawer-open") ||
    body.classList.contains("modal-open") ||
    body.classList.contains("drawer-open");
  const gap = window.innerWidth - document.documentElement.clientWidth;
  body.style.paddingRight = locked && gap > 0 ? `${gap}px` : "";
}

function clearMobileFilters() {
  clearMetadataFilters();
  localResults = searchLocalRecords(getEffectiveSearchQuery() || libraryQuery);
  refreshBlendedDiscovery(true);
  render();
}

function handleMobileFilterEscape(event) {
  if (event.key === "Escape" && mobileFiltersOpen) closeMobileFilters();
}

function bindCardEvents() {
  document.querySelectorAll(".card[data-id]").forEach(card => {
    const open = () => {
      const recordId = card.dataset.id;
      const record = recordId ? getRecordByIdAny(recordId) : null;
      console.log('[CARD CLICK]', {
        recordId,
        mode: card.dataset.mode,
        hasRecord: !!record,
        sourceUrl: record?.sourceUrl || card.dataset.url || ''
      });
      if (recordId && record) {
        navigate("record", recordId);
        return;
      }

      const url = card.dataset.url;
      if (typeof url === "string" && /^https?:\/\//i.test(url.trim())) {
        openExternal(url.trim());
      }
    };

    // Selector for "interactive descendants whose events must not bubble up
    // and trigger the card-open behaviour". Native form controls are listed
    // explicitly so the guard still works if a control is missing the
    // `data-stop-card-open` marker. `label` is included because clicking a
    // <label> synthesises a click on its associated input.
    const interactiveSelector =
      'a,button,input,select,textarea,label,[contenteditable="true"],[data-stop-card-open="true"]';

    card.addEventListener("click", event => {
      if (event.target instanceof Element && event.target.closest(interactiveSelector)) return;
      open();
    });

    card.addEventListener("keydown", event => {
      // Skip when the keystroke is happening inside a nested interactive
      // control — otherwise typing Space/Enter inside the "New list title"
      // input or pressing Space on the bookmark button would navigate to the
      // record page (and eat the keystroke). The card itself has
      // role="button" + tabindex="0", so we still handle Enter/Space when
      // it is focused directly.
      if (event.target instanceof Element && event.target !== card && event.target.closest(interactiveSelector)) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function appendLiveDiscoveryBatch(nextBatch) {
  if (!Array.isArray(nextBatch) || !nextBatch.length) return 0;
  const existingIds = new Set(liveResults.map(item => item.id));
  let added = 0;
  nextBatch.forEach(item => {
    TRANSIENT_RESULTS_BY_ID.set(item.id, normalizeLiveRecord(item));
    if (!existingIds.has(item.id)) {
      liveResults.push(item);
      existingIds.add(item.id);
      added += 1;
    }
  });
  return added;
}

async function loadMoreUnifiedStream() {
  if (unifiedStreamLoadingMore) return;

  const effectiveQuery = getEffectiveSearchQuery();
  const filtered = getFilteredUnifiedRanked(effectiveQuery);

  if (unifiedStreamVisibleCount < filtered.length) {
    unifiedStreamVisibleCount += UNIFIED_STREAM_STEP;
    syncSourcePaginationStates();
    render();
    return;
  }

  unifiedStreamLoadingMore = true;
  render();
  try {
    const tasks = [];
    if (canLoadMoreArchive()) {
      tasks.push(Promise.resolve().then(() => loadMoreArchivePage()));
    }
    if (canLoadMoreOpenAccessReleased()) {
      tasks.push(Promise.resolve().then(() => loadMoreOpenAccessReleased()));
    }
    for (const sectionId of [...UNIFIED_PAGINATED_SECTION_IDS, "previews"]) {
      if (canLoadMoreDiscoverySection(sectionId)) {
        tasks.push(loadMoreDiscoverySection(sectionId, { skipRender: true }));
      }
    }
    if (tasks.length) await Promise.allSettled(tasks);
    unifiedStreamVisibleCount += UNIFIED_STREAM_STEP;
  } finally {
    unifiedStreamLoadingMore = false;
    syncSourcePaginationStates();
    render();
  }
}

async function loadMorePreviewsSection(options = {}) {
  const skipRender = Boolean(options.skipRender);
  const section = discoverySections.previews;
  if (!section || section.loadingMore || !sourceMode || !canLoadMorePreviewsSection()) return;

  const effectiveQuery = getEffectiveSearchQuery();
  if (!effectiveQuery) return;

  discoverySections.previews = { ...section, loadingMore: true };
  if (!skipRender) render();

  const pag = section.previewPagination || {};
  const tasks = PREVIEW_ADAPTER_IDS.filter((id) => pag[id]?.hasMore).map((adapterId) => {
    const adapter = LIVE_SOURCE_ADAPTERS.find((item) => item.id === adapterId);
    if (!adapter) return Promise.resolve();
    const state = pag[adapterId] || {};
    const searchOpts = { limit: DISCOVERY_PREVIEW_SIZE };
    if (adapterId === "openlibrary" || adapterId === "wikimedia") {
      searchOpts.offset = state.offset ?? 0;
    } else if (adapterId === "loc") {
      searchOpts.page = state.offset ?? state.page ?? 2;
    } else if (adapterId === "met") {
      searchOpts.idOffset = state.offset ?? state.idOffset ?? 0;
      searchOpts.metIds = section.metObjectIds || state.metIds;
    }
    return adapter
      .search(effectiveQuery, searchOpts)
      .then((value) => {
        const { items, meta } = normalizeAdapterResult(value);
        const existing = discoverySections.previews?.results || [];
        const existingIds = new Set(existing.map((item) => item.id));
        const merged = [...existing];
        items.forEach((item) => {
          TRANSIENT_RESULTS_BY_ID.set(item.id, normalizeLiveRecord(item));
          if (!existingIds.has(item.id)) {
            merged.push(item);
            existingIds.add(item.id);
          }
        });
        const nextPag = { ...(discoverySections.previews?.previewPagination || {}) };
        nextPag[adapterId] = {
          offset: meta?.nextOffset ?? null,
          page: meta?.page ?? state.page,
          idOffset: adapterId === "met" ? meta?.nextOffset ?? 0 : state.idOffset,
          metIds: meta?.metIds || state.metIds,
          hasMore: meta?.nextOffset != null,
        };
        applyDiscoverySection("previews", {
          results: merged,
          previewPagination: nextPag,
          metObjectIds: meta?.metIds || discoverySections.previews?.metObjectIds,
          state: "done",
          error: null,
        });
      })
      .catch((error) => {
        console.warn("[LIVE] preview adapter load-more failed", adapterId, error);
        const nextPag = { ...(discoverySections.previews?.previewPagination || {}) };
        nextPag[adapterId] = { ...nextPag[adapterId], hasMore: false, error: String(error?.message || error) };
        discoverySections.previews = {
          ...discoverySections.previews,
          previewPagination: nextPag,
        };
      });
  });

  try {
    await Promise.allSettled(tasks);
  } finally {
    discoverySections.previews.loadingMore = false;
    if (!skipRender) render();
  }
}

async function loadMoreDiscoverySection(sectionId, options = {}) {
  const skipRender = Boolean(options.skipRender);
  if (sectionId === "previews") return loadMorePreviewsSection(options);
  if (sectionId === "openAccess") {
    loadMoreOpenAccessReleased();
    if (!skipRender) render();
    return;
  }

  const section = discoverySections[sectionId];
  if (!section || section.loadingMore || !sourceMode) return;
  if (!canLoadMoreDiscoverySection(sectionId)) return;

  const effectiveQuery = getEffectiveSearchQuery();
  if (!effectiveQuery) return;

  const adapter = LIVE_SOURCE_ADAPTERS.find((item) => item.id === sectionId);
  if (!adapter) return;

  discoverySections[sectionId] = { ...section, loadingMore: true };
  if (!skipRender) render();

  try {
    const searchOpts = { limit: DISCOVERY_PAGE_SIZE };
    if (sectionId === "openalex") {
      searchOpts.cursor = section.nextCursor;
    } else if (sectionId === "core") {
      searchOpts.offset = section.nextOffset ?? section.results.length;
      searchOpts.limit = coreLimit;
    } else if (sectionId === "crossref" || sectionId === "wikidata" || sectionId === "semantic-scholar" || sectionId === "library-of-congress" || sectionId === "smithsonian") {
      searchOpts.offset = section.nextOffset ?? section.results.length;
    }
    if (sectionId === "library-of-congress") {
      searchOpts.decolonialMode = getDecolonialMode();
    }

    const value = await adapter.search(effectiveQuery, searchOpts);
    const { items, meta } = normalizeAdapterResult(value);
    const existingIds = new Set(section.results.map((item) => item.id));
    const merged = [...section.results];
    items.forEach((item) => {
      TRANSIENT_RESULTS_BY_ID.set(item.id, normalizeLiveRecord(item));
      if (!existingIds.has(item.id)) {
        merged.push(item);
        existingIds.add(item.id);
      }
    });

    applyDiscoverySection(sectionId, {
      results: merged,
      count: meta?.count ?? section.count,
      nextCursor: meta?.nextCursor ?? null,
      nextOffset: meta?.nextOffset ?? null,
      state: "done",
      error: null,
    });

    if (sectionId === "core" && meta?.nextOffset != null) {
      coreOffset = meta.nextOffset;
    }
  } catch (error) {
    applyDiscoverySection(sectionId, {
      state: "error",
      error: String(error && error.message ? error.message : error),
    });
  } finally {
    discoverySections[sectionId].loadingMore = false;
    if (!skipRender) render();
  }
}

function updateAdvancedPreview() {
  const preview = document.getElementById("advancedSearchPreview");
  if (preview) {
    preview.textContent = buildAdvancedSearchQuery() || "Add concept terms to preview the generated search string.";
  }
}

function syncAdvancedSearchStateFromPanel() {
  const title = document.getElementById("advancedSearchTitle");
  const question = document.getElementById("advancedReviewQuestion");
  const notes = document.getElementById("advancedSearchNotes");
  const yearFrom = document.getElementById("advancedYearFrom");
  const yearTo = document.getElementById("advancedYearTo");
  const openAccess = document.getElementById("advancedOpenAccess");
  if (title) advancedSearchState.title = title.value;
  if (question) advancedSearchState.reviewQuestion = question.value;
  if (notes) advancedSearchState.notes = notes.value;
  if (yearFrom) advancedSearchState.filters.yearFrom = yearFrom.value;
  if (yearTo) advancedSearchState.filters.yearTo = yearTo.value;
  if (openAccess) advancedSearchState.filters.openAccessOnly = Boolean(openAccess.checked);
  const decolonialMode = document.getElementById("advancedDecolonialMode");
  if (decolonialMode) advancedSearchState.filters.decolonialMode = Boolean(decolonialMode.checked);
  document.querySelectorAll("[data-advanced-concept]").forEach(block => {
    const index = Number(block.dataset.advancedConcept);
    const concept = advancedSearchState.concepts[index];
    if (!concept) return;
    block.querySelectorAll("[data-advanced-field]").forEach(field => {
      concept[field.dataset.advancedField] = field.value;
    });
  });
}

async function copyAdvancedExport(format) {
  if (!canUseAdvancedSearch()) {
    redirectToMemberSignIn();
    return;
  }
  const content = buildAdvancedSearchExport(format);
  try {
    await navigator.clipboard.writeText(content);
    advancedSearchState.message = `Copied ${format} export to clipboard.`;
  } catch (error) {
    const blob = new Blob([content], {type:"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `library-advanced-search-${format === "json" ? "json" : "txt"}.${format === "json" ? "json" : "txt"}`;
    anchor.click();
    URL.revokeObjectURL(url);
    advancedSearchState.message = `Downloaded ${format} export.`;
  }
  render();
}

function queueAdvancedSearchForReview() {
  if (!canUseAdvancedSearch()) {
    redirectToMemberSignIn();
    return;
  }
  const query = buildAdvancedSearchQuery();
  const payload = {
    id:`advanced-search-${Date.now()}`,
    title:advancedSearchState.title || "Advanced Library search",
    query,
    sources:advancedSearchState.sources,
    filters:advancedSearchState.filters,
    concepts:advancedSearchState.concepts,
    notes:advancedSearchState.notes,
    searchedAt:new Date().toISOString(),
    resultIds: mergeAndRankSearchResults({
      query: query || libraryQuery,
      internalResults: getInternalResultsForMerge(),
      includeHandoffs: sourceMode,
    }).slice(0, 250).map(record => record.id)
  };
  try {
    const existing = JSON.parse(localStorage.getItem("libraryAdvancedReviewQueue") || "[]");
    localStorage.setItem("libraryAdvancedReviewQueue", JSON.stringify([payload, ...existing].slice(0, 20)));
    advancedSearchState.message = `Queued ${payload.resultIds.length} current results for review import.`;
  } catch (error) {
    advancedSearchState.message = "Could not queue results locally.";
  }
  render();
}

function bindAdvancedSearchEvents() {
  const locked = document.getElementById("advancedSearchLocked");
  if (locked) {
    locked.addEventListener("click", () => {
      redirectToMemberSignIn();
    });
  }
  const toggle = document.getElementById("advancedSearchToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      if (!canUseAdvancedSearch()) {
        redirectToMemberSignIn();
        return;
      }
      advancedSearchOpen = !advancedSearchOpen;
      render();
    });
  }
  const close = document.getElementById("advancedSearchClose");
  if (close) {
    close.addEventListener("click", () => {
      syncAdvancedSearchStateFromPanel();
      advancedSearchOpen = false;
      render();
    });
  }
  document.querySelectorAll("[data-advanced-field], #advancedSearchTitle, #advancedReviewQuestion, #advancedSearchNotes, #advancedYearFrom, #advancedYearTo, #advancedOpenAccess").forEach(control => {
    const eventName = control.type === "checkbox" ? "change" : "input";
    control.addEventListener(eventName, () => {
      syncAdvancedSearchStateFromPanel();
      updateAdvancedPreview();
    });
  });
  document.querySelectorAll("[data-advanced-source]").forEach(button => {
    button.addEventListener("click", () => {
      syncAdvancedSearchStateFromPanel();
      const id = button.dataset.advancedSource;
      if (!id) return;
      if (advancedSearchState.sources.includes(id)) {
        advancedSearchState.sources = advancedSearchState.sources.filter(source => source !== id);
      } else {
        advancedSearchState.sources = [...advancedSearchState.sources, id];
      }
      render();
    });
  });
  const addConcept = document.getElementById("advancedAddConcept");
  if (addConcept) {
    addConcept.addEventListener("click", () => addAdvancedConcept());
  }
  document.querySelectorAll("[data-advanced-remove-concept]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.advancedRemoveConcept);
      if (Number.isFinite(index)) removeAdvancedConcept(index);
    });
  });
  const run = document.getElementById("advancedRunSearch");
  if (run) {
    run.addEventListener("click", () => {
      syncAdvancedSearchStateFromPanel();
      const query = buildAdvancedSearchQuery();
      if (!query) {
        advancedSearchState.message = "Add at least one concept term before running search.";
        render();
        return;
      }
      quickFilters.openAccess = Boolean(advancedSearchState.filters.openAccessOnly);
      sourceMode = advancedSearchState.sources.some(source => source !== "archive");
      pushRecentSearch(query);
      applyLibraryQuery(query, true);
      advancedSearchState.message = "Advanced search applied.";
      render();
      requestAnimationFrame(() => {
        const input = document.getElementById("mainSearch");
        if (input) input.value = libraryQuery;
      });
    });
  }
  const save = document.getElementById("advancedSaveSearch");
  if (save) {
    save.addEventListener("click", () => {
      if (!canUseAdvancedSearch()) {
        redirectToMemberSignIn();
        return;
      }
      syncAdvancedSearchStateFromPanel();
      const query = buildAdvancedSearchQuery();
      if (!query) {
        advancedSearchState.message = "Add a query before saving.";
        render();
        return;
      }
      postSearchWorkspaceAction({
        action:"save_search",
        query,
        label:advancedSearchState.title || query,
        filters:{
          ...getCurrentSearchFilters(),
          advanced:{
            concepts:advancedSearchState.concepts,
            filters:advancedSearchState.filters,
            sources:advancedSearchState.sources,
            reviewQuestion:advancedSearchState.reviewQuestion,
            notes:advancedSearchState.notes
          }
        }
      });
      advancedSearchState.message = "Saving advanced search…";
      render();
    });
  }
  const exportButton = document.getElementById("advancedExportSearch");
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      syncAdvancedSearchStateFromPanel();
      const format = document.getElementById("advancedExportFormat")?.value || "plain";
      copyAdvancedExport(format);
    });
  }
  const addToReview = document.getElementById("advancedAddToReview");
  if (addToReview) {
    addToReview.addEventListener("click", () => {
      syncAdvancedSearchStateFromPanel();
      queueAdvancedSearchForReview();
    });
  }
}

function bindEvents() { document.querySelectorAll('[data-page]').forEach(element => { element.addEventListener('click', event => { const page = element.dataset.page; if (!page) return; event.preventDefault(); if (element.dataset.collection) { clearMetadataFilters(); metadataFilters.curatedCollections = [element.dataset.collection]; libraryQuery = ''; localResults = searchLocalRecords(getEffectiveSearchQuery()); liveResults = []; externalDiscovery = []; liveStatus = {state:'idle', message:'', sources:[]}; refreshBlendedDiscovery(true); } navigate(page); }); }); const hamburger = document.getElementById('hamburger'); const navMobile = document.getElementById('navMobile'); if (hamburger && navMobile) hamburger.addEventListener('click', () => navMobile.classList.toggle('open')); document.querySelectorAll('.suggestion[data-q], .related-search[data-related]').forEach(element => { element.addEventListener('click', () => { applyLibraryQuery(element.dataset.q || element.dataset.related || ''); navigate('library'); }); }); const heroInput = document.getElementById('heroSearch'); const heroButton = document.getElementById('heroSearchBtn'); if (heroInput && heroButton) { const submitHero = () => { const value = heroInput.value.trim(); if (value) pushRecentSearch(value); applyLibraryQuery(value); searchSuggestions = []; activeSuggestionIndex = -1; currentPage = 'library'; selectedRecordId = null; navigate('library'); requestAnimationFrame(() => { render(); const mainSearchAfter = document.getElementById('mainSearch'); if (mainSearchAfter) mainSearchAfter.value = libraryQuery; }); };
const pickHeroSuggestion = (value) => {
  heroInput.value = value;
  libraryQuery = value;
  searchSuggestions = [];
  activeSuggestionIndex = -1;
  pushRecentSearch(value);
  applyLibraryQuery(value);
  currentPage = 'library';
  selectedRecordId = null;
  navigate('library');
  requestAnimationFrame(() => { render(); const mainSearchAfter = document.getElementById('mainSearch'); if (mainSearchAfter) mainSearchAfter.value = libraryQuery; });
};
heroButton.addEventListener('click', submitHero);
heroInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    if (activeSuggestionIndex >= 0 && searchSuggestions[activeSuggestionIndex]) {
      pickHeroSuggestion(searchSuggestions[activeSuggestionIndex].value);
      return;
    }
    submitHero();
    return;
  }
  if (event.key === 'ArrowDown' && searchSuggestions.length) {
    event.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % searchSuggestions.length;
    updateSuggestionsDOM('heroSuggestions');
    return;
  }
  if (event.key === 'ArrowUp' && searchSuggestions.length) {
    event.preventDefault();
    activeSuggestionIndex = activeSuggestionIndex <= 0 ? searchSuggestions.length - 1 : activeSuggestionIndex - 1;
    updateSuggestionsDOM('heroSuggestions');
    return;
  }
  if (event.key === 'Escape') {
    closeSuggestionsPanel('heroSuggestions');
  }
});
heroInput.addEventListener('input', () => {
  searchSuggestions = getSearchSuggestions(heroInput.value);
  activeSuggestionIndex = -1;
  updateSuggestionsDOM('heroSuggestions');
});
heroInput.addEventListener('focus', () => {
  if (heroInput.value && !searchSuggestions.length) {
    searchSuggestions = getSearchSuggestions(heroInput.value);
    activeSuggestionIndex = -1;
    updateSuggestionsDOM('heroSuggestions');
  }
});
bindSuggestionItemEvents('heroSuggestions', pickHeroSuggestion);
} const mainSearch = document.getElementById('mainSearch'); const localSearchBtn = document.getElementById('localSearchBtn'); const sourceSearchBtn = document.getElementById('sourceSearchBtn'); const mobileFilterToggle = document.getElementById('mobileFilterToggle'); const mobileClearFilters = document.getElementById('mobileClearFilters'); bindAdvancedSearchEvents(); if (mainSearch && localSearchBtn) { const submitSearch = () => { const value = mainSearch.value.trim(); searchSuggestions = []; activeSuggestionIndex = -1; if (value) pushRecentSearch(value); applyLibraryQuery(value); render(); }; localSearchBtn.addEventListener('click', submitSearch); mainSearch.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    if (activeSuggestionIndex >= 0 && searchSuggestions[activeSuggestionIndex]) {
      const chosen = searchSuggestions[activeSuggestionIndex];
      mainSearch.value = chosen.value;
      libraryQuery = chosen.value;
      searchSuggestions = [];
      activeSuggestionIndex = -1;
      pushRecentSearch(chosen.value);
      applyLibraryQuery(chosen.value);
      render();
      return;
    }
    submitSearch();
    return;
  }
  if (event.key === 'ArrowDown' && searchSuggestions.length) {
    event.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % searchSuggestions.length;
    updateSuggestionsDOM();
    return;
  }
  if (event.key === 'ArrowUp' && searchSuggestions.length) {
    event.preventDefault();
    activeSuggestionIndex = activeSuggestionIndex <= 0 ? searchSuggestions.length - 1 : activeSuggestionIndex - 1;
    updateSuggestionsDOM();
    return;
  }
  if (event.key === 'Escape') {
    closeSuggestionsPanel();
  }
}); mainSearch.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  searchSuggestions = getSearchSuggestions(mainSearch.value);
  activeSuggestionIndex = -1;
  updateSuggestionsDOM();
}); mainSearch.addEventListener('focus', () => {
  if (mainSearch.value && !searchSuggestions.length) {
    searchSuggestions = getSearchSuggestions(mainSearch.value);
    activeSuggestionIndex = -1;
    updateSuggestionsDOM();
  }
}); bindSuggestionItemEvents(); } document.querySelectorAll('[data-discovery-load-more]').forEach((btn) => { btn.addEventListener('click', () => { const sectionId = btn.getAttribute('data-discovery-load-more'); if (sectionId) loadMoreDiscoverySection(sectionId); }); }); document.querySelectorAll('[data-unified-filter]').forEach((btn) => { btn.addEventListener('click', () => { const next = btn.getAttribute('data-unified-filter'); if (!next || next === unifiedStreamFilter) return; unifiedStreamFilter = next; unifiedStreamVisibleCount = UNIFIED_STREAM_INITIAL; render(); }); }); const unifiedSortSelect = document.getElementById('unifiedSortSelect'); if (unifiedSortSelect) { unifiedSortSelect.addEventListener('change', () => { const next = unifiedSortSelect.value || 'relevance'; if (next === unifiedStreamSort) return; unifiedStreamSort = next; unifiedStreamVisibleCount = UNIFIED_STREAM_INITIAL; render(); }); } const loadMoreUnifiedBtn = document.getElementById('loadMoreUnifiedBtn'); if (loadMoreUnifiedBtn) { loadMoreUnifiedBtn.addEventListener('click', () => { loadMoreUnifiedStream(); }); }
const copyCitationBtn = document.getElementById('copyCitationBtn'); if (copyCitationBtn && currentPage === 'record' && selectedRecordId) { copyCitationBtn.addEventListener('click', async () => { try { const record = getRecordByIdAny(selectedRecordId); if (!record) return; await copyCitation(record); const note = document.getElementById('copyCitationNote'); if (note) note.textContent = 'Copied'; window.setTimeout(() => { const resetNote = document.getElementById('copyCitationNote'); if (resetNote) resetNote.textContent = 'Copy archive citation text'; }, 1400); } catch (error) { console.error('Failed to copy citation:', error); } }); }
const citationStyleSelect = document.getElementById('citationStyleSelect'); if (citationStyleSelect && currentPage === 'record' && selectedRecordId) { citationStyleSelect.addEventListener('change', event => { citationStyle = event.target.value || 'apa'; render(); }); }
const copyCitationInlineBtn = document.getElementById('copyCitationInlineBtn'); if (copyCitationInlineBtn && currentPage === 'record' && selectedRecordId) { copyCitationInlineBtn.addEventListener('click', async () => { try { const record = getRecordByIdAny(selectedRecordId); if (!record) return; await navigator.clipboard.writeText(generateCitationByStyle(record, citationStyle)); copyCitationInlineBtn.textContent = '✓'; copyCitationInlineBtn.classList.add('copied'); copyCitationInlineBtn.setAttribute('aria-label', 'Citation copied'); window.setTimeout(() => { copyCitationInlineBtn.textContent = '⎘'; copyCitationInlineBtn.classList.remove('copied'); copyCitationInlineBtn.setAttribute('aria-label', 'Copy citation'); }, 1800); } catch(e) { console.warn('copy failed', e); } }); }
const downloadRisBtn = document.getElementById('downloadRisBtn'); if (downloadRisBtn && currentPage === 'record' && selectedRecordId) { downloadRisBtn.addEventListener('click', () => { const record = getRecordByIdAny(selectedRecordId); if (!record) return; downloadRIS(record); }); }
const downloadBibBtn = document.getElementById('downloadBibBtn'); if (downloadBibBtn && currentPage === 'record' && selectedRecordId) { downloadBibBtn.addEventListener('click', () => { const record = getRecordByIdAny(selectedRecordId); if (!record) return; downloadBibTeX(record); }); }

document.querySelectorAll('[data-record-tool]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const record = getRecordByIdAny(selectedRecordId);
    if (!record) return;
    const formData = new FormData(form);
    const tool = form.dataset.recordTool;
    const payload = {action: tool};
    formData.forEach((value, key) => {
      payload[key] = typeof value === 'string' ? value : '';
    });
    if (tool === 'create_reading_list') payload.isPublic = formData.get('isPublic') === 'on';
    postRecordWorkspaceAction(record, payload);
  });
});
document.querySelectorAll('[data-record-community-action]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const recordId = button.getAttribute('data-record-id') || selectedRecordId || "";
    const action = button.getAttribute('data-record-community-action') || "note";
    if (!recordId) return;
    recordCommunityDraftState = { recordId, action, noteId:"" };
    render();
    requestAnimationFrame(() => {
      const form = document.querySelector('[data-record-community-form]');
      if (form) form.scrollIntoView({ behavior:"smooth", block:"center" });
      const firstInput = form ? form.querySelector('input, textarea') : null;
      if (firstInput) firstInput.focus({ preventScroll:true });
    });
  });
});
document.querySelectorAll('[data-record-community-cancel]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    recordCommunityDraftState = { recordId:"", action:"", noteId:"" };
    render();
  });
});
document.querySelectorAll('[data-record-community-edit]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const recordId = button.getAttribute('data-record-id') || selectedRecordId || "";
    const noteId = button.getAttribute('data-record-community-edit') || "";
    if (!recordId || !noteId) return;
    const note = getRecordCommunityNotes(recordId).find(item => item.id === noteId);
    recordCommunityDraftState = {
      recordId,
      action:note?.action || "note",
      noteId
    };
    render();
    requestAnimationFrame(() => {
      const form = document.querySelector('[data-record-community-form]');
      if (form) form.scrollIntoView({ behavior:"smooth", block:"center" });
      const firstInput = form ? form.querySelector('input, textarea') : null;
      if (firstInput) firstInput.focus({ preventScroll:true });
    });
  });
});
document.querySelectorAll('[data-record-community-delete]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const recordId = button.getAttribute('data-record-id') || selectedRecordId || "";
    const noteId = button.getAttribute('data-record-community-delete') || "";
    if (!recordId || !noteId) return;
    const confirmed = window.confirm("Remove this locally saved community reading note?");
    if (!confirmed) return;
    deleteRecordCommunityNote(recordId, noteId);
    if (recordCommunityDraftState.recordId === recordId && recordCommunityDraftState.noteId === noteId) {
      recordCommunityDraftState = { recordId:"", action:"", noteId:"" };
    }
    render();
    requestAnimationFrame(() => {
      const section = document.getElementById('record-community-section');
      if (section) section.scrollIntoView({ behavior:"smooth", block:"start" });
    });
  });
});
document.querySelectorAll('[data-record-community-form]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const recordId = form.getAttribute('data-record-id') || selectedRecordId || "";
    const action = form.getAttribute('data-community-action') || "note";
    const noteId = form.getAttribute('data-community-note-id') || "";
    const formData = new FormData(form);
    const body = String(formData.get('body') || '').trim();
    if (!recordId || !body) return;
    const payload = {
      title:String(formData.get('title') || '').trim(),
      body,
      contact:String(formData.get('contact') || '').trim()
    };
    if (noteId) {
      updateRecordCommunityNote(recordId, noteId, {...payload, action});
    } else {
      saveRecordCommunityNote(recordId, action, payload);
    }
    recordCommunityDraftState = { recordId:"", action:"", noteId:"" };
    render();
    requestAnimationFrame(() => {
      const section = document.getElementById('record-community-section');
      if (section) section.scrollIntoView({ behavior:"smooth", block:"start" });
    });
  });
});
document.querySelectorAll('[data-member-signin]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    redirectToMemberSignIn();
  });
});
document.querySelectorAll('[data-card-drawer-toggle]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const card = button.closest('.record-card');
    const recordId = card ? card.dataset.id : '';
    if (!recordId) return;
    setCardDrawerOpen(recordId, !getCardDrawerOpen(recordId));
    render();
  });
});
document.querySelectorAll('[data-card-open-record]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const card = button.closest('.record-card');
    const recordId = card ? card.dataset.id : '';
    if (!recordId) return;
    navigate('record', recordId);
  });
});
document.querySelectorAll('[data-beyond-label-record]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const explicitId = button.dataset.beyondLabelRecord || "";
    const card = button.closest('.record-card');
    const recordId = explicitId || (card ? card.dataset.id : "");
    if (!recordId) return;
    openBeyondLabel(recordId);
  });
});
document.querySelectorAll('[data-beyond-data-select]').forEach(input => {
  input.addEventListener('click', event => {
    event.stopPropagation();
  });
  input.addEventListener('change', event => {
    event.preventDefault();
    event.stopPropagation();
    toggleBeyondDataRecordSelection(input.dataset.beyondDataSelect || "", input.checked);
  });
});
document.querySelectorAll('[data-beyond-data-open]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openBeyondDataMap();
  });
});
document.querySelectorAll('[data-beyond-data-select-visible]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const ids = Array.from(document.querySelectorAll('.library-unified-grid .record-card[data-id]'))
      .map(card => card.dataset.id || "")
      .filter(Boolean)
      .slice(0, 6);
    beyondDataMapState = {
      ...beyondDataMapState,
      selectedRecordIds:Array.from(new Set([...safeArray(beyondDataMapState.selectedRecordIds), ...ids])).slice(0, 30),
      message:""
    };
    render();
  });
});
document.querySelectorAll('[data-beyond-data-clear]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    beyondDataMapState = {...beyondDataMapState, selectedRecordIds:[], open:false, activeClusterId:"", message:""};
    render();
  });
});
document.querySelectorAll('[data-card-bookmark]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const record = container ? getRecordByIdAny(container.dataset.recordId || '') : null;
    if (!record) return;
    const data = memberWorkspaceState.data || {};
    const bookmarked = (data.bookmarkRecordIds || []).includes(record.id);
    postRecordWorkspaceAction(record, {
      action:"bookmark",
      bookmarked:!bookmarked
    });
  });
});
document.querySelectorAll('[data-card-list-toggle]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const recordId = container ? String(container.dataset.recordId || "") : "";
    if (!recordId) return;
    setCardListComposerOpen(recordId, !getCardListComposerOpen(recordId));
    setCardWorkbenchComposerOpen(recordId, false);
    render();
  });
});
document.querySelectorAll('[data-card-workbench-toggle]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const recordId = container ? String(container.dataset.recordId || "") : "";
    if (!recordId) return;
    setCardWorkbenchComposerOpen(recordId, !getCardWorkbenchComposerOpen(recordId));
    setCardListComposerOpen(recordId, false);
    render();
  });
});
document.querySelectorAll('[data-card-add-list]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const record = container ? getRecordByIdAny(container.dataset.recordId || '') : null;
    const select = container ? container.querySelector('[data-card-reading-list]') : null;
    if (!record || !select || !select.value) return;
    postRecordWorkspaceAction(record, {
      action:"add_to_reading_list",
      readingListId:select.value
    });
  });
});
document.querySelectorAll('[data-card-create-list]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const record = container ? getRecordByIdAny(container.dataset.recordId || '') : null;
    const input = container ? container.querySelector('[data-card-new-list]') : null;
    const title = input ? input.value.trim() : "";
    if (!record || !title) {
      memberWorkspaceState = {...memberWorkspaceState, status:"ready", message:"Add a list title first."};
      render();
      return;
    }
    postRecordWorkspaceAction(record, {
      action:"create_reading_list",
      title
    });
  });
});
document.querySelectorAll('[data-card-workbench-add]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const record = container ? getRecordByIdAny(container.dataset.recordId || '') : null;
    const select = container ? container.querySelector('[data-card-workbench-project]') : null;
    if (!record || !select || !select.value) return;
    postRecordWorkspaceAction(record, {
      action:"workbench_add_record",
      projectId:select.value
    });
  });
});
document.querySelectorAll('[data-card-workbench-create]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const record = container ? getRecordByIdAny(container.dataset.recordId || '') : null;
    const input = container ? container.querySelector('[data-card-new-workbench-project]') : null;
    const title = input ? input.value.trim() : "";
    if (!record || !title) {
      memberWorkspaceState = {...memberWorkspaceState, status:"ready", message:"Add a project title first."};
      render();
      return;
    }
    postRecordWorkspaceAction(record, {
      action:"workbench_create_project",
      workbenchTitle:title
    });
  });
});
document.querySelectorAll('[data-save-search]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(form);
    const query = String(formData.get('query') || getEffectiveSearchQuery() || libraryQuery).trim();
    const label = String(formData.get('label') || query).trim();
    postSearchWorkspaceAction({
      action:"save_search",
      query,
      label,
      filters:getCurrentSearchFilters()
    });
  });
});
document.removeEventListener('keydown', handleMobileFilterEscape);
document.addEventListener('keydown', handleMobileFilterEscape);
if (mobileFilterToggle) { mobileFilterToggle.addEventListener('click', () => { mobileFiltersOpen = !mobileFiltersOpen; render(); }); }
if (mobileClearFilters) { mobileClearFilters.addEventListener('click', clearMobileFilters); }
["mobileFilterClose","mobileFilterBackdrop","mobileFilterApply"].forEach(id => {
  const control = document.getElementById(id);
  if (control) control.addEventListener('click', closeMobileFilters);
});
const mobileFilterClearDrawer = document.getElementById('mobileFilterClearDrawer');
if (mobileFilterClearDrawer) mobileFilterClearDrawer.addEventListener('click', clearMobileFilters);
if (sourceSearchBtn) { sourceSearchBtn.addEventListener('click', () => { console.log('[SOURCE MODE TOGGLE]', { nextOn: !sourceMode }); sourceMode = !sourceMode; if (sourceMode) { refreshBlendedDiscovery(true); } else { liveResults = []; openAccessNotices = null; externalDiscovery = []; liveStatus = {state:'idle', message:'External source discovery is off. Showing archive records only.', sources:[]}; } render(); }); } document.querySelectorAll('input[data-filter-key]').forEach(input => { input.addEventListener('change', () => { const key = input.dataset.filterKey; const checkedValues = [...new Set(Array.from(document.querySelectorAll(`input[data-filter-key="${key}"]:checked`)).map(item => item.value))]; if (checkedValues.length) metadataFilters[key] = checkedValues; else delete metadataFilters[key]; localResults = searchLocalRecords(getEffectiveSearchQuery()); refreshBlendedDiscovery(true); render(); }); }); document.querySelectorAll('input[data-quick-filter]').forEach(input => { input.addEventListener('change', () => { const key = input.dataset.quickFilter; quickFilters[key] = input.checked; localResults = searchLocalRecords(getEffectiveSearchQuery()); refreshBlendedDiscovery(true); render(); }); }); const clearBtn = document.getElementById('clearBtn'); if (clearBtn) { clearBtn.addEventListener('click', () => { clearMetadataFilters(); libraryQuery = ''; localResults = [...RECORDS]; liveResults = []; externalDiscovery = []; liveStatus = {state:'idle', message:'', sources:[]}; render(); }); } bindCardEvents(); document.querySelectorAll('[data-recent-search]').forEach(button => { button.addEventListener('click', () => { const value = button.dataset.recentSearch || ''; if (!value) return; const variant = button.dataset.recentVariant || 'library'; libraryQuery = value; searchSuggestions = []; activeSuggestionIndex = -1; pushRecentSearch(value); applyLibraryQuery(value, true); if (variant === 'hero') { currentPage = 'library'; selectedRecordId = null; navigate('library'); requestAnimationFrame(() => { render(); const ms = document.getElementById('mainSearch'); if (ms) ms.value = value; }); } else { render(); const ms = document.getElementById('mainSearch'); if (ms) ms.value = value; } }); }); const clearRecentBtnLibrary = document.getElementById('clearRecentSearchesBtn'); if (clearRecentBtnLibrary) { clearRecentBtnLibrary.addEventListener('click', () => { clearRecentSearches(); render(); }); } const clearRecentBtnHero = document.getElementById('clearRecentSearchesBtnHero'); if (clearRecentBtnHero) { clearRecentBtnHero.addEventListener('click', () => { clearRecentSearches(); render(); }); } document.querySelectorAll('[data-media-root] img').forEach(image => { image.addEventListener('error', () => { const mediaRoot = image.closest('[data-media-root]'); if (mediaRoot) mediaRoot.classList.add('hidden'); }, {once:true}); }); }
function syncRouteFromPath(options = {}) {
  const route = parseRouteFromLocation();
  currentPage = route.page;
  selectedRecordId = route.recordId;
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === makePath(currentPage, selectedRecordId));
  });
  applyRoute(route, {preserveScroll: options.preserveScroll || options.scroll === false});
}

window.addEventListener("popstate", () => {
  syncRouteFromPath({preserveScroll:true});
});

function initArchiveApp() {
  // One initialisation per full document load. In-app archive routing (capture)
  // only handles clicks inside #app so navbar/footer are never hijacked after a
  // Next client transition. Navbar uses hardNavigateToArchive from dashboard routes.
  recentSearches = loadRecentSearches();
  loadSiteContent();

  document.removeEventListener('click', handleArchiveNavigationClick, true);
  document.addEventListener('click', handleArchiveNavigationClick, true);

  // Global outside-click handler for suggestion panels.
  // Registered once, not on every render, to avoid leaking listeners.
  //
  // Uses 'click' (not 'pointerdown'): pointerdown fires during scroll gestures
  // on trackpads, which would close the panel just from scrolling. 'click'
  // only fires when pointer down+up land on the same element.
  //
  // The suggestion buttons call preventDefault on their own mousedown to hold
  // focus, and run their action on click, so the inside-click check here
  // correctly excludes them before this handler decides to close anything.
  document.addEventListener('click', event => {
    const inSearchBar   = event.target.closest('.search-bar');
    const inHeroSearch  = event.target.closest('.hero-search');
    const inPanel       = event.target.closest('.search-suggestions');
    if (inSearchBar || inHeroSearch || inPanel) return;
    if (document.getElementById('searchSuggestions')) closeSuggestionsPanel('searchSuggestions');
    if (document.getElementById('heroSuggestions'))   closeSuggestionsPanel('heroSuggestions');
  });

  // Delegated rights-disclosure toggle. Installed once and works after every
  // re-render. Stops propagation so clicking it never opens the parent card.
  document.addEventListener('click', event => {
    const toggle = event.target instanceof Element ? event.target.closest('[data-rights-toggle]') : null;
    if (!toggle) return;
    event.preventDefault();
    event.stopPropagation();
    const wrap = toggle.closest('.record-rights-compact');
    if (!wrap) return;
    const panel = wrap.querySelector('.record-rights-panel');
    if (!panel) return;
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      toggle.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
      wrap.classList.remove('is-open');
    } else {
      toggle.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
      wrap.classList.add('is-open');
    }
  });
  // Keyboard accessibility: Space/Enter on the toggle behave like click.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const toggle = event.target instanceof Element ? event.target.closest('[data-rights-toggle]') : null;
    if (!toggle) return;
    event.preventDefault();
    event.stopPropagation();
    toggle.click();
  });

  document.addEventListener('click', event => {
    const toggle = event.target instanceof Element ? event.target.closest('[data-record-abstract-toggle]') : null;
    if (toggle) {
      event.preventDefault();
      const card = toggle.closest('[data-record-abstract-card]');
      if (!card) return;
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      toggle.textContent = expanded ? 'Read more' : 'Show less';
      card.classList.toggle('is-collapsed', expanded);
      card.classList.toggle('is-expanded', !expanded);
      return;
    }

    const scrollTarget = event.target instanceof Element ? event.target.closest('[data-record-scroll-target]') : null;
    if (scrollTarget) {
      event.preventDefault();
      const selector = scrollTarget.getAttribute('data-record-scroll-target') || "";
      const target = selector ? document.querySelector(selector) : null;
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const searchButton = event.target instanceof Element ? event.target.closest('[data-record-counter-search]') : null;
    if (searchButton) {
      event.preventDefault();
      const query = searchButton.getAttribute('data-record-counter-search') || "";
      if (!query) return;
      // Network nodes show a popup first; other elements navigate directly
      if (searchButton.classList.contains('record-network-node')) {
        const label = searchButton.getAttribute('data-record-node-label') || 'Keyword';
        showNodePopup(searchButton, label, query);
        return;
      }
      applyLibraryQuery(query);
      navigate('library');
      return;
    }

    const addMapButton = event.target instanceof Element ? event.target.closest('[data-record-add-to-map]') : null;
    if (addMapButton) {
      event.preventDefault();
      const recordId = addMapButton.getAttribute('data-record-add-to-map') || "";
      if (!recordId) return;
      toggleBeyondDataRecordSelection(recordId, true);
      return;
    }

    const openMapButton = event.target instanceof Element ? event.target.closest('[data-record-open-map]') : null;
    if (openMapButton) {
      event.preventDefault();
      const recordId = openMapButton.getAttribute('data-record-open-map') || "";
      const ids = new Set(safeArray(beyondDataMapState.selectedRecordIds));
      if (recordId) ids.add(recordId);
      const localRelated = selectedRecordId ? getRelatedRecords(getRecordByIdAny(selectedRecordId) || {}, 5).map(item => item.id) : [];
      localRelated.forEach(id => ids.add(id));
      openBeyondDataMap({ selectedRecordIds:Array.from(ids).filter(Boolean).slice(0, 12) });
      return;
    }

    const copyValueButton = event.target instanceof Element ? event.target.closest('[data-record-copy-value]') : null;
    if (copyValueButton) {
      event.preventDefault();
      const value = copyValueButton.getAttribute('data-record-copy-value') || "";
      if (!value || !navigator.clipboard) return;
      navigator.clipboard.writeText(value).then(() => {
        copyValueButton.textContent = "Copied";
        window.setTimeout(() => { copyValueButton.textContent = "Copy"; }, 1200);
      }).catch(error => console.warn("copy failed", error));
    }
  });

  syncRouteFromPath({scroll:false});
  window.addEventListener("resize", syncLibraryFilterBodyLock);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initArchiveApp);
} else {
  initArchiveApp();
}
