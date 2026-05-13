import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/src/lib/auth";
import { getWorkbenchProjectBundle } from "@/lib/workbench-data";
import { readRecords } from "@/lib/records";
import {
  exportAnnotatedBibliographyMarkdown,
  exportCitationsPlainText,
  exportProjectRecordsCsv,
  exportProjectRecordsJson,
} from "@/lib/workbench-export";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId")?.trim();
  const format = (request.nextUrl.searchParams.get("format") ?? "txt").trim().toLowerCase();

  if (!projectId) {
    return NextResponse.json({ ok: false, error: "Missing projectId." }, { status: 400 });
  }

  const bundle = await getWorkbenchProjectBundle(projectId);
  if (!bundle.ok || !bundle.project) {
    return NextResponse.json({ ok: false, error: bundle.error ?? "Not found." }, { status: 404 });
  }

  const published = (await readRecords()).filter((r) => r.published);
  const archiveById = new Map(published.map((r) => [r.id, r]));

  const ctx = {
    project: bundle.project,
    records: bundle.records,
    archiveById,
  };

  const safeTitle = bundle.project.title.replace(/[^\w\-]+/g, "_").slice(0, 60);

  if (format === "txt") {
    const body = exportCitationsPlainText(ctx);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}-citations.txt"`,
      },
    });
  }

  if (format === "md") {
    const body = exportAnnotatedBibliographyMarkdown(ctx);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}-bibliography.md"`,
      },
    });
  }

  if (format === "csv") {
    const body = exportProjectRecordsCsv(ctx);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}-records.csv"`,
      },
    });
  }

  if (format === "json") {
    const body = exportProjectRecordsJson(ctx);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}-records.json"`,
      },
    });
  }

  return NextResponse.json({ ok: false, error: "Unknown format." }, { status: 400 });
}
