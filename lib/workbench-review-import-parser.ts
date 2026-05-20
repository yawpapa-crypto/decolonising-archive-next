export type ParsedBibliographicRecord = {
  title: string;
  authors?: string | null;
  year?: string | null;
  doi?: string | null;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  abstract?: string | null;
  recordType?: string | null;
  raw?: Record<string, unknown>;
};

export type BibliographicFileFormat = "ris" | "bibtex" | "endnote_xml" | "csv" | "unknown";

function normalizeLine(value: string) {
  return value.replace(/\r/g, "").trim();
}

function recordIdFromParsed(record: ParsedBibliographicRecord, index: number) {
  if (record.doi?.trim()) {
    return `import-doi-${record.doi.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }
  const slug = record.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return slug ? `import-${slug}-${index + 1}` : `import-record-${index + 1}`;
}

export function detectBibliographicFormat(filename: string, content: string): BibliographicFileFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".ris")) return "ris";
  if (lower.endsWith(".bib") || lower.endsWith(".bibtex")) return "bibtex";
  if (lower.endsWith(".xml")) return "endnote_xml";
  if (lower.endsWith(".csv")) return "csv";

  const trimmed = content.trim();
  if (trimmed.startsWith("<")) return "endnote_xml";
  if (/^TY\s+-/m.test(trimmed)) return "ris";
  if (/^@\w+\s*\{/m.test(trimmed)) return "bibtex";
  if (trimmed.includes(",") && trimmed.split("\n")[0]?.includes(",")) return "csv";
  return "unknown";
}

function parseRis(content: string): ParsedBibliographicRecord[] {
  const blocks = content.split(/\n(?=TY\s+-)/).filter((block) => /TY\s+-/.test(block));
  const records: ParsedBibliographicRecord[] = [];
  blocks.forEach((block) => {
    const lines = block.split("\n").map(normalizeLine).filter(Boolean);
    const fields = new Map<string, string[]>();
    lines.forEach((line) => {
      const match = line.match(/^([A-Z0-9]{2})\s+-\s+(.*)$/);
      if (!match) return;
      const key = match[1];
      const value = match[2].trim();
      const bucket = fields.get(key) ?? [];
      bucket.push(value);
      fields.set(key, bucket);
    });
    const title = fields.get("TI")?.[0] ?? fields.get("T1")?.[0] ?? "";
    if (!title) return;
    records.push({
      title,
      authors: (fields.get("AU") ?? fields.get("A1") ?? []).join("; ") || null,
      year: fields.get("PY")?.[0] ?? fields.get("Y1")?.[0] ?? null,
      doi: fields.get("DO")?.[0] ?? null,
      sourceUrl: fields.get("UR")?.[0] ?? fields.get("LK")?.[0] ?? null,
      sourceLabel: fields.get("JO")?.[0] ?? fields.get("T2")?.[0] ?? fields.get("DB")?.[0] ?? null,
      abstract: fields.get("AB")?.[0] ?? fields.get("N2")?.[0] ?? null,
      recordType: fields.get("TY")?.[0] ?? null,
      raw: Object.fromEntries(fields.entries()),
    });
  });
  return records;
}

function parseBibtex(content: string): ParsedBibliographicRecord[] {
  const entries = content.match(/@\w+\s*\{[\s\S]*?\n\}/g) ?? [];
  const records: ParsedBibliographicRecord[] = [];
  entries.forEach((entry) => {
    const title = entry.match(/title\s*=\s[{"]([^"}]+)[}"]/i)?.[1]?.trim();
    if (!title) return;
    const authors =
      entry.match(/author\s*=\s[{"]([^"}]+)[}"]/i)?.[1]?.replace(/\s+and\s+/gi, "; ") ?? null;
    records.push({
      title,
      authors,
      year: entry.match(/year\s*=\s[{"]([^"}]+)[}"]/i)?.[1] ?? null,
      doi: entry.match(/doi\s*=\s[{"]([^"}]+)[}"]/i)?.[1] ?? null,
      sourceUrl: entry.match(/url\s*=\s[{"]([^"}]+)[}"]/i)?.[1] ?? null,
      sourceLabel: entry.match(/journal\s*=\s[{"]([^"}]+)[}"]/i)?.[1] ?? null,
      abstract: entry.match(/abstract\s*=\s[{"]([^"}]+)[}"]/i)?.[1] ?? null,
      recordType: entry.match(/^@(\w+)/)?.[1] ?? null,
    });
  });
  return records;
}

function parseEndnoteXml(content: string): ParsedBibliographicRecord[] {
  const recordsXml = content.match(/<record[\s\S]*?<\/record>/gi) ?? [];
  const records: ParsedBibliographicRecord[] = [];
  recordsXml.forEach((recordXml) => {
    const pick = (tag: string) =>
      recordXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1]?.trim() ?? null;
    const title = pick("title") ?? pick("titles") ?? "";
    if (!title) return;
    const authors =
      [...recordXml.matchAll(/<author[^>]*>([\s\S]*?)<\/author>/gi)]
        .map((match) => match[1]?.trim())
        .filter(Boolean)
        .join("; ") || null;
    records.push({
      title,
      authors,
      year: pick("year") ?? pick("dates") ?? null,
      doi: pick("electronic-resource-num") ?? pick("doi") ?? null,
      sourceUrl: pick("url") ?? pick("electronic-resource-num") ?? null,
      sourceLabel: pick("secondary-title") ?? pick("publisher") ?? null,
      abstract: pick("abstract") ?? null,
      recordType: pick("ref-type") ?? null,
    });
  });
  return records;
}

function parseCsv(content: string): ParsedBibliographicRecord[] {
  const lines = content.split("\n").map(normalizeLine).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const titleIndex = headers.findIndex((header) => /title|name/.test(header));
  if (titleIndex < 0) return [];

  const indexFor = (pattern: RegExp) => headers.findIndex((header) => pattern.test(header));
  const records: ParsedBibliographicRecord[] = [];

  lines.slice(1).forEach((line) => {
    const cells = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const title = cells[titleIndex] ?? "";
    if (!title) return;
    const authorsIndex = indexFor(/author/);
    const yearIndex = indexFor(/year|date/);
    const doiIndex = indexFor(/doi/);
    const urlIndex = indexFor(/url|link/);
    const sourceIndex = indexFor(/source|journal|database/);
    const abstractIndex = indexFor(/abstract/);
    records.push({
      title,
      authors: authorsIndex >= 0 ? cells[authorsIndex] ?? null : null,
      year: yearIndex >= 0 ? cells[yearIndex] ?? null : null,
      doi: doiIndex >= 0 ? cells[doiIndex] ?? null : null,
      sourceUrl: urlIndex >= 0 ? cells[urlIndex] ?? null : null,
      sourceLabel: sourceIndex >= 0 ? cells[sourceIndex] ?? null : null,
      abstract: abstractIndex >= 0 ? cells[abstractIndex] ?? null : null,
      recordType: "csv",
    });
  });
  return records;
}

export function parseBibliographicFile(content: string, format: BibliographicFileFormat) {
  switch (format) {
    case "ris":
      return parseRis(content);
    case "bibtex":
      return parseBibtex(content);
    case "endnote_xml":
      return parseEndnoteXml(content);
    case "csv":
      return parseCsv(content);
    default:
      return [];
  }
}

export function parsedRecordsWithIds(records: ParsedBibliographicRecord[]) {
  return records.map((record, index) => ({
    ...record,
    recordId: recordIdFromParsed(record, index),
  }));
}
