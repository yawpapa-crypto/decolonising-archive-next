import { NextRequest, NextResponse } from "next/server";
import { ARCHIVE_IMAGE_HOSTS } from "@/lib/home/cached-image";

export const runtime = "nodejs";

/** Public archive images only. Supply an identifiable agent to institutions
 * that reject anonymous image optimizers, and retain successful bytes in the
 * server data cache. No cookies, credentials, or arbitrary hosts are forwarded.
 */
export async function GET(request: NextRequest) {
  let url: URL;
  try { url = new URL(request.nextUrl.searchParams.get("url") ?? ""); }
  catch { return new NextResponse("Invalid image", { status: 400 }); }
  if (url.protocol !== "https:" || !ARCHIVE_IMAGE_HOSTS.has(url.hostname) || url.username || url.password || url.port) {
    return new NextResponse("Image source not allowed", { status: 400 });
  }
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ARED/1.0 (archive image display; https://ared.design)", Referer: url.origin + "/" },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    });
    const type = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !/^image\/(jpeg|png|webp|gif|avif)$/.test(type)) {
      return new NextResponse("Archive image unavailable", { status: 502 });
    }
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 2 * 1024 * 1024) return new NextResponse("Image too large", { status: 413 });
    return new NextResponse(bytes, { headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new NextResponse("Archive image temporarily unavailable", { status: 502 });
  }
}
