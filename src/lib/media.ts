// Shared definitions for the curator media library — single source of truth
// for upload size caps, allowed MIME types, and human-readable copy. Both the
// route handler and the curator UI import from here so they never disagree.

export const MEDIA_BUCKET = "archive-media";

export type MediaKind = "image" | "pdf" | "audio" | "video";

export const MEDIA_KINDS: MediaKind[] = ["image", "pdf", "audio", "video"];

// Per-kind upload caps (bytes). Match these against the bucket-wide limit
// in supabase/migrations/0002_media.sql when changing.
export const MEDIA_LIMITS: Record<MediaKind, number> = {
  image: 10 * 1024 * 1024,    //  10 MB
  pdf:   20 * 1024 * 1024,    //  20 MB
  audio: 25 * 1024 * 1024,    //  25 MB
  video: 100 * 1024 * 1024,   // 100 MB
};

// Allowed MIME types per kind. Anything outside this list is rejected.
export const MEDIA_MIME_ALLOW: Record<MediaKind, readonly string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
  pdf:   ["application/pdf"],
  audio: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/x-m4a", "audio/flac"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/ogg"],
};

// Used for the file-input `accept` attribute and human-readable copy.
export const MEDIA_KIND_COPY: Record<
  MediaKind,
  { label: string; accept: string; sizeHint: string; mimeHint: string }
> = {
  image: {
    label: "Image",
    accept: "image/jpeg,image/png,image/webp,image/gif,image/avif",
    sizeHint: "Up to 10 MB",
    mimeHint: "JPG, PNG, WebP, GIF, AVIF",
  },
  pdf: {
    label: "PDF document",
    accept: "application/pdf,.pdf",
    sizeHint: "Up to 20 MB",
    mimeHint: "PDF only",
  },
  audio: {
    label: "Audio",
    accept: "audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/x-m4a,audio/flac,.mp3,.m4a,.wav,.ogg,.flac",
    sizeHint: "Up to 25 MB",
    mimeHint: "MP3, M4A, WAV, OGG, FLAC",
  },
  video: {
    label: "Video",
    accept: "video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.ogv",
    sizeHint: "Up to 100 MB",
    mimeHint: "MP4, WebM, MOV, OGV",
  },
};

export function isMediaKind(value: unknown): value is MediaKind {
  return typeof value === "string" && (MEDIA_KINDS as string[]).includes(value);
}

export type MediaValidationError =
  | { ok: false; field: "kind"; message: string }
  | { ok: false; field: "mime"; message: string }
  | { ok: false; field: "size"; message: string }
  | { ok: false; field: "title"; message: string };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export type ValidateMediaInput = {
  kind: unknown;
  mimeType: unknown;
  sizeBytes: unknown;
  title: unknown;
};

export type ValidateMediaResult =
  | {
      ok: true;
      kind: MediaKind;
      mimeType: string;
      sizeBytes: number;
      title: string;
    }
  | MediaValidationError;

export function validateMediaInput(
  input: ValidateMediaInput
): ValidateMediaResult {
  if (!isMediaKind(input.kind)) {
    return { ok: false, field: "kind", message: "Choose a media kind." };
  }
  const kind = input.kind;

  const mimeType = String(input.mimeType ?? "").trim().toLowerCase();
  if (!mimeType) {
    return { ok: false, field: "mime", message: "Missing MIME type." };
  }
  if (!MEDIA_MIME_ALLOW[kind].includes(mimeType)) {
    return {
      ok: false,
      field: "mime",
      message: `${MEDIA_KIND_COPY[kind].label} must be one of: ${MEDIA_KIND_COPY[kind].mimeHint}.`,
    };
  }

  const sizeBytes = Number(input.sizeBytes);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, field: "size", message: "File size is invalid." };
  }
  if (sizeBytes > MEDIA_LIMITS[kind]) {
    return {
      ok: false,
      field: "size",
      message: `File is ${formatBytes(sizeBytes)}. ${MEDIA_KIND_COPY[kind].label} files can be up to ${formatBytes(MEDIA_LIMITS[kind])}.`,
    };
  }

  const title = String(input.title ?? "").trim();
  if (!title) {
    return { ok: false, field: "title", message: "Title is required." };
  }
  if (title.length > 200) {
    return { ok: false, field: "title", message: "Title is too long (max 200 characters)." };
  }

  return { ok: true, kind, mimeType, sizeBytes, title };
}

// Build a deterministic but unique storage path for a file. We keep the
// original file name suffix for human readability but prefix with a UUID
// so two uploads of the same name don't collide.
export function buildMediaPath(opts: {
  kind: MediaKind;
  fileName: string;
  uuid: string;
}): string {
  const safe = opts.fileName
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  const stem = safe || "file";
  return `${opts.kind}/${opts.uuid}-${stem}`;
}
