import { NextResponse } from "next/server";
import { exportCitation, getRecordDetail } from "@/lib/records/record-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ recordId: string }> };

/**
 * GET /api/v1/records/{recordId}
 * Canonical record detail (contract v1). `recordId` is an AR/D catalogue ID or a namespaced
 * live-provider reference (`cr-`, `oa-`, `ol-`, `s2-`, `wc-`, `europeana-`). `?format=ris|bibtex` returns an export file.
 */
export async function GET(request: Request, { params }: Params) {
  const { recordId } = await params;
  let id = recordId;
  try { id = decodeURIComponent(recordId); } catch { /* keep raw */ }
  const detail = await getRecordDetail(id);
  if ("error" in detail) {
    return NextResponse.json({ error: detail.error, code: detail.code }, { status: detail.status, headers: { "Cache-Control": "no-store" } });
  }
  const format = new URL(request.url).searchParams.get("format");
  if (format === "ris" || format === "bibtex") {
    const body = exportCitation(detail, format);
    const safe = detail.id.replace(/[^a-z0-9._-]+/gi, "-").slice(0, 80);
    return new NextResponse(body, {
      headers: {
        "Content-Type": format === "ris" ? "application/x-research-info-systems; charset=utf-8" : "application/x-bibtex; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safe}.${format === "ris" ? "ris" : "bib"}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
  if (format) return NextResponse.json({ error: "Unsupported export format", code: "invalid_reference" }, { status: 400 });
  return NextResponse.json(detail, {
    headers: { "Cache-Control": detail.origin === "catalogue" ? "public, max-age=300, stale-while-revalidate=3600" : "public, max-age=600" },
  });
}
