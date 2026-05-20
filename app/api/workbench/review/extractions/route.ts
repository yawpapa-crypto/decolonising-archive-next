import { NextResponse } from "next/server";
import { listExtractions, upsertExtraction } from "@/lib/workbench-review-actions";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const recordId = url.searchParams.get("recordId") || undefined;
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  const res = await listExtractions(projectId, recordId);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, fieldId, recordId, value } = body || {};
    if (!projectId || !fieldId || !recordId) return NextResponse.json({ ok: false, error: "projectId, fieldId and recordId required" }, { status: 400 });
    const res = await upsertExtraction(projectId, fieldId, recordId, value);
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Invalid request" }, { status: 400 });
  }
}
