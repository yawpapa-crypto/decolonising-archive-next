import {
  expandQueryTerms,
  getAuthorBoostsForQuery,
  queryMatchesExpansionKey,
} from "@/lib/search/query-expansion";
import { getRecordNarrativeRankingBoost } from "@/lib/search/record-quality";

export type RankableSearchRecord = {
  id?: string;
  title?: string;
  creator?: string;
  contributors?: string[];
  abstract?: string;
  summary?: string;
  description?: string | string[];
  tags?: string[];
  keywords?: string[];
  concepts?: string[];
  themes?: string[];
  country?: string;
  countries?: string[];
  region?: string;
  regions?: string[];
  community?: string;
  language?: string[];
  source?: string;
  sourceName?: string;
  institution?: string;
  collection?: string;
  liveSourceHint?: string;
  decolonialSignal?: boolean;
  mediaTypes?: string[];
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  period?: string | number;
  year?: string | number;
  citedByCount?: number;
  citationCount?: number;
  doi?: string;
  relevanceScore?: number;
  unifiedRelevanceScore?: number;
  resultKind?: SearchResultKind;
  is_oa?: boolean;
  open_access?: { is_oa?: boolean };
  resultMode?: string;
  type?: string;
  cat?: string;
  sourceCategoryGroup?: string;
};

export type SearchResultKind = "primary" | "entity" | "handoff" | "collection";

export type QueryContext = {
  raw: string;
  normalized: string;
  tokens: string[];
  phrases: string[];
  expandedTerms?: string[];
};

export type ScoreSearchResultOptions = {
  sourceKey?: string;
  isOpenAccess?: boolean;
  decolonialMode?: boolean;
};

