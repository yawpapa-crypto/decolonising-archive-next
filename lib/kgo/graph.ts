import { absoluteUrl } from "@/lib/kgo/site";
import { publicKnowledgeGraph } from "@/lib/knowledge/server";

export type GraphNode = {
  id: string;
  type: string;
  label: string;
  url: string;
  description?: string;
  sameAs?: string[];
};

export type GraphEdge = {
  from: string;
  to: string;
  relation: string;
};

export async function buildKnowledgeGraph(): Promise<{generatedAt:string;nodes:GraphNode[];edges:GraphEdge[]}> {
  const graph=await publicKnowledgeGraph();
  const type:Record<string,string>={record:"CreativeWork",person:"Person",user:"Person",source:"Organization",collection:"Collection"};
  return {generatedAt:new Date().toISOString(),nodes:graph.nodes.map(node=>({id:node.id,type:type[node.kind]??"DefinedTerm",label:node.label,url:absoluteUrl(node.url)})),edges:graph.edges};
}

function turtleEscape(value: string): string {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

export async function buildKnowledgeGraphTurtle(): Promise<string> {
  const graph = await buildKnowledgeGraph();
  const lines = [
    "@prefix schema: <https://schema.org/> .",
    "@prefix dcterms: <http://purl.org/dc/terms/> .",
    "@prefix ared: <https://ared.design/vocab#> .",
    "@prefix owl: <http://www.w3.org/2002/07/owl#> .",
    "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .",
    "",
  ];

  graph.nodes.forEach((node) => {
    const iri = `<${node.url}>`;
    const props = [
      `a schema:${node.type}`,
      `schema:name "${turtleEscape(node.label)}"`,
      node.description ? `schema:description "${turtleEscape(node.description)}"` : "",
      `dcterms:identifier "${turtleEscape(node.id)}"`,
      ...(node.sameAs || []).map((href) => `owl:sameAs <${href}>`),
    ].filter(Boolean);
    props.forEach((prop, index) => {
      const prefix = index === 0 ? `${iri} ` : "  ";
      const terminal = index === props.length - 1 ? " ." : " ;";
      lines.push(`${prefix}${prop}${terminal}`);
    });
    lines.push("");
  });

  const nodesById=new Map(graph.nodes.map(node=>[node.id,node]));
  graph.edges.forEach((edge) => {
    const from = nodesById.get(edge.from);
    const to = nodesById.get(edge.to);
    if (!from || !to) return;
    lines.push(`<${from.url}> ared:${edge.relation} <${to.url}> .`);
  });

  lines.push("");
  return lines.join("\n");
}
