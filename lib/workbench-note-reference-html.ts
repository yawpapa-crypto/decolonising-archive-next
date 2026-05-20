/** SSR-safe citation link parsing — regex only (no DOMParser). */

export type ParsedCitedReference = {
  citationId?: string;
  recordId?: string;
  referenceId: string;
  title?: string;
  authors?: string;
  year?: string;
  source?: string;
  url?: string;
  doi?: string;
  displayText?: string;
};

const CITATION_LINK_PATTERN =
  /<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;

const CITATION_ATTR_PATTERN =
  /\s(data-citation-id|data-record-id|data-reference-id|data-title|data-authors|data-year|data-source|data-url|data-doi|data-citation-display|href|class)=(["'])(.*?)\2/gi;

function slugifyCitationKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

function readCitationAnchorAttrs(tagAttrs: string) {
  const attrs = new Map<string, string>();
  let match: RegExpExecArray | null;
  CITATION_ATTR_PATTERN.lastIndex = 0;
  while ((match = CITATION_ATTR_PATTERN.exec(tagAttrs)) !== null) {
    attrs.set(match[1], match[3]);
  }
  return attrs;
}

function isCitationAnchor(attrs: Map<string, string>) {
  if (attrs.has("data-citation-id")) return true;
  if (/\bworkbench-citation-link\b/.test(attrs.get("class") ?? "")) return true;
  return Boolean(attrs.get("href")?.startsWith("#ref-workbench-citation-"));
}

function parseCitationAnchor(
  tagAttrs: string,
  innerHtml: string,
): ParsedCitedReference | null {
  const attrs = readCitationAnchorAttrs(tagAttrs);
  if (!isCitationAnchor(attrs)) return null;

  const citationId = attrs.get("data-citation-id") || undefined;
  const recordId = attrs.get("data-record-id") || undefined;
  const referenceId =
    attrs.get("data-reference-id") ||
    attrs.get("href")?.replace(/^#ref-workbench-citation-/, "").trim() ||
    (recordId ? `record-${slugifyCitationKey(recordId)}` : citationId);

  if (!referenceId) return null;

  const displayText =
    attrs.get("data-citation-display") ||
    innerHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() ||
    undefined;

  return {
    citationId,
    recordId,
    referenceId,
    title: attrs.get("data-title") || undefined,
    authors: attrs.get("data-authors") || undefined,
    year: attrs.get("data-year") || undefined,
    source: attrs.get("data-source") || undefined,
    url: attrs.get("data-url") || undefined,
    doi: attrs.get("data-doi") || undefined,
    displayText,
  };
}

/** Parse in-text citation anchors from note HTML without browser APIs. */
export function parseCitedReferencesFromHtml(html: string): ParsedCitedReference[] {
  const refs: ParsedCitedReference[] = [];
  if (!html) return refs;

  let match: RegExpExecArray | null;
  CITATION_LINK_PATTERN.lastIndex = 0;
  while ((match = CITATION_LINK_PATTERN.exec(html)) !== null) {
    const parsed = parseCitationAnchor(match[1], match[2]);
    if (parsed) refs.push(parsed);
  }

  return refs;
}
