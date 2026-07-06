/** Strip upstream errors before returning to clients. */
export function safePublicError(error: unknown, fallback = "Request failed"): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message) return fallback;
  if (/api[_-]?key|secret|token|password|authorization/i.test(message)) {
    return fallback;
  }
  if (message.length > 160) return fallback;
  return message;
}

export const EXTERNAL_LINK_REL = "noopener noreferrer";

export function isSafeHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
