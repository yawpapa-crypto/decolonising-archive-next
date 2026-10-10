import { NextResponse } from "next/server";

export const revalidate = 1800;

type Feed = { name: string; url: string; topic: Topic; strict?: boolean };
type Topic = "heritage" | "design" | "africa";
type Item = { title: string; link: string; source: string; topic: Topic; date: string };

// Established outlets only. "strict" feeds are general news and are filtered by keyword.
const FEEDS: Feed[] = [
  { name: "The Guardian", url: "https://www.theguardian.com/world/africa/rss", topic: "africa", strict: true },
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml", topic: "africa", strict: true },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", topic: "africa", strict: true },
  { name: "The Conversation", url: "https://theconversation.com/africa/articles.atom", topic: "africa", strict: true },
  { name: "The Art Newspaper", url: "https://www.theartnewspaper.com/rss", topic: "heritage", strict: true },
  { name: "Hyperallergic", url: "https://hyperallergic.com/feed/", topic: "heritage", strict: true },
  { name: "Dezeen", url: "https://www.dezeen.com/feed/", topic: "design", strict: true },
  { name: "Design Observer", url: "https://designobserver.com/feed", topic: "design", strict: true },
  { name: "Africa Is a Country", url: "https://africasacountry.com/feed", topic: "africa", strict: true },
];

const KEYWORDS = [
  "decolonis", "decoloniz", "restitution", "repatriat", "colonial", "heritage", "archive", "museum", "benin bronze",
  "african design", "african art", "african culture", "indigenous", "global south", "textile", "kente", "craft",
  "typograph", "graphic design", "design history", "pluriverse", "artefact", "artifact", "exhibition", "looted",
];
const DESIGN_ONLY = ["african", "africa", "decolon", "global south", "indigenous", "craft", "textile", "typograph", "heritage", "museum", "archive"];

function strip(s: string) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#8217;/g, "’").replace(/&#8211;/g, "–").replace(/\s+/g, " ").trim();
}
function pick(block: string, tag: string) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? strip(m[1]) : "";
}

function parse(xml: string, feed: Feed): Item[] {
  const out: Item[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const b of blocks.slice(0, 40)) {
    const title = pick(b, "title");
    let link = pick(b, "link");
    if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ""; }
    const date = pick(b, "pubDate") || pick(b, "published") || pick(b, "updated") || pick(b, "dc:date");
    const t = Date.parse(date);
    if (!title || !/^https?:\/\//.test(link) || Number.isNaN(t)) continue;
    const hay = `${title} ${pick(b, "description") || pick(b, "summary")}`.toLowerCase();
    if (feed.strict) {
      const list = feed.topic === "design" ? DESIGN_ONLY : KEYWORDS;
      if (!list.some((k) => hay.includes(k))) continue;
    }
    let topic: Topic = feed.topic;
    if (/(museum|restitution|repatriat|heritage|archive|benin|artefact|artifact|colonial)/.test(hay)) topic = "heritage";
    else if (/(design|typograph|textile|craft|architect)/.test(hay) && feed.topic !== "africa") topic = "design";
    out.push({ title: title.slice(0, 180), link, source: feed.name, topic, date: new Date(t).toISOString() });
  }
  return out;
}

export async function GET() {
  const results = await Promise.all(FEEDS.map(async (f) => {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(f.url, { signal: ctl.signal, next: { revalidate: 1800 }, headers: { "User-Agent": "ARED-news/1.0 (+https://ared.design)", Accept: "application/rss+xml, application/atom+xml, text/xml" } });
      clearTimeout(timer);
      if (!r.ok) return [] as Item[];
      return parse(await r.text(), f);
    } catch { return [] as Item[]; }
  }));
  const seen = new Set<string>();
  const items = results.flat()
    .filter((i) => Date.now() - Date.parse(i.date) < 1000 * 60 * 60 * 24 * 45)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .filter((i) => { const k = i.title.toLowerCase().slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 30);
  const sources = Array.from(new Set(items.map((i) => i.source)));
  return NextResponse.json({ items, sources, updated: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } });
}
