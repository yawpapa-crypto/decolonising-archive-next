import { NextResponse } from "next/server";
import { runKgoGraphql } from "@/lib/kgo/graphql";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  if (!query) {
    return NextResponse.json(
      {
        service: "ARED Knowledge Graph GraphQL",
        endpoint: "/api/kgo/graphql",
        example:
          "{ records(limit: 5) { id title url sameAs } entities(kind: \"knowledge\", limit: 10) { label url sameAs } }",
      },
      { headers: { "Cache-Control": "public, max-age=600" } },
    );
  }

  const result = await runKgoGraphql(query);
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    query?: string;
    variables?: Record<string, unknown>;
  };

  if (!body.query) {
    return NextResponse.json({ errors: [{ message: "Missing GraphQL query" }] }, { status: 400 });
  }

  const result = await runKgoGraphql(body.query, body.variables);
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
