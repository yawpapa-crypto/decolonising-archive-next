export const SITE_URL = "https://ared.design";
export const SITE_NAME = "Decolonising Archive";
export const SITE_SHORT = "ARED";
export const SITE_DESCRIPTION =
  "A public cultural knowledge platform for searching, citing and connecting decolonising knowledge across Africa, the diaspora and the Global South.";

export function absoluteUrl(path = "/"): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function slugifyEntity(value: string): string {
  return String(value || "")
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
