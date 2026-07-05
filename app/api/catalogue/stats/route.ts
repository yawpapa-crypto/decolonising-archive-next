import { NextResponse } from "next/server";
import {
  catalogueDataExists,
  computeCatalogueStats,
  loadCatalogueTaxonomy,
} from "@/lib/catalogue/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!catalogueDataExists()) {
    return NextResponse.json(
      {
        imported: false,
        hint: "Run: npx tsx scripts/import-ghana-research-catalogue.ts",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    imported: true,
    stats: computeCatalogueStats(),
    taxonomy: loadCatalogueTaxonomy(),
  });
}
