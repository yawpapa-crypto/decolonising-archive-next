import type { ArchiveRecord } from "@/lib/archive-metadata";
import { absoluteUrl } from "@/lib/kgo/site";

function yearFromRecord(record: ArchiveRecord): string {
  const raw = record.datePublished || record.period?.[0] || "";
  const match = String(raw).match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match?.[1] || "n.d.";
}

function bibtexEscape(value: string): string {
  return String(value || "").replace(/[{}]/g, "");
}

export function citationContext(record: ArchiveRecord) {
  const recordUrl = absoluteUrl(`/records/${record.id}`);
  const year = yearFromRecord(record);
  const creator = record.creator || "Unknown";
  const title = record.title || "Untitled";
  return { recordUrl, year, creator, title };
}

export function toBibTeX(record: ArchiveRecord): string {
  const { recordUrl, year, creator, title } = citationContext(record);
  const key = `${String(creator).split(",")[0] || "record"}${year}`.replace(/[^a-zA-Z0-9]/g, "");
  return [
    `@misc{${key},`,
    `  author = {${bibtexEscape(creator)}},`,
    `  title = {${bibtexEscape(title)}},`,
    `  year = {${year}},`,
    `  publisher = {${bibtexEscape(record.sourceName || "ARED")}},`,
    `  url = {${recordUrl}},`,
    `  note = {ARED record ${record.id}}`,
    `}`,
    "",
  ].join("\n");
}

export function toRIS(record: ArchiveRecord): string {
  const { recordUrl, year, creator, title } = citationContext(record);
  return [
    "TY  - GEN",
    `TI  - ${title}`,
    `AU  - ${creator}`,
    `PY  - ${year}`,
    `PB  - ${record.sourceName || "ARED"}`,
    `UR  - ${recordUrl}`,
    `N1  - ${record.id}`,
    record.doi ? `DO  - ${record.doi}` : "",
    "ER  -",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function toCslJson(record: ArchiveRecord) {
  const { recordUrl, year, creator, title } = citationContext(record);
  return {
    id: record.id,
    type: "article",
    title,
    author: [{ literal: creator }],
    issued: { "date-parts": [[Number(year) || undefined].filter(Boolean)] },
    publisher: record.sourceName || "ARED",
    URL: recordUrl,
    DOI: record.doi || undefined,
    ISBN: record.isbn || undefined,
  };
}

/** Citation File Format 1.2 */
export function toCFF(record: ArchiveRecord): string {
  const { recordUrl, year, creator, title } = citationContext(record);
  const authors = creator.split(/\s+and\s+|;\s*/).map((name) => {
    const parts = name.trim().split(/\s+/);
    const family = parts.pop() || "Unknown";
    const given = parts.join(" ");
    return [`  - family-names: "${family.replace(/"/g, "")}"`, given ? `    given-names: "${given.replace(/"/g, "")}"` : ""]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "cff-version: 1.2.0",
    "message: If you use this archive record, please cite it using these metadata.",
    `title: "${title.replace(/"/g, "'")}"`,
    "authors:",
    ...authors,
    `date-released: "${year === "n.d." ? new Date().toISOString().slice(0, 10) : `${year}-01-01`}"`,
    `url: "${recordUrl}"`,
    `repository-code: "${recordUrl}"`,
    record.doi ? `doi: "${record.doi}"` : "",
    "type: dataset",
    `keywords:`,
    ...(record.knowledgeAreas || []).slice(0, 8).map((item) => `  - "${item.replace(/"/g, "")}"`),
    `identifiers:`,
    `  - type: url`,
    `    value: "${recordUrl}"`,
    `    description: ARED persistent record URL`,
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** EndNote tagged format (.enw) */
export function toEndNote(record: ArchiveRecord): string {
  const { recordUrl, year, creator, title } = citationContext(record);
  return [
    "%0 Generic",
    `%T ${title}`,
    `%A ${creator}`,
    `%D ${year}`,
    `%I ${record.sourceName || "ARED"}`,
    `%U ${recordUrl}`,
    record.doi ? `%R ${record.doi}` : "",
    `%Z ARED record ${record.id}`,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Zotero RDF (simplified Bibliographic RDF importable by Zotero) */
export function toZoteroRdf(record: ArchiveRecord): string {
  const { recordUrl, year, creator, title } = citationContext(record);
  const itemId = `ared-${record.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF
 xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:bib="http://purl.org/net/biblio#"
 xmlns:foaf="http://xmlns.com/foaf/0.1/"
 xmlns:z="http://www.zotero.org/namespaces/export#">
  <bib:Document rdf:about="${recordUrl}">
    <z:itemType>document</z:itemType>
    <dc:title>${escapeXml(title)}</dc:title>
    <bib:authors>
      <rdf:Seq>
        <rdf:li>
          <foaf:Person>
            <foaf:name>${escapeXml(creator)}</foaf:name>
          </foaf:Person>
        </rdf:li>
      </rdf:Seq>
    </bib:authors>
    <dc:publisher>${escapeXml(record.sourceName || "ARED")}</dc:publisher>
    <dc:date>${escapeXml(year)}</dc:date>
    <dc:identifier>ARED:${escapeXml(record.id)}</dc:identifier>
    ${record.doi ? `<dcterms:identifier>DOI:${escapeXml(record.doi)}</dcterms:identifier>` : ""}
    <dc:description>${escapeXml(record.summary || record.description || "")}</dc:description>
    <dc:identifier rdf:resource="${recordUrl}"/>
    <z:key>${itemId}</z:key>
  </bib:Document>
</rdf:RDF>
`;
}

function escapeXml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
