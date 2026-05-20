import { NextResponse } from "next/server";
import { listReviewScreenings, updateReviewScreening } from "@/lib/workbench-review-actions";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  const res = await listReviewScreenings(projectId);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, recordId, screeningStatus, exclusionReason, notes } = body || {};
    if (!projectId || !recordId || !screeningStatus) return NextResponse.json({ ok: false, error: "projectId, recordId and screeningStatus required" }, { status: 400 });
    const res = await updateReviewScreening({ projectId, recordId, screeningStatus, exclusionReason, notes });
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Invalid request" }, { status: 400 });
  }
}
