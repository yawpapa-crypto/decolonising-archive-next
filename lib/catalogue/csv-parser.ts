/**
 * RFC-style CSV parser with BOM handling and quoted fields.
 */

export function parseCsv(content: string): Record<string, string>[] {
  const text = content.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    return obj;
  });
}

export function parseTags(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[;,|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function parseLinkedIds(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[;,|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function parseCommunityRequired(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === "yes" || v === "true" || v.startsWith("yes,") || v.includes("where applicable");
}

/** First 50 seed records in the master catalogue use ARED-GH-00001 … ARED-GH-00050 */
export function isSeedRecord(recordId: string): boolean {
  const match = recordId.match(/^ARED-GH-(\d+)$/);
  if (!match) return false;
  const num = parseInt(match[1], 10);
  return num >= 1 && num <= 50;
}

export function initialEvidenceStatus(recordId: string): "source_located" | "research_lead" {
  return isSeedRecord(recordId) ? "source_located" : "research_lead";
}
