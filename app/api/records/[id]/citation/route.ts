import { NextResponse } from "next/server";
import {
  toBibTeX,
  toCFF,
  toCslJson,
  toEndNote,
  toRIS,
  toZoteroRdf,
} from "@/lib/kgo/citations";
import { getPublicArchiveRecord } from "@/lib/kgo/records";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const record = await getPublicArchiveRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const format = (new URL(request.url).searchParams.get("format") || "bibtex").toLowerCase();

  if (format === "ris") {
    return new NextResponse(toRIS(record), {
      headers: {
        "Content-Type": "application/x-research-info-systems; charset=utf-8",
        "Content-Disposition": `attachment; filename="${record.id}.ris"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  if (format === "csl" || format === "json") {
    return NextResponse.json(toCslJson(record), {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  if (format === "cff" || format === "citation-cff") {
    return new NextResponse(toCFF(record), {
      headers: {
        "Content-Type": "text/yaml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${record.id}.cff"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  if (format === "endnote" || format === "enw") {
    return new NextResponse(toEndNote(record), {
      headers: {
        "Content-Type": "application/x-endnote-refer; charset=utf-8",
        "Content-Disposition": `attachment; filename="${record.id}.enw"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  if (format === "zotero" || format === "zotero-rdf" || format === "rdf") {
    return new NextResponse(toZoteroRdf(record), {
      headers: {
        "Content-Type": "application/rdf+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${record.id}.rdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return new NextResponse(toBibTeX(record), {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${record.id}.bib"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
