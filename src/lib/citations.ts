import type { ArchiveRecord } from "@/lib/records";

type CitationRecord = Partial<ArchiveRecord> &
  Record<string, unknown> & {
    recordUrl?: string;
    href?: string;
    record_title?: string | null;
    record_author?: string | null;
    record_source?: string | null;
    record_source_url?: string | null;
    record_year?: string | number | null;
    metadata?: Record<string, unknown> | null;
  };

type ReadingListExportList = {
  title: string;
  description?: string | null;
};

type ReadingListExportItem = {
  note?: string | null;
  record?: CitationRecord | null;
};

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function extractYear(value: unknown) {
  const text = firstText(value);
  if (!text) return "n.d.";
  const match = text.match(/\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/);
  return match ? match[1] : "n.d.";
}

export function safeExportFilename(title: string, extension: string) {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "reading-list";
  const ext = extension.replace(/^\./, "").replace(/[^a-z0-9]/gi, "");
  return `${base}-citations.${ext}`;
}

export function formatRecordCitation(record?: CitationRecord | null, style = "apa7") {
  if (!record) return "Record unavailable.";
  if (style !== "apa7") return formatRecordCitation(record, "apa7");

  // Best-effort citation generator based on available archive metadata.
  // This is not a full scholarly metadata parser; it safely falls back when
  // imported records have sparse or inconsistent fields.
  const metadata = asRecord(record.metadata);
  const author = firstText(
    record.author,
    record.creator,
    record.contributor,
    record.record_author,
    metadata.author,
    metadata.creator,
    metadata.contributor,
    "Unknown author",
  );
  const year = extractYear(
    record.year ??
      record.record_year ??
      record.date ??
      metadata.year ??
      metadata.date ??
      record.published_at ??
      record.created_at ??
      record.period,
  );
  const title = firstText(record.title, record.name, record.record_title, metadata.title, "Untitled record");
  const source = firstText(
    record.publisher,
    record.source_name,
    record.record_source,
    metadata.publisher,
    metadata.source,
    record.archive,
    record.collection,
    "Decolonising Archive",
  );
  const url = firstText(
    record.url,
    record.source_url,
    record.record_source_url,
    record.recordUrl,
    record.href,
    record.sourceUrl,
    metadata.url,
    metadata.source_url,
  );

  return [ `${author}. (${year}). ${title}. ${source}.`, url ].filter(Boolean).join(" ");
}

export function buildReadingListExportText(
  readingList: ReadingListExportList,
  items: ReadingListExportItem[],
  options: { style?: string; exportedAt?: Date } = {},
) {
  const style = options.style ?? "apa7";
  const exportedAt = options.exportedAt ?? new Date();
  const lines: string[] = [
    `Reading List: ${readingList.title}`,
  ];

  if (readingList.description) lines.push(`Description: ${readingList.description}`);
  lines.push("Exported from Decolonising Archive");
  lines.push(`Exported on ${exportedAt.toISOString().slice(0, 10)}`);
  lines.push("Citation style: APA 7");
  lines.push("");
  lines.push("Citations");
  lines.push("");

  if (!items.length) {
    lines.push("This reading list has no records to export yet.");
    return lines.join("\n");
  }

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${formatRecordCitation(item.record, style)}`);
  });

  lines.push("");
  lines.push("Records");
  lines.push("");

  items.forEach((item, index) => {
    const record = item.record;
    const metadata = asRecord(record?.metadata);
    if (!record) {
      lines.push(`${index + 1}. Record unavailable.`);
      lines.push("");
      return;
    }

    const title = firstText(record.title, record.name, record.record_title, metadata.title, "Untitled record");
    const type = firstText(record.type, "Unknown");
    const source = firstText(
      record.publisher,
      record.source_name,
      record.record_source,
      metadata.publisher,
      metadata.source,
      record.archive,
      record.collection,
      "Decolonising Archive",
    );
    const url = firstText(
      record.url,
      record.source_url,
      record.record_source_url,
      record.recordUrl,
      record.href,
      record.sourceUrl,
      metadata.url,
      metadata.source_url,
    );

    lines.push(`${index + 1}. ${title}`);
    lines.push(`   Type: ${type}`);
    lines.push(`   Source: ${source}`);
    if (url) lines.push(`   URL: ${url}`);
    if (item.note) lines.push(`   Note: ${item.note}`);
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}
