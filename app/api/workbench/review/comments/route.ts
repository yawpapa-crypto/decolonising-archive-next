import { NextResponse } from "next/server";
import { addReviewComment, listReviewComments } from "@/lib/workbench-review-actions";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const recordId = url.searchParams.get("recordId") || undefined;
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  const res = await listReviewComments(projectId, recordId);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, recordId, body: text, parentId } = body || {};
    if (!projectId || !recordId || !text) return NextResponse.json({ ok: false, error: "projectId, recordId and body required" }, { status: 400 });
    const res = await addReviewComment(projectId, recordId, text, parentId);
    return NextResponse.json(res, { status: res.ok ? 201 : 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Invalid request" }, { status: 400 });
  }
}
