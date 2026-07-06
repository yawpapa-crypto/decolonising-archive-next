import type { CollectionRecordResearchInput } from "@/lib/research/collection-record-research";

export type CitationStyleId =
  | "apa"
  | "chicago"
  | "mla"
  | "harvard"
  | "bibtex"
  | "ris"
  | "plain";

export type CitationPayload = {
  itemType: string;
  itemId: string;
  citationStyle: CitationStyleId;
  formatted: string;
  plainText: string;
  bibtex?: string;
  ris?: string;
  accessDate: string;
  transparencyNote: string;
};

function accessDateLabel(date = new Date()) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function creatorLabel(input: CollectionRecordResearchInput) {
  return input.creator?.trim() || "Creator unrecorded";
}

function dateLabel(input: CollectionRecordResearchInput) {
  return input.date?.trim() || "Date unrecorded";
}

function institutionPart(input: CollectionRecordResearchInput) {
  const parts = [input.institution, input.accession ? `object ${input.accession}` : null].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : input.sourceName || "Institution unrecorded";
}

function splitCreatorName(name: string) {
  const clean = name.trim();
  if (!clean) return { last: "Creator unrecorded", initials: "" };
  if (clean.includes(",")) {
    const [last, rest] = clean.split(",").map((p) => p.trim());
    const initials = (rest || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}.`)
      .join(" ");
    return { last: last || clean, initials };
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  const last = parts.length ? parts[parts.length - 1]! : clean;
  const initials = parts.slice(0, -1).map((part) => `${part.charAt(0).toUpperCase()}.`).join(" ");
  return { last, initials };
}

function apaCitation(input: CollectionRecordResearchInput, canonicalUrl: string, accessed: string) {
  const author = splitCreatorName(creatorLabel(input));
  const date = dateLabel(input);
  const yearPart = /^\d{4}/.test(date) ? date.match(/\d{4}/)?.[0] : date;
  return `${author.last}${author.initials ? `, ${author.initials}` : ""} (${yearPart}). ${input.title}. ${institutionPart(input)}. ARED: ${input.collectionTitle}. ${canonicalUrl}. Accessed ${accessed}.`;
}

function chicagoCitation(input: CollectionRecordResearchInput, canonicalUrl: string, accessed: string) {
  return `${creatorLabel(input)}. “${input.title}.” ${dateLabel(input)}. ${institutionPart(input)}. ARED: ${input.collectionTitle}. ${canonicalUrl}. Accessed ${accessed}.`;
}

function mlaCitation(input: CollectionRecordResearchInput, canonicalUrl: string, accessed: string) {
  return `${creatorLabel(input)}. “${input.title}.” ${institutionPart(input)}, ${dateLabel(input)}, ARED: ${input.collectionTitle}, ${canonicalUrl}. Accessed ${accessed}.`;
}

function harvardCitation(input: CollectionRecordResearchInput, canonicalUrl: string, accessed: string) {
  const yearPart = dateLabel(input);
  return `${creatorLabel(input)} (${yearPart}) ${input.title}. ${institutionPart(input)}. ARED: ${input.collectionTitle}. Available at: ${canonicalUrl} (Accessed: ${accessed}).`;
}

function bibtexEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/{/g, "\\{").replace(/}/g, "\\}");
}

function bibtexCitation(input: CollectionRecordResearchInput, canonicalUrl: string) {
  const key = input.itemId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const lines = [
    `@misc{${key},`,
    `  author = {${bibtexEscape(creatorLabel(input))}},`,
    `  title = {${bibtexEscape(input.title)}},`,
    `  year = {${bibtexEscape(dateLabel(input))}},`,
    `  publisher = {${bibtexEscape(institutionPart(input))}},`,
    `  howpublished = {ARED: ${bibtexEscape(input.collectionTitle)}},`,
    `  url = {${bibtexEscape(canonicalUrl)}},`,
    `  note = {Record ID: ${bibtexEscape(input.itemId)}${input.accession ? `; accession ${bibtexEscape(input.accession)}` : ""}},`,
    `}`,
  ];
  return lines.join("\n");
}

function risCitation(input: CollectionRecordResearchInput, canonicalUrl: string) {
  const lines = [
    "TY  - ART",
    `TI  - ${input.title}`,
    `AU  - ${creatorLabel(input)}`,
    `PY  - ${dateLabel(input)}`,
    `PB  - ${institutionPart(input)}`,
    `T2  - ARED: ${input.collectionTitle}`,
    `UR  - ${canonicalUrl}`,
    `ID  - ${input.itemId}`,
    "ER  - ",
  ];
  return lines.join("\n");
}

export function generateCollectionCitation(
  input: CollectionRecordResearchInput,
  style: CitationStyleId,
  origin: string,
  accessedAt = new Date(),
): CitationPayload {
  const canonicalUrl = `${origin.replace(/\/$/, "")}${input.canonicalPath}`;
  const accessed = accessDateLabel(accessedAt);
  const transparencyNote = "Citation generated from current catalogue metadata.";

  let formatted = "";
  let plainText = "";
  let bibtex: string | undefined;
  let ris: string | undefined;

  switch (style) {
    case "chicago":
      formatted = chicagoCitation(input, canonicalUrl, accessed);
      break;
    case "mla":
      formatted = mlaCitation(input, canonicalUrl, accessed);
      break;
    case "harvard":
      formatted = harvardCitation(input, canonicalUrl, accessed);
      break;
    case "bibtex":
      bibtex = bibtexCitation(input, canonicalUrl);
      formatted = bibtex;
      break;
    case "ris":
      ris = risCitation(input, canonicalUrl);
      formatted = ris;
      break;
    case "plain":
      formatted = `${creatorLabel(input)}. “${input.title}.” ${dateLabel(input)}. ${institutionPart(input)}. ARED: ${input.collectionTitle}. ${input.itemId}. ${canonicalUrl}`;
      break;
    case "apa":
    default:
      formatted = apaCitation(input, canonicalUrl, accessed);
      break;
  }

  plainText = formatted;

  return {
    itemType: input.itemType,
    itemId: input.itemId,
    citationStyle: style,
    formatted,
    plainText,
    bibtex: bibtex ?? (style === "bibtex" ? formatted : bibtexCitation(input, canonicalUrl)),
    ris: ris ?? (style === "ris" ? formatted : risCitation(input, canonicalUrl)),
    accessDate: accessed,
    transparencyNote,
  };
}

export const CITATION_STYLE_OPTIONS: Array<{ id: CitationStyleId; label: string }> = [
  { id: "apa", label: "APA 7" },
  { id: "chicago", label: "Chicago" },
  { id: "mla", label: "MLA" },
  { id: "harvard", label: "Harvard" },
  { id: "plain", label: "Plain text" },
  { id: "bibtex", label: "BibTeX" },
  { id: "ris", label: "RIS" },
];
