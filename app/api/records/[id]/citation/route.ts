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

import { generateCollectionCitation, type CitationStyleId } from "@/lib/research/citation-formats";
import { absoluteUrl } from "@/lib/kgo/site";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const record = await getPublicArchiveRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  const style = new URL(request.url).searchParams.get("style");
  if (style) {
    if (!["apa","chicago","mla","plain"].includes(style)) return NextResponse.json({error:"Unsupported citation style."},{status:400});
    return NextResponse.json(generateCollectionCitation({itemType:"library_record",itemId:record.id,collectionSlug:"archive",collectionTitle:"Decolonising Archive",title:record.title,creator:record.creator??null,date:record.datePublished||record.dateCreated||record.period?.[0]||null,recordType:record.recordType?.[0]??null,institution:record.sourceName,accession:record.identifier??null,sourceName:record.sourceName,sourceUrl:record.sourceUrl,canonicalPath:`/records/${encodeURIComponent(record.id)}`},style as CitationStyleId,absoluteUrl("")));
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
