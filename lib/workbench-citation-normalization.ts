import type { ScholarlySearchResult } from "@/lib/scholarly-search";

export type NormalisedCitationResult = {
  id: string;
  title: string;
  authors: string[];
  year?: string;
  venue?: string;
  source?: string;
  doi?: string;
  url?: string;
  abstract?: string;
};

const MAX_TEXT_LENGTH = 500;
const MAX_ABSTRACT_LENGTH = 700;

function cleanText(value: unknown, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanUrl(value: unknown): string | undefined {
  const text = cleanText(value, 600);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return undefined;
  }
  return undefined;
}

function cleanDoi(value: unknown): string | undefined {
  const doi = cleanText(value, 220).replace(/^https?:\/\/doi\.org\//i, "");
  return doi || undefined;
}

function authorsFromCreator(value: unknown): string[] {
  const creator = cleanText(value, 500);
  if (!creator || /^unknown author$/i.test(creator)) return [];
  return creator
    .split(/\s*(?:,|;|\band\b)\s*/i)
    .map((author) => cleanText(author, 120))
    .filter(Boolean)
    .slice(0, 12);
}

function authorsFromValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((author) => cleanText(author, 120))
      .filter(Boolean)
      .slice(0, 12);
  }
  return authorsFromCreator(value);
}

export function normalizeCitationResult(result: unknown): NormalisedCitationResult | null {
  if (!result || typeof result !== "object") return null;
  const row = result as Partial<ScholarlySearchResult> & Record<string, unknown>;
  const title = cleanText(row.title, 360) || "Untitled source";
  const normalizedAuthors = authorsFromValue(row.authors);
  const authors = normalizedAuthors.length ? normalizedAuthors : authorsFromCreator(row.creator);
  const year = cleanText(row.year, 24) || undefined;
  const venue =
    cleanText(row.venue, 240) ||
    cleanText(row.journal, 240) ||
    cleanText(row.publisher, 240) ||
    undefined;
  const source = cleanText(row.source, 80) || undefined;
  const doi = cleanDoi(row.doi);
  const url = cleanUrl(row.url) || (doi ? `https://doi.org/${doi}` : undefined);
  const abstract = cleanText(row.abstract, MAX_ABSTRACT_LENGTH) || undefined;
  const idSource = cleanText(row.id, 180) || [title, authors.join(" "), year, source].filter(Boolean).join(" ");
  const id = idSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || "scholarly-result";

  return { id, title, authors, year, venue, source, doi, url, abstract };
}

export function formatCitationForInsertion(result: NormalisedCitationResult): string {
  const authorText = result.authors.length ? result.authors.join(", ") : "Unknown author";
  const yearText = result.year || "n.d.";
  const venueText = result.venue ? `${result.venue}.` : "";
  const link = result.doi ? `https://doi.org/${result.doi}` : result.url;
  return [ `${authorText}.`, `(${yearText}).`, `${result.title}.`, venueText, link ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatCitationNoteBlock(result: NormalisedCitationResult): string {
  return [
    "[Source note]",
    `Title: ${result.title}`,
    `Author(s): ${result.authors.length ? result.authors.join(", ") : "Unknown author"}`,
    result.year ? `Year: ${result.year}` : "",
    result.venue ? `Source: ${result.venue}` : result.source ? `Source: ${result.source}` : "",
    result.doi ? `Link: https://doi.org/${result.doi}` : result.url ? `Link: ${result.url}` : "",
    "Why this may matter:",
    "Write your own note here.",
  ]
    .filter(Boolean)
    .join("\n");
}
