export type Edition = {
  introduction: string; rationale: string; prompts: string;
  sections: Array<{ title: string; recordIds: string[] }>;
  annotations: Record<string, string>;
  relationships: Array<{ from: string; to: string; note: string }>;
};
export const blankEdition = (): Edition => ({ introduction:"", rationale:"", prompts:"", sections:[], annotations:{}, relationships:[] });
/** Restrict curatorial writing to records that actually belong to this collection. */
export function cleanEdition(input: unknown, recordIds: string[]): Edition {
  const src = (input && typeof input === "object" ? input : {}) as Partial<Edition>;
  const ids = new Set(recordIds);
  const text = (value:unknown, limit=6000) => typeof value === "string" ? value.trim().slice(0,limit) : "";
  return {
    introduction:text(src.introduction), rationale:text(src.rationale), prompts:text(src.prompts),
    sections:Array.isArray(src.sections) ? src.sections.slice(0,30).map(s => ({title:text(s?.title,120),recordIds:[...new Set(Array.isArray(s?.recordIds) ? s.recordIds.filter(id=>ids.has(id)) : [])]})).filter(s=>s.title) : [],
    annotations:Object.fromEntries(Object.entries(src.annotations ?? {}).filter(([id])=>ids.has(id)).map(([id,note])=>[id,text(note,3000)])),
    relationships:Array.isArray(src.relationships) ? src.relationships.slice(0,100).filter(r=>ids.has(r?.from)&&ids.has(r?.to)&&r.from!==r.to).map(r=>({from:r.from,to:r.to,note:text(r.note,2000)})) : [],
  };
}
