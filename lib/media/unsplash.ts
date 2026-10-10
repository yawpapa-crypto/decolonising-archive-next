import "server-only";
import { unstable_cache } from "next/cache";

export type EditorialPhoto = {
  id: string; src: string; alt: string; photographer: string; credit: string;
  page: string; downloadLocation: string;
};
export const UNSPLASH_REFERRAL = "utm_source=decolonising_archive&utm_medium=referral";

/** Preserve all API parameters, including ixid, when adding sizing parameters. */
export function resizeUnsplash(src: string, width: number) {
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  return url.toString();
}

/** Only accept download endpoints issued by Unsplash; credentials never go elsewhere. */
export async function trackPhotoUse(downloadLocation: string): Promise<boolean> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return false;
  try {
    const url = new URL(downloadLocation);
    if (url.protocol !== "https:" || url.hostname !== "api.unsplash.com" || !/^\/photos\/[\w-]+\/download$/.test(url.pathname)) return false;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, cache: "no-store", signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch { return false; }
}

/** A cached editorial selection triggers one use event, never one per page impression.
 * This project does not enable Cache Components, so its existing data-cache API applies.
 * Cache successful selections indefinitely; no credentials are returned to the client.
 */
const selectPhoto = unstable_cache(async (query: string): Promise<EditorialPhoto> => {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new Error("Unsplash is not configured");
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("content_filter", "high");
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error("Unsplash search unavailable");
  const data = await res.json();
  const photo = data.results?.[0];
  if (!photo?.urls?.regular || !photo?.user?.links?.html || !photo?.links?.download_location) throw new Error("Incomplete photo response");
  // Report the use, but never discard a good photo because the report call failed or was rate limited.
  void trackPhotoUse(photo.links.download_location);
  return {
    id: photo.id, src: photo.urls.regular, alt: photo.alt_description || query,
    photographer: photo.user.name,
    credit: `${photo.user.links.html}?${UNSPLASH_REFERRAL}`,
    page: `${photo.links.html}?${UNSPLASH_REFERRAL}`,
    downloadLocation: photo.links.download_location,
  };
}, ["ared-editorial-selection-v2"], { revalidate: false });

export async function editorialPhoto(query: string): Promise<EditorialPhoto | null> {
  try { return await selectPhoto(query); } catch { return null; }
}
