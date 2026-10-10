import "server-only";
import { loadCatalogueRecords, loadCatalogueTaxonomy } from "@/lib/catalogue/store";
import { COMMUNITY_GROUPS, KNOWLEDGE_AREAS, RECORD_TYPES, REGIONS } from "@/lib/archive-metadata";
import { DIMENSIONS, emptyInterests, type Dimension, type InterestGroup, type Interests } from "./shared";

/** The real ARED taxonomy, grouped for the picker. Nothing here is invented. */
export function interestGroups(): InterestGroup[] {
  let tax: Array<{ taxonomyType: string; label: string }> = [];
  try {
    tax = loadCatalogueTaxonomy() as unknown as typeof tax;
  } catch {
    /* catalogue not built: those two groups simply stay empty */
  }
  const of = (t: string) => tax.filter((r) => r.taxonomyType === t).map((r) => r.label);
  const skip = /unknown|needs review|multiple/i;
  const groups: InterestGroup[] = [
    { dim: "visualSystems", label: "Visual systems", options: of("visual_system") },
    { dim: "knowledgeAreas", label: "Knowledge areas", options: [...KNOWLEDGE_AREAS] },
    { dim: "regions", label: "Regions", options: [...REGIONS] },
    { dim: "periods", label: "Periods", options: of("historical_period") },
    { dim: "communities", label: "Communities", options: COMMUNITY_GROUPS.filter((c) => !skip.test(c)) },
    { dim: "formats", label: "Formats", options: [...RECORD_TYPES] },
  ];
  return groups.filter((g) => g.options.length > 0);
}

/** Keep only values that exist in the taxonomy, so storage never holds arbitrary strings. */
export function sanitizeInterests(input: unknown): Interests {
  const out = emptyInterests();
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const groups = interestGroups();
  let total = 0;
  for (const g of groups) {
    const allowed = new Set(g.options);
    const arr = Array.isArray(src[g.dim]) ? (src[g.dim] as unknown[]) : [];
    for (const v of arr) {
      if (typeof v === "string" && allowed.has(v) && !out[g.dim].includes(v) && total < 40) {
        out[g.dim].push(v);
        total++;
      }
    }
  }
  if (typeof src.context === "string" && src.context.length <= 40) out.context = src.context;
  return out;
}

function topTerms(field: "visualSystemLabel" | "periodLabel", label: string): string[] {
  try {
    const rows = loadCatalogueRecords().filter((r) => r.publicVisibility && r[field] === label);
    const count = new Map<string, number>();
    for (const r of rows) {
      const tags = Array.isArray(r.tags) ? r.tags : [];
      for (const t of tags) {
        const k = String(t).trim().toLowerCase();
        if (k.length > 3) count.set(k, (count.get(k) ?? 0) + 1);
      }
      const c = String(r.communityOrCulture ?? "").split(",")[0]?.trim().toLowerCase();
      if (c && c.length > 3) count.set(c, (count.get(c) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([t]) => t);
  } catch {
    return [];
  }
}

export interface InterestTerm {
  term: string;
  label: string;
  dim: Dimension;
}

/** Turn structured choices into search terms. Each keeps the label the person actually chose. */
export function interestTerms(i: Interests): InterestTerm[] {
  const out: InterestTerm[] = [];
  const add = (term: string, label: string, dim: Dimension) => {
    const t = term.trim();
    if (t && !out.some((o) => o.term.toLowerCase() === t.toLowerCase())) out.push({ term: t, label, dim });
  };
  for (const dim of DIMENSIONS) {
    for (const label of i[dim] ?? []) {
      if (dim === "knowledgeAreas") add(label, label, dim);
      else if (dim === "regions") add(`${label.split("/").pop()?.trim() ?? label} design`, label, dim);
      else if (dim === "communities") add(`${label} art and design`, label, dim);
      else if (dim === "formats") add(`African ${label.split("/")[0].trim().toLowerCase()}`, label, dim);
      else {
        const field = dim === "visualSystems" ? "visualSystemLabel" : "periodLabel";
        const derived = topTerms(field, label);
        if (derived.length) derived.forEach((t) => add(t, label, dim));
        else add(label, label, dim);
      }
    }
  }
  return out;
}
