import { NextResponse } from "next/server";
import { getPublicArchiveRecords } from "@/lib/kgo/records";

export const revalidate = 600;

type Kind = "Topic" | "Place" | "Maker" | "Record" | "Search";
type Entry = { text: string; kind: Kind; weight: number };

const IDEAS = ["goldweights", "kente cloth", "adinkra", "Asante", "Yoruba", "manuscripts", "Benin bronzes", "oral literature", "protest posters", "typography", "textiles", "architecture", "photography", "Ghana graphic design", "Akan", "Igbo", "decolonising design", "African archives"];

let index: Entry[] | null = null;
async function build(): Promise<Entry[]> {
  if (index) return index;
  const map = new Map<string, Entry>();
  const add = (raw: unknown, kind: Kind, weight: number) => {
    const list = Array.isArray(raw) ? raw : [raw];
    for (const r of list) {
      const t = String(r ?? "").replace(/\s+/g, " ").trim();
      if (t.length < 2 || t.length > 90) continue;
      const k = t.toLowerCase();
      const prev = map.get(k);
      if (prev) prev.weight += weight; else map.set(k, { text: t, kind, weight });
    }
  };
  IDEAS.forEach((i) => add(i, "Search", 5));
  try {
    const records = await getPublicArchiveRecords();
    for (const r of records as Array<Record<string, unknown>>) {
      add(r.title, "Record", 2);
      add(r.creator, "Maker", 3);
      add(r.knowledgeAreas, "Topic", 4);
      add(r.tags, "Topic", 3);
      add(r.communityOrCulturalGroup, "Topic", 3);
      add(r.country, "Place", 3); add(r.region, "Place", 3);
      add(r.geography, "Place", 2);
    }
  } catch { /* the built-in ideas still work */ }
  index = Array.from(map.values());
  return index;
}

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").slice(0, 80).trim();
  const headers = { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" };
  if (q.length < 1) return NextResponse.json({ q, items: [] }, { headers });
  const f = fold(q);
  const idx = await build();
  const scored: Array<Entry & { s: number }> = [];
  for (const e of idx) {
    const t = fold(e.text);
    let s = 0;
    if (t === f) s = 0; // the exact thing is already in the box
    else if (t.startsWith(f)) s = 100;
    else if (t.split(/[\s\-–—,:;()]+/).some((w) => w.startsWith(f))) s = 60;
    else if (f.length >= 3 && t.includes(f)) s = 30;
    if (s) scored.push({ ...e, s: s + e.weight - Math.min(20, Math.floor(e.text.length / 6)) });
  }
  scored.sort((a, b) => b.s - a.s || a.text.length - b.text.length);
  const items = scored.slice(0, 8).map(({ text, kind }) => ({ text, kind }));
  return NextResponse.json({ q, items }, { headers });
}