function foldText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeComparable(value: unknown): string {
  return foldText(value).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function buildRankingQueryContext(query: string): QueryContext {
  const raw = String(query || "").trim();
  const normalized = normalizeComparable(raw);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const { expandedPhrases, expandedTerms } = expandQueryTerms(normalized, tokens);
  const phrases = raw ? [raw, ...expandedPhrases] : expandedPhrases;
  return {
    raw,
    normalized,
    tokens,
    phrases,
    expandedTerms,
  };
}

export function getRecordYear(record: RankableSearchRecord): number {
  const raw = record.period ?? record.year ?? "";
  const year = Number.parseInt(String(raw).slice(0, 4), 10);
  return Number.isFinite(year) ? year : 0;
}

export function getCitationCount(record: RankableSearchRecord): number {
  if (typeof record.citedByCount === "number") return record.citedByCount;
  if (typeof record.citationCount === "number") return record.citationCount;
  const description = Array.isArray(record.description)
    ? record.description.join(" ")
    : String(record.description || "");
  const match = description.match(/Citations:\s*(\d+)/i);
  return match ? Number.parseInt(match[1], 10) || 0 : 0;
}

function gatherSearchText(record: RankableSearchRecord) {
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

function countTokenHits(text: string, tokens: string[]): number {
  return tokens.reduce((count, token) => (text.includes(token) ? count + 1 : count), 0);
}

function fuzzyPartialBoost(text: string, token: string): number {
  if (!token || token.length < 4 || text.includes(token)) return 0;
  if (token.length >= 5) {
    const prefix = token.slice(0, Math.max(4, token.length - 1));
    if (text.includes(prefix)) return 2;
  }
  return 0;
}

export function scoreSearchResult(
  record: RankableSearchRecord,
  query: string,
  options: ScoreSearchResultOptions = {},
): number {
  const context = buildRankingQueryContext(query);
  if (!context.raw) return 0;

  const fields = gatherSearchText(record);
  const queryFold = foldText(query);
  const tokens = context.tokens;
  let score = 0;

  if (queryFold && fields.title === queryFold) score += 100;
  else if (queryFold && fields.title.includes(queryFold)) score += 72;

  if (tokens.length) {
    const titleHits = countTokenHits(fields.title, tokens);
    if (titleHits === tokens.length) score += 58;
    else score += titleHits * 14;
  }

  if (queryFold && (fields.authors === queryFold || fields.authors.includes(` ${queryFold} `))) {
    score += 78;
  } else if (tokens.length && tokens.every((token) => fields.authors.includes(token))) {
    score += 52;
  } else {
    score += countTokenHits(fields.authors, tokens) * 16;
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

  getAuthorBoostsForQuery(context.normalized, tokens).forEach((author) => {
    if (fields.authors.includes(author)) score += 50;
    if (fields.keywords.includes(author)) score += 24;
    if (fields.title.includes(author)) score += 18;
  });

  score += getRecordNarrativeRankingBoost(record);

  const expandedTokens = context.expandedTerms?.length ? context.expandedTerms : tokens;
  for (const token of expandedTokens) {
    if (fields.summary.includes(token)) score += 9;
    if (fields.description.includes(token)) score += 8;
    if (fields.keywords.includes(token)) score += 11;
    if (fields.geo.includes(token)) score += 7;
    if (fields.languages.includes(token)) score += 6;
    if (fields.sourceLabels.includes(token)) score += 5;
    score += fuzzyPartialBoost(fields.title, token);
    score += fuzzyPartialBoost(fields.authors, token);
  }

  const apiScore = Number(record.unifiedRelevanceScore ?? record.relevanceScore ?? 0);
  if (apiScore > 0) score += Math.min(apiScore * 0.35, 24);

  const citations = getCitationCount(record);
  if (citations > 0) score += Math.min(Math.log10(citations + 1) * 4, 12);

  if (options.isOpenAccess) score += 4;

  if (options.sourceKey === "library-of-congress") {
    const mediaTypes = (record.mediaTypes || []).join(" ").toLowerCase();
    const hasMedia = Boolean(record.audioUrl || record.videoUrl || record.imageUrl);
    if (hasMedia) score += 10;
    if (/audio|video|oral history|sound|recording|film|photograph/.test(mediaTypes)) score += 8;
    if (record.decolonialSignal) score += 14;
    if (options.decolonialMode && record.decolonialSignal) score += 12;
  }

  if (options.sourceKey === "archive") score += 8;
  const kind = getResultKind(record);
  if (options.sourceKey === "handoff" || options.sourceKey === "aodl") {
    score -= 15;
  }
  if (
    options.sourceKey === "smithsonian" &&
    (kind === "collection" || kind === "handoff")
  ) {
    score -= 15;
  }

  return score;
}

export function getResultKind(record: RankableSearchRecord): SearchResultKind {
  const preset = record.resultKind;
  if (preset === "primary" || preset === "entity" || preset === "handoff" || preset === "collection") {
    return preset;
  }

  const mode = String(record.resultMode || "").toLowerCase();
  if (mode === "external_handoff") return "handoff";

  const id = String(record.id || "");
  if (/^handoff-/i.test(id)) return "handoff";

  const category = String(record.sourceCategoryGroup || "").toLowerCase();
  if (category === "source_handoffs") return "handoff";
  if (
    category === "australian_open_collections" ||
    category === "african_open_collections" ||
    category === "global_open_collections"
  ) {
    return "collection";
  }

  const type = String(record.type || "").toLowerCase();
  const cat = String(record.cat || "").toLowerCase();
  const collection = String(record.collection || "").toLowerCase();
  const title = String(record.title || "").trim();

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

  if (/^search .+/i.test(title) && !record.doi && !record.abstract) {
    return "handoff";
  }

  const hint = String(record.liveSourceHint || "").toLowerCase();
  if (hint === "handoff") return "handoff";

  if (hint === "wikidata" || /^live-wikidata-/i.test(id) || /^Q\d+$/i.test(id)) {
    return "entity";
  }

  return "primary";
}

export function getResultRankGroup(record: RankableSearchRecord): number {
  const kind = getResultKind(record);
  return kind === "handoff" || kind === "collection" ? 1 : 0;
}

export type UnifiedSortMode = "relevance" | "newest" | "cited" | "source";

const SOURCE_SORT_ORDER = [
  "archive",
  "openalex",
  "core",
  "crossref",
  "semantic-scholar",
  "wikidata",
  "openaccess",
  "library-of-congress",
  "archival-external",
  "aodl",
  "smithsonian",
  "handoff",
  "external",
];

export function compareRankedResults(
  a: { record: RankableSearchRecord; score: number; sourceKey?: string },
  b: { record: RankableSearchRecord; score: number; sourceKey?: string },
  sortMode: UnifiedSortMode = "relevance",
): number {
  const groupDiff = getResultRankGroup(a.record) - getResultRankGroup(b.record);
  if (groupDiff) return groupDiff;

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
    const order = (key?: string) => {
      const index = SOURCE_SORT_ORDER.indexOf(String(key || ""));
      return index === -1 ? SOURCE_SORT_ORDER.length : index;
    };
    return (
      order(a.sourceKey) - order(b.sourceKey) ||
      b.score - a.score ||
      String(a.record.title || "").localeCompare(String(b.record.title || ""))
    );
  }

  const scoreDiff = b.score - a.score;
  if (scoreDiff) return scoreDiff;

  const archiveDiff =
    (a.sourceKey === "archive" ? 1 : 0) - (b.sourceKey === "archive" ? 1 : 0);
  if (archiveDiff) return archiveDiff;

  const yearDiff = getRecordYear(b.record) - getRecordYear(a.record);
  if (yearDiff) return yearDiff;

  const citationDiff = getCitationCount(b.record) - getCitationCount(a.record);
  if (citationDiff) return citationDiff;

  return String(a.record.title || "").localeCompare(String(b.record.title || ""));
}
