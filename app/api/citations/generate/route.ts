import { NextResponse } from "next/server";
import { getCatalogueRecord } from "@/lib/catalogue/store";
import {
  generateCollectionCitation,
  type CitationStyleId,
} from "@/lib/research/citation-formats";
import {
  ghanaCatalogueResearchInput,
  type CollectionRecordResearchInput,
} from "@/lib/research/collection-record-research";

export const dynamic = "force-dynamic";

const VALID_STYLES = new Set<CitationStyleId>([
  "apa",
  "chicago",
  "mla",
  "harvard",
  "bibtex",
  "ris",
  "plain",
]);

function resolveInput(
  itemType: string,
  itemId: string,
): CollectionRecordResearchInput | null {
  if (itemType === "catalogue_record") {
    const record = getCatalogueRecord(itemId);
    if (!record?.publicVisibility) return null;
    return ghanaCatalogueResearchInput(record);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const itemType = String(body.itemType ?? "").trim();
    const itemId = String(body.itemId ?? "").trim();
    const citationStyle = String(body.citationStyle ?? "apa").trim() as CitationStyleId;

    if (!itemType || !itemId) {
      return NextResponse.json({ ok: false, error: "itemType and itemId are required" }, { status: 400 });
    }

    if (!VALID_STYLES.has(citationStyle)) {
      return NextResponse.json({ ok: false, error: "Unsupported citation style" }, { status: 400 });
    }

    const input = resolveInput(itemType, itemId);
    if (!input) {
      return NextResponse.json({ ok: false, error: "Record not found" }, { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const citation = generateCollectionCitation(input, citationStyle, origin);

    return NextResponse.json({ ok: true, citation, input });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not generate citation" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemType = searchParams.get("itemType") ?? "";
  const itemId = searchParams.get("itemId") ?? "";
  const citationStyle = (searchParams.get("citationStyle") ?? "apa") as CitationStyleId;

  if (!itemType || !itemId) {
    return NextResponse.json({ ok: false, error: "itemType and itemId are required" }, { status: 400 });
  }

  if (!VALID_STYLES.has(citationStyle)) {
    return NextResponse.json({ ok: false, error: "Unsupported citation style" }, { status: 400 });
  }

  const input = resolveInput(itemType, itemId);
  if (!input) {
    return NextResponse.json({ ok: false, error: "Record not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const citation = generateCollectionCitation(input, citationStyle, origin);

  return NextResponse.json({ ok: true, citation, input });
}
