import type { ArchiveRecord } from "@/lib/archive-metadata";

export type NodeKind = "record" | "person" | "source" | "region" | "period" | "knowledge" | "concept" | "collection" | "user";
export type KnowledgeNode = { id: string; kind: NodeKind; label: string; url: string };
export type KnowledgeEdge = { from: string; to: string; relation: string; basis: "catalogue" | "curatorial"; evidence?: string };
export type KnowledgeGraph = { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] };
export type CuratorialCollection = { id: string; title: string; userId?: string; curator?: string; recordIds: string[] };
const clean = (s: string) => s.trim().replace(/\s+/g, " ");
const slug = (s:string) => s.normalize("NFKD").replace(/['’]/g, "").replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase();
const key = (s: string) => encodeURIComponent(clean(s).toLowerCase());

/** Catalogue assertions remain distinct from reviewed curatorial claims. Never pass private lists here. */
export function graphFromRecords(records: ArchiveRecord[], collections: CuratorialCollection[] = [], assertions: KnowledgeEdge[] = []): KnowledgeGraph {
  const nodes = new Map<string, KnowledgeNode>();
  const edges = new Map<string, KnowledgeEdge>();
  const addEdge = (edge: KnowledgeEdge) => edges.set(JSON.stringify([edge.from, edge.to, edge.relation]), edge);
  const valid = records.filter(r => r.published !== false && r.status !== "Draft");
  for (const record of valid) {
    const id = `record:${record.id}`;
    nodes.set(id, { id, kind: "record", label: record.title, url: `/records/${encodeURIComponent(record.id)}` });
    const groups: Array<[NodeKind, string[], string]> = [
      ["person", record.creator ? [record.creator] : [], "made_by"],
      ["source", record.sourceName ? [record.sourceName] : [], "documented_by"],
      ["region", record.region ?? [], "situated_in"],
      ["period", record.period ?? [], "dated_to"],
      ["knowledge", record.knowledgeAreas ?? [], "concerns"],
      ["concept", record.tags ?? [], "tagged_with"],
    ];
    for (const [kind, values, relation] of groups) for (const raw of values) {
      const label = clean(raw);
      if (!label || /^(unknown|unrecorded|not known|n\/a)$/i.test(label)) continue;
      const to = `${kind}:${key(label)}`;
      nodes.set(to, { id: to, kind, label, url: kind==="source" ? `/source/${slug(label)}` : kind==="region" ? `/region/${slug(label)}` : kind==="knowledge" ? `/knowledge-areas/${slug(label)}` : `/knowledge-graph?node=${encodeURIComponent(to)}` });
      addEdge({ from: id, to, relation, basis: "catalogue", evidence: record.sourceUrl || undefined });
    }
  }
  for (const collection of collections) {
    const id = `collection:${collection.id}`;
    nodes.set(id, { id, kind: "collection", label: collection.title, url: `/curated-collections/${encodeURIComponent(collection.id)}` });
    for (const recordId of collection.recordIds) if (nodes.has(`record:${recordId}`)) addEdge({ from: `record:${recordId}`, to: id, relation: "curated_in", basis: "curatorial" });
    // An owner UUID alone is not permission to expose a person. Only approved public projections supply curator.
    if (collection.userId && collection.curator) {
      const user = `user:${collection.userId}`;
      nodes.set(user, { id: user, kind: "user", label: collection.curator, url: `/people/${collection.userId}` });
      addEdge({ from: id, to: user, relation: "curated_by", basis: "curatorial" });
    }
  }
  for (const assertion of assertions) if (nodes.has(assertion.from) && nodes.has(assertion.to)) addEdge(assertion);
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

/** Explanations are paths through explicit edges, not an inferred historical claim. */
export function connectedRecords(graph: KnowledgeGraph, recordId: string, limit = 12) {
  const origin = `record:${recordId}`;
  const nodes = new Map(graph.nodes.map(n => [n.id, n]));
  const outgoing = graph.edges.filter(e => e.from === origin);
  const neighbors = new Map(outgoing.map(e => [e.to, e]));
  const results = new Map<string, { id: string; reasons: string[]; evidence: string[]; score: number }>();
  const weights: Record<string, number> = { person: 6, collection: 5, period: 4, concept: 3, knowledge: 2, source: 1, region: 1 };
  const add = (id: string, reason: string, weight: number, evidence?: string) => {
    if (id === recordId || !nodes.has(`record:${id}`)) return;
    const row = results.get(id) ?? { id, reasons: [], evidence: [], score: 0 };
    if (!row.reasons.includes(reason)) { row.reasons.push(reason); row.score += weight; }
    if (evidence && !row.evidence.includes(evidence)) row.evidence.push(evidence);
    results.set(id, row);
  };
  for (const edge of graph.edges) {
    if (edge.from.startsWith("record:") && neighbors.has(edge.to) && !edge.to.startsWith("record:")) {
      const shared = nodes.get(edge.to)!;
      add(edge.from.slice(7), `Shared ${shared.kind}: ${shared.label}`, weights[shared.kind] ?? 1, edge.evidence);
    }
    if (edge.from === origin && edge.to.startsWith("record:")) add(edge.to.slice(7), `Reviewed relationship: ${edge.relation.replaceAll("_", " ")}`, 8, edge.evidence);
    if (edge.to === origin && edge.from.startsWith("record:")) add(edge.from.slice(7), `Reviewed relationship: ${edge.relation.replaceAll("_", " ")}`, 8, edge.evidence);
  }
  return [...results.values()].sort((a,b) => b.score-a.score || a.id.localeCompare(b.id)).slice(0,limit);
}
