import { NextResponse } from "next/server";
import { buildKnowledgeGraph } from "@/lib/kgo/graph";

export async function GET() {
  const graph = await buildKnowledgeGraph();
  return NextResponse.json(graph, {
    headers: {
      "Cache-Control": "public, max-age=1800",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
