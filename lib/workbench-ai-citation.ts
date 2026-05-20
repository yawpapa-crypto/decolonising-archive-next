export type CitationCatalogEntry = {
  id: string;
  title: string;
  creator?: string | null;
  date?: string | null;
  institution?: string | null;
  recordType?: string | null;
  sourceLabel?: string | null;
  citationText?: string | null;
  citationLine: string;
  topics: string[];
};

const RESEARCH_THEME_TERMS = [
  "decolon",
  "decolonial",
  "indigenous",
  "african",
  "epistemolog",
  "pan-african",
  "colonial",
  "postcolonial",
  "post-colonial",
  "knowledge",
  "archive",
  "oral",
  "ubuntu",
  "material culture",
  "diaspora",
  "global south",
  "community",
  "research",
  "method",
  "ethics",
  "land",
  "sovereignty",
];

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPlaceholderNote(text: string) {
  const normalized = text.toLowerCase();
  if (!normalized || normalized.length < 40) return true;
  const loremHits = (normalized.match(/lorem|ipsum|dolor|amet/g) ?? []).length;
  return loremHits >= 3;
}

export function formatCitationLine(entry: {
  title: string;
  creator?: string | null;
  date?: string | null;
  institution?: string | null;
  citationText?: string | null;
}) {
  if (entry.citationText?.trim()) return entry.citationText.trim();

  const author = entry.creator?.trim();
  const year = entry.date?.trim();
  const title = entry.title.trim();
  const publisher = entry.institution?.trim();

  const authorYear = [author, year ? `(${year})` : null].filter(Boolean).join(" ");
  const tail = [title, publisher].filter(Boolean).join(". ");
  if (authorYear && tail) return `${authorYear}. ${tail}.`;
  if (tail) return `${tail}.`;
  return title || "Archive source";
}

export function buildCitationCatalog(
  candidates: Array<{
    id: string;
    title: string;
    creator?: string | null;
    date?: string | null;
    institution?: string | null;
    recordType?: string | null;
    sourceLabel?: string | null;
    citationText?: string | null;
  }>,
): CitationCatalogEntry[] {
  return candidates.map((candidate) => {
    const haystack = [
      candidate.title,
      candidate.creator,
      candidate.date,
      candidate.institution,
      candidate.recordType,
      candidate.sourceLabel,
      candidate.citationText,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const topics = RESEARCH_THEME_TERMS.filter((term) => haystack.includes(term));

    return {
      id: candidate.id,
      title: candidate.title,
      creator: candidate.creator,
      date: candidate.date,
      institution: candidate.institution,
      recordType: candidate.recordType,
      sourceLabel: candidate.sourceLabel,
      citationText: candidate.citationText,
      citationLine: formatCitationLine(candidate),
      topics,
    };
  });
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

export function rankCitationCatalog(
  catalog: CitationCatalogEntry[],
  prompt: string,
  noteContentHtml?: string,
  limit = 48,
) {
  const noteText = stripHtml(noteContentHtml ?? "");
  const promptTokens = new Set(tokenize(`${prompt} ${noteText}`));
  const placeholder = isPlaceholderNote(noteText);

  const scored = catalog.map((entry) => {
    const searchable = [
      entry.title,
      entry.creator,
      entry.date,
      entry.institution,
      entry.recordType,
      entry.sourceLabel,
      entry.citationText,
      entry.citationLine,
      entry.topics.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let score = 0;

    for (const token of promptTokens) {
      if (searchable.includes(token)) score += 4;
    }

    for (const theme of RESEARCH_THEME_TERMS) {
      if (searchable.includes(theme)) score += placeholder ? 3 : 1;
    }

    if (/decolon|indigenous|epistemolog|african|pan-african|colonial|knowledge system/i.test(searchable)) {
      score += 6;
    }

    if (entry.citationText?.trim()) score += 2;
    if (entry.creator?.trim()) score += 1;

    return { entry, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.title.localeCompare(b.entry.title, "en");
  });

  const ranked =
    scored.filter((item) => item.score > 0).length > 0
      ? scored
      : scored.map((item, index) => ({ ...item, score: 1000 - index }));

  return ranked.slice(0, limit).map((item) => item.entry);
}

export function resolveRecommendedIds(
  rawIds: unknown,
  catalog: CitationCatalogEntry[],
  legacySuggestions: string[] = [],
) {
  const valid = new Set(catalog.map((entry) => entry.id));
  const matched = new Set<string>();

  const tryAdd = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (valid.has(normalized)) {
      matched.add(normalized);
      return;
    }
    const byTitle = catalog.find(
      (entry) => entry.title.toLowerCase() === normalized.toLowerCase(),
    );
    if (byTitle) matched.add(byTitle.id);
  };

  if (Array.isArray(rawIds)) {
    for (const id of rawIds) tryAdd(String(id));
  }

  for (const suggestion of legacySuggestions) {
    const normalized = suggestion.trim().toLowerCase();
    for (const entry of catalog) {
      if (
        normalized === entry.id.toLowerCase() ||
        normalized.includes(entry.id.toLowerCase()) ||
        (entry.title && normalized.includes(entry.title.toLowerCase()))
      ) {
        matched.add(entry.id);
      }
    }
  }

  return [...matched];
}

export function buildCitationPicks(ids: string[], catalog: CitationCatalogEntry[]) {
  const byId = new Map(catalog.map((entry) => [entry.id, entry]));
  return ids
    .map((id) => byId.get(id))
    .filter((entry): entry is CitationCatalogEntry => Boolean(entry))
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      citationLine: entry.citationLine,
      creator: entry.creator,
      date: entry.date,
      sourceLabel: entry.sourceLabel,
      recordType: entry.recordType,
    }));
}
