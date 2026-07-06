export function normalizeNoteTitle(title: string) {
  const trimmed = title.trim();
  return (trimmed || "Untitled note").slice(0, 240);
}

export function countWords(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return 0;
  return normalized.split(" ").length;
}

export function countCharacters(text: string) {
  return text.length;
}

/** Strip HTML to plain text for search/preview fields. */
export function htmlToPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function noteMetricsFromEditor(plainText: string) {
  return {
    plain_text: plainText,
    word_count: countWords(plainText),
    character_count: countCharacters(plainText),
  };
}

const DEFAULT_NOTE_TITLES = new Set(["", "untitled note"]);

export function isDefaultNoteTitle(title: string) {
  return DEFAULT_NOTE_TITLES.has(title.trim().toLowerCase());
}

export function isNoteContentEmpty(plainText: string, contentHtml?: string) {
  if (plainText.trim().length > 0) return false;
  if (!contentHtml) return true;
  const stripped = htmlToPlainText(contentHtml);
  return stripped.length === 0;
}

export function deriveNoteTitleFromPlainText(plainText: string) {
  const words = plainText.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "Untitled note";
  const phrase = words.slice(0, 8).join(" ");
  return phrase.slice(0, 70);
}

export function shouldAutoGenerateNoteTitle(
  title: string,
  titleWasEdited: boolean,
  plainText: string,
) {
  if (titleWasEdited) return false;
  if (!isDefaultNoteTitle(title)) return false;
  return plainText.trim().length > 0;
}

export function readingMinutesFromWordCount(wordCount: number) {
  if (wordCount <= 0) return 0;
  return Math.max(1, Math.ceil(wordCount / 220));
}

export function formatNoteUpdated(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}
