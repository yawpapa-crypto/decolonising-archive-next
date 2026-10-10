import type { DiscoverItem } from "./discover-shared";

type Raw = Record<string, unknown>;
const text = (v: unknown) => typeof v === "string" ? v.replace(/<[^>]*>/g, "").replace(/&amp;/g,"&").trim() : "";
function values(v: unknown): string[] {
  return [...new Set((Array.isArray(v) ? v : [v]).map(text).filter(Boolean))];
}
function language(v: unknown): string[] {
  if (!v || typeof v !== "object" || Array.isArray(v)) return [];
  const map = v as Raw;
  return values(map.en).length ? values(map.en) : [...new Set(Object.values(map).flatMap(values))];
}
export function resourceUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  try { const u = new URL(v); for (const key of [...u.searchParams.keys()]) if (/^(utm_|wskey$|api_key$)/i.test(key)) u.searchParams.delete(key); return /^https?:$/.test(u.protocol) && !u.username && !u.password ? u.href : undefined; } catch { return undefined; }
}
export function normaliseEuropeana(value: unknown): DiscoverItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as Raw;
  const id = text(r.id);
  const title = (language(r.dcTitleLangAware)[0] || values(r.title)[0]);
  if (!/^\/[\w.-]+\/.+/.test(id) || !title || r.previewNoDistribute === true || r.previewNoDistribute === "true") return null;
  // Existing archive policy: human remains must not become decorative discoveries.
  if (/\b(skull|cranium|crania|skeleton|bones?|remains|mortuary|burial|corpse|mummy|mummies)\b/i.test(title)) return null;
  const preview = values(r.edmPreview).map(resourceUrl).find(u => u?.startsWith("https:") && !/placeholder|no[-_]?image|image[-_]?unavailable/i.test(u));
  if (!preview) return null;
  const rights = values(r.rights);
  const dataProvider = values(r.dataProvider);
  const creators = language(r.dcCreatorLangAware).length ? language(r.dcCreatorLangAware) : values(r.dcCreator);
  const descriptions = language(r.dcDescriptionLangAware).length ? language(r.dcDescriptionLangAware) : values(r.dcDescription);
  const subjects = [...new Set([...language(r.dcSubjectLangAware),...values(r.dcSubject),...language(r.edmConceptPrefLabelLangAware)])];
  return {
    id: `europeana-${id}`, recordId: id, kind: "image", title,
    href: resourceUrl(r.guid) || `https://www.europeana.eu/item${id}`,
    external: true, image: preview, previewImage: preview, imageRole: "preview", alt: title,
    originalImage: values(r.edmIsShownBy).map(resourceUrl).find(Boolean),
    originalRecordUrl: values(r.edmIsShownAt).map(resourceUrl).find(Boolean),
    authors: creators.join("; ") || undefined,
    year: language(r.dcDateLangAware)[0] || language(r.dctermsCreatedLangAware)[0] || values(r.year)[0] || language(r.edmTimespanLabelLangAware)[0],
    abstract: descriptions.join(" · ") || undefined,
    source: "Europeana", institution: dataProvider.length ? dataProvider : undefined,
    dataProvider: dataProvider.length ? dataProvider : undefined,
    provider: values(r.provider).length ? values(r.provider) : undefined,
    country: values(r.country).length ? values(r.country) : undefined,
    subjects: subjects.length ? subjects : undefined,
    rights: rights.length ? rights : undefined, licence: rights[0],
    oa: rights.length ? rights.every(u => /^https?:\/\/(www\.)?creativecommons\.org\/(publicdomain\/(mark|zero)\/|licenses\/by(-sa)?\/)/i.test(u)) : undefined,
  };
}
export async function searchEuropeana(query: string, page: number, count: number, key: string, fetcher: typeof fetch = fetch, openOnly = false): Promise<DiscoverItem[]> {
  if (!key || !query.trim() || !Number.isFinite(count) || count < 1) return [];
  const rows = Math.min(40, Math.max(1, Math.floor(count)));
  const url = new URL("https://api.europeana.eu/record/search.json");
  for (const [k,v] of Object.entries({query:query.trim().slice(0,300),media:"true",thumbnail:"true",profile:"rich",rows:String(rows),start:String((Math.max(1,Math.min(500,Math.floor(page)||1))-1)*rows+1)})) url.searchParams.set(k,v);
  if (openOnly) url.searchParams.set("reusability", "open");
  try {
    const response = await fetcher(url, {headers:{Accept:"application/json", "X-Api-Key":key},signal:AbortSignal.timeout(6000), next:{revalidate:3600}} as RequestInit);
    if (!response.ok) return [];
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return [];
    const body=data as Raw;
    if (body.success === false || !Array.isArray(body.items)) return [];
    return body.items.flatMap(r => { const item=normaliseEuropeana(r);return item?[item]:[]; });
  } catch { return []; }
}
