import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/src/lib/auth";
import { searchGeminiScholarlySuggestions } from "@/lib/gemini-scholarly-suggestions";
import { SEARCH_DEFAULT_PAGE_SIZE, clampPageSize } from "@/lib/search-pagination";
import {
  searchScholarlySourceBundles,
  type ScholarlyIndexSource,
  type ScholarlySearchResult,
} from "@/lib/scholarly-search";

export const runtime = "nodejs";

function formatSourceSummary(counts: Partial<Record<ScholarlyIndexSource, number>>) {
  const parts = (Object.entries(counts) as Array<[ScholarlyIndexSource, number]>)
    .filter(([, count]) => count > 0)
    .map(([source, count]) => `${count} ${source}`);
  return parts.join(", ");
}

export async function POST(request: NextRequest) {
  try {
    await requireMember("/my/workbench");
  } catch {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  let body: {
    query?: string;
    limit?: number;
    localTitles?: string[];
    source?: string;
    cursor?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ ok: false, error: "Query is required." }, { status: 400 });
  }

  const pageSize = clampPageSize(Number(body.limit) || SEARCH_DEFAULT_PAGE_SIZE);
  const localTitles = Array.isArray(body.localTitles)
    ? body.localTitles.map((title) => String(title).trim()).filter(Boolean)
    : [];

  const warnings: string[] = [];
  if (process.env.NODE_ENV !== "production") {
    console.info("[scholarly-search] OpenAlex key configured:", Boolean(process.env.OPENALEX_API_KEY?.trim()));
  }

  const { bundles, warnings: bundleWarnings } = await searchScholarlySourceBundles(query, pageSize);
  warnings.push(...bundleWarnings);

  const indexResults: ScholarlySearchResult[] = [];
  const sourceSections: Record<string, unknown> = {};

  for (const [source, bundle] of Object.entries(bundles)) {
    if (!bundle) continue;
    sourceSections[source] = {
      source: bundle.source,
      query: bundle.query,
      count: bundle.count,
      displayedCount: bundle.displayedCount,
      nextCursor: bundle.nextCursor,
      nextOffset: bundle.nextOffset,
      results: bundle.results,
      error: bundle.error,
    };
    indexResults.push(...bundle.results);
  }

  const geminiBatch = await searchGeminiScholarlySuggestions(query, {
    excludeTitles: localTitles,
    maxSuggestions: 8,
  });
  if (geminiBatch.warning) warnings.push(geminiBatch.warning);

  const geminiResults = geminiBatch.results.filter(
    (item) => !localTitles.some((title) => title.toLowerCase() === item.title.toLowerCase()),
  );

  const indexKeys = new Set(
    indexResults.map((item) =>
      item.doi ? `doi:${item.doi.toLowerCase()}` : `title:${item.title.trim().toLowerCase()}`,
    ),
  );
  const uniqueGemini = geminiResults.filter((item) => {
    const key = item.doi
      ? `doi:${item.doi.toLowerCase()}`
      : `title:${item.title.trim().toLowerCase()}`;
    return !indexKeys.has(key);
  });

  if (uniqueGemini.length) {
    sourceSections.Gemini = {
      source: "Gemini",
      query,
      count: uniqueGemini.length,
      displayedCount: uniqueGemini.length,
      nextCursor: null,
      nextOffset: null,
      results: uniqueGemini,
      error: null,
    };
  }

  const results = [...indexResults, ...uniqueGemini];
  const uniqueWarnings = [...new Set(warnings)];

  const resultCounts: Partial<Record<ScholarlyIndexSource, number>> = {};
  for (const item of results) {
    resultCounts[item.source] = (resultCounts[item.source] ?? 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    query,
    searchQueries: [query, ...geminiBatch.webQueries].filter(Boolean),
    results,
    sourceSections,
    resultCounts,
    warnings: uniqueWarnings,
    explanation:
      results.length > 0
        ? `Found ${results.length} citable works (${formatSourceSummary(resultCounts)}). Open indexes return up to ${pageSize} results per source; use Load more where available.`
        : "No matching scholarly works were found. Try broader keywords or a paper title.",
  });
}
