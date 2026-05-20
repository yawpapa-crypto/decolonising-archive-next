import { NextResponse } from "next/server";
import { listExtractionFields, createExtractionField } from "@/lib/workbench-review-actions";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  const res = await listExtractionFields(projectId);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, field } = body || {};
    if (!projectId || !field) return NextResponse.json({ ok: false, error: "projectId and field required" }, { status: 400 });
    const res = await createExtractionField(projectId, field);
    return NextResponse.json(res, { status: res.ok ? 201 : 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Invalid request" }, { status: 400 });
  }
}
