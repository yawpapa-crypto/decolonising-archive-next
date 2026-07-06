import {
  scoreSearchResult,
  compareRankedResults,
  getResultKind,
  getResultRankGroup,
} from "../lib/search/ranking";

const queries = [
  "Paulin Hountondji",
  "Sankofa",
  "African design",
  "Indigenous knowledge",
  "apartheid",
  "Swahili",
  "climate justice disability",
  "Ghana Islam",
  "Kumasi",
];

const archiveNoise = {
  id: "archive-1",
  title: "General colonial administration records",
  creator: "Unknown",
  summary: "Administrative files from a regional archive.",
  themes: ["Archives"],
  period: "1960",
  source: "Archive",
};

const strongOpenAlex = {
  id: "live-openalex-1",
  title: "African Philosophy in the Postcolonial Era",
  creator: "Paulin Hountondji",
  summary: "Survey of African philosophy and postcolonial thought.",
  abstract: "Paulin Hountondji discusses African philosophy and epistemology.",
  themes: ["African philosophy"],
  period: "1996",
  source: "OpenAlex",
  relevanceScore: 40,
};

const strongSemantic = {
  id: "live-semantic-scholar-1",
  title: "Sankofa and African Design Futures",
  creator: "Ama Mensah",
  summary: "Design frameworks drawing on Sankofa and indigenous knowledge.",
  abstract: "Sankofa, African design, and indigenous knowledge systems.",
  themes: ["African design", "Indigenous knowledge"],
  period: "2021",
  source: "Semantic Scholar",
  unifiedRelevanceScore: 52,
  citationCount: 84,
};

const aodlHandoff = {
  id: "handoff-aodl-apartheid",
  title: "Search AODL — African Online Digital Library",
  creator: "Pan-Africa",
  summary: "Open the AODL collection search for this query.",
  type: "External handoff",
  cat: "External source pathways",
  collection: "External Source Handoffs",
  resultMode: "external_handoff",
  resultKind: "collection" as const,
  liveSourceHint: "handoff",
};

function validateQuery(query: string) {
  const entries = [
    {
      record: aodlHandoff,
      score: scoreSearchResult(aodlHandoff, query, { sourceKey: "handoff" }),
      sourceKey: "handoff",
    },
    {
      record: archiveNoise,
      score: scoreSearchResult(archiveNoise, query, { sourceKey: "archive" }),
      sourceKey: "archive",
    },
    {
      record: strongOpenAlex,
      score: scoreSearchResult(strongOpenAlex, query, { sourceKey: "openalex" }),
      sourceKey: "openalex",
    },
    {
      record: strongSemantic,
      score: scoreSearchResult(strongSemantic, query, { sourceKey: "semantic-scholar" }),
      sourceKey: "semantic-scholar",
    },
  ].sort((a, b) => compareRankedResults(a, b, "relevance"));

  const top = entries[0];
  const handoffIndexes = entries
    .map((entry, index) => (getResultRankGroup(entry.record) === 1 ? index : -1))
    .filter((index) => index >= 0);
  const primaryCount = entries.filter((entry) => getResultRankGroup(entry.record) === 0).length;
  const handoffsPinned =
    handoffIndexes.length === 0 ||
    Math.min(...handoffIndexes) >= primaryCount ||
    primaryCount === 0;

  return {
    query,
    topTitle: top.record.title,
    topSource: top.sourceKey,
    topKind: getResultKind(top.record),
    topScore: top.score,
    order: entries.map(
      (entry) => `${getResultKind(entry.record)}:${entry.sourceKey}:${Math.round(entry.score)}`,
    ),
    handoffsPinned,
  };
}

const results = queries.map(validateQuery);
console.log(JSON.stringify(results, null, 2));

const weakTop = results.filter((result) => result.topKind === "handoff" || result.topKind === "collection");
const unpinned = results.filter((result) => !result.handoffsPinned);

if (weakTop.length || unpinned.length) {
  console.error("Handoff ranking validation failed", {
    weakTop: weakTop.map((item) => item.query),
    unpinned: unpinned.map((item) => item.query),
  });
  process.exit(1);
}
