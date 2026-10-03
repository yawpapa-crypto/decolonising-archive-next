import { buildEntityIndex, entityPath, type EntityKind } from "@/lib/kgo/entities";
import { getPublicArchiveRecords, recordDescription } from "@/lib/kgo/records";
import { recordSameAsUrls } from "@/lib/kgo/sameAs";
import { absoluteUrl, SITE_NAME, SITE_URL, slugifyEntity } from "@/lib/kgo/site";

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

export async function buildKnowledgeGraph(): Promise<{
  generatedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}> {
  const records = await getPublicArchiveRecords();
  const entities = await buildEntityIndex();
  const nodes: GraphNode[] = [
    {
      id: "ared:platform",
      type: "WebSite",
      label: SITE_NAME,
      url: SITE_URL,
      description: "Decolonising Archive knowledge platform",
    },
  ];
  const edges: GraphEdge[] = [];
  const seenNodes = new Set<string>(["ared:platform"]);

  const addNode = (node: GraphNode) => {
    if (seenNodes.has(node.id)) return;
    seenNodes.add(node.id);
    nodes.push(node);
  };

  entities.forEach((entity) => {
    const id = `entity:${entity.kind}:${entity.slug}`;
    addNode({
      id,
      type: entity.kind,
      label: entity.label,
      url: absoluteUrl(entityPath(entity.kind, entity.slug)),
      description: entity.description,
      sameAs: entity.sameAs,
    });
    edges.push({ from: "ared:platform", to: id, relation: "indexes" });
  });

  records.forEach((record) => {
    const recordId = `record:${record.id}`;
    addNode({
      id: recordId,
      type: "CreativeWork",
      label: record.title,
      url: absoluteUrl(`/records/${record.id}`),
      description: recordDescription(record),
      sameAs: recordSameAsUrls(record),
    });
    edges.push({ from: "ared:platform", to: recordId, relation: "publishes" });

    const links: Array<[EntityKind, string[]]> = [
      ["knowledge", record.knowledgeAreas || []],
      ["community", record.communityOrCulturalGroup || []],
      ["language", record.language || []],
      ["region", record.region || []],
      ["country", record.country || []],
      ["source", record.sourceName ? [record.sourceName] : []],
    ];

    links.forEach(([kind, labels]) => {
      labels.forEach((label) => {
        const slug = slugifyEntity(label);
        if (!slug) return;
        const entityId = `entity:${kind}:${slug}`;
        edges.push({ from: recordId, to: entityId, relation: `has_${kind}` });
      });
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
  };
}

function turtleEscape(value: string): string {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

const TURTLE_IRI_UNSAFE = /[\u0000-\u0020<>"{}|^`\\]/;

function turtleIri(value: string): string | null {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return TURTLE_IRI_UNSAFE.test(url.href) ? null : `<${url.href}>`;
  } catch {
    return null;
  }
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
    const iri = turtleIri(node.url);
    if (!iri) return;
    const sameAs = (node.sameAs || [])
      .map((href) => turtleIri(href))
      .filter((href): href is string => Boolean(href));
    const props = [
      `a schema:${node.type === "CreativeWork" ? "CreativeWork" : "Thing"}`,
      `schema:name "${turtleEscape(node.label)}"`,
      node.description ? `schema:description "${turtleEscape(node.description)}"` : "",
      `dcterms:identifier "${turtleEscape(node.id)}"`,
      ...sameAs.map((href) => `owl:sameAs ${href}`),
    ].filter(Boolean);
    props.forEach((prop, index) => {
      const prefix = index === 0 ? `${iri} ` : "  ";
      const terminal = index === props.length - 1 ? " ." : " ;";
      lines.push(`${prefix}${prop}${terminal}`);
    });
    lines.push("");
  });

  graph.edges.forEach((edge) => {
    const from = graph.nodes.find((node) => node.id === edge.from);
    const to = graph.nodes.find((node) => node.id === edge.to);
    if (!from || !to) return;
    const fromIri = turtleIri(from.url);
    const toIri = turtleIri(to.url);
    if (!fromIri || !toIri) return;
    lines.push(`${fromIri} ared:${edge.relation} ${toIri} .`);
  });

  lines.push("");
  return lines.join("\n");
}
