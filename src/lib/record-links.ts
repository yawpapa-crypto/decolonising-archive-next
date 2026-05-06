export type RecordLinkInput = {
  id?: string | null;
  record_id?: string | null;
  related_record_id?: string | null;
  record_source_url?: string | null;
  source_url?: string | null;
  url?: string | null;
  record_url?: string | null;
  href?: string | null;
  record_metadata?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function metadataUrl(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata || typeof metadata !== "object") return "";

  return (
    clean(metadata.source_url) ||
    clean(metadata.sourceUrl) ||
    clean(metadata.url) ||
    clean(metadata.URL) ||
    clean(metadata.doi && `https://doi.org/${String(metadata.doi).replace(/^https?:\/\/doi\.org\//i, "")}`) ||
    clean(metadata.openalex_id) ||
    clean(metadata.openalexId)
  );
}

export function recordRouteId(recordId: string) {
  return recordId.replace(/-\d+$/, "");
}

export function getRecordHref(item: RecordLinkInput) {
  const external =
    clean(item.record_source_url) ||
    clean(item.source_url) ||
    clean(item.record_url) ||
    clean(item.url) ||
    clean(item.href) ||
    metadataUrl(item.record_metadata) ||
    metadataUrl(item.metadata);

  if (external) return external;

  const recordId =
    clean(item.record_id) ||
    clean(item.related_record_id) ||
    clean(item.id);

  if (recordId) {
    return `/records/${encodeURIComponent(recordRouteId(recordId))}`;
  }

  return null;
}

export function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

export function absoluteRecordUrl(item: RecordLinkInput, origin: string) {
  const href = getRecordHref(item);
  if (!href) return null;

  if (isExternalHref(href)) return href;

  return `${origin.replace(/\/$/, "")}${href.startsWith("/") ? href : `/${href}`}`;
}
