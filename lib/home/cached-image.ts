/** Cache public archive images; preserve Unsplash API hotlinking on its CDN. */
export const ARCHIVE_IMAGE_HOSTS = new Set([
  "openaccess-cdn.clevelandart.org", "www.artic.edu", "ids.si.edu", "images.metmuseum.org",
  "collectionapi.metmuseum.org", "api.europeana.eu", "upload.wikimedia.org",
  "tile.loc.gov", "cdn.loc.gov",
]);

export function cachedImageSrc(src: string): string {
  try {
    const url = new URL(src);
    if (url.pathname.toLowerCase().endsWith(".svg")) return src;
    if (url.protocol !== "https:" || !ARCHIVE_IMAGE_HOSTS.has(url.hostname) || url.username || url.password) return src;
    return `/api/archive-image?url=${encodeURIComponent(src)}`;
  } catch {
    return src;
  }
}
