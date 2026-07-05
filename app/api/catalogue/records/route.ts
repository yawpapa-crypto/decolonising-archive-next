import { NextResponse } from "next/server";
import { resolveServerRecordImage } from "@/lib/catalogue/record-image-server";
import {
  catalogueDataExists,
  computeCatalogueStats,
  filterCatalogueRecords,
} from "@/lib/catalogue/store";
import type { CatalogueFilterParams, EvidenceStatus } from "@/lib/catalogue/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!catalogueDataExists()) {
    return NextResponse.json(
      {
        error: "Catalogue not imported",
        hint: "Run: npx tsx scripts/extract-object-catalogue.ts && npx tsx scripts/import-ghana-research-catalogue.ts",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const evidenceParam = searchParams.get("evidenceStatus");
  const evidenceStatuses = evidenceParam
    ? (evidenceParam.split(",").filter(Boolean) as EvidenceStatus[])
    : undefined;

  const result = filterCatalogueRecords({
    q: searchParams.get("q") ?? undefined,
    ghanaFilter: searchParams.get("ghanaFilter") ?? undefined,
    subcollectionId: searchParams.get("subcollectionId") ?? undefined,
    evidenceStatus: evidenceStatuses?.length === 1 ? evidenceStatuses[0] : evidenceStatuses,
    periodId: searchParams.get("periodId") ?? undefined,
    visualSystemId: searchParams.get("visualSystemId") ?? undefined,
    region: searchParams.get("region") ?? undefined,
    locality: searchParams.get("locality") ?? undefined,
    recordType: searchParams.get("recordType") ?? undefined,
    creator: searchParams.get("creator") ?? undefined,
    institution: searchParams.get("institution") ?? undefined,
    rightsStatus: searchParams.get("rightsStatus") ?? undefined,
    communityReview: searchParams.get("communityReview") === "true",
    page: parseInt(searchParams.get("page") ?? "1", 10),
    limit: parseInt(searchParams.get("limit") ?? "24", 10),
    sort: (searchParams.get("sort") as CatalogueFilterParams["sort"]) ?? "newest",
  });

  const stats = computeCatalogueStats();

  const items = result.items.map((record) => {
    const image = resolveServerRecordImage(record);
    return {
      ...record,
      thumbnailUrl: image.access === "display" ? image.url : null,
    };
  });

  return NextResponse.json({
    ...result,
    items,
    stats,
    buildId: stats.buildId,
  });
}
