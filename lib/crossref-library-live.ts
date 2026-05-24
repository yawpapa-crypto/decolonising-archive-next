import type { CrossrefWork } from "@/lib/search/crossref";

function slugify(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function mapCrossrefType(value?: string): string {
  const map: Record<string, string> = {
    "journal-article": "Journal article",
    book: "Book",
    "book-chapter": "Book chapter",
    "proceedings-article": "Proceedings paper",
    "posted-content": "Preprint",
    report: "Report",
  };
  return (value && map[value]) || "Research paper";
}

function buildCitation(
  title: string,
  creator: string,
  year: string,
  source: string,
): string {
  return [creator, year ? `(${year})` : "", title, source].filter(Boolean).join(". ") + ".";
}

/** Map Crossref work row to the live-record shape expected by `public/assets/js/app.js`. */
export function crossrefWorkToLibraryLive(
  item: CrossrefWork,
  query: string,
  index = 0,
): Record<string, unknown> {
  const authors = Array.isArray(item.author)
    ? item.author
        .map((person) => [person.given, person.family].filter(Boolean).join(" ").trim())
        .filter(Boolean)
    : [];
  const title = Array.isArray(item.title) ? item.title[0] : item.title || "Untitled record";
  const abstract = String(item.abstract || "").trim();
  const container = Array.isArray(item["container-title"]) ? item["container-title"][0] : "";
  const year = item.issued?.["date-parts"]?.[0]?.[0];
  const period = year != null ? String(year) : "";
  const licenceUrl = item.license?.[0]?.URL || item.license?.[0]?.url || "";
  const pdfLink =
    (item.link || []).find((link) => /pdf/i.test(`${link["content-type"] || ""} ${link.URL || ""}`))
      ?.URL || "";
  const htmlLink =
    (item.link || []).find((link) => /html/i.test(`${link["content-type"] || ""} ${link.URL || ""}`))
      ?.URL || "";
  const doi = item.DOI || "";

  return {
    id: `live-crossref-${slugify((doi || title) + "-" + index)}`,
    title,
    creator: authors.join(", ") || "Unknown creator",
    summary: abstract
      ? abstract.slice(0, 320)
      : `${container || "Scholarly record"} surfaced via external metadata search.`,
    abstract,
    description: [
      Array.isArray(item.subject) && item.subject.length
        ? `Subjects: ${item.subject.slice(0, 6).join(", ")}.`
        : "",
      item.publisher ? `Publisher: ${item.publisher}.` : "",
    ].filter(Boolean),
    period,
    type: mapCrossrefType(item.type),
    cat: "Research & scholarly metadata",
    region: "Africa / Global",
    country: "",
    collection: "Crossref external discovery",
    institution: container || "Crossref",
    source: "Crossref",
    sourceUrl: item.URL || (doi ? `https://doi.org/${doi}` : `https://search.crossref.org/?q=${encodeURIComponent(query)}`),
    licence_url: licenceUrl,
    pdf_url: pdfLink,
    html_url: htmlLink,
    sourceActionLabel: "Open source record",
    externalLinks: doi ? [{ label: "DOI", url: `https://doi.org/${doi}` }] : [],
    language: [],
    tags: Array.isArray(item.subject) ? item.subject.slice(0, 8) : [],
    concepts: [],
    themes: [],
    images: [],
    rights: "External source rights apply",
    rightsStatus: "Metadata Only",
    provenance: "External metadata pulled from Crossref.",
    citation: buildCitation(title, authors.join(", ") || "Unknown creator", period, "Crossref"),
    notes: ["External-source scholarly metadata. Some abstracts are shortened for display."],
    recordIdentifier: doi,
    archiveIdentifier: doi ? `DOI:${doi}` : `CR-${index}`,
    resultMode: "live",
    trustScore: 0.89,
    liveSourceHint: "crossref",
  };
}
