import { NextResponse } from "next/server";
import { buildKnowledgeGraphTurtle } from "@/lib/kgo/graph";

export async function GET() {
  const turtle = await buildKnowledgeGraphTurtle();
  return new NextResponse(turtle, {
    headers: {
      "Content-Type": "text/turtle; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
