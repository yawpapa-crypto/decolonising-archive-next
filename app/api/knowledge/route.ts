import { publicKnowledgeGraph } from "@/lib/knowledge/server";
import { connectedRecords } from "@/lib/knowledge/model";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const graph = await publicKnowledgeGraph();
  const id = new URL(request.url).searchParams.get("record");
  return Response.json(id ? { connections:connectedRecords(graph,id) } : graph,{headers:{"Cache-Control":"private, no-store"}});
}
