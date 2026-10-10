"use client";
import { useEffect, useRef, useState } from "react";

type Topic = "heritage" | "design" | "africa";
type Item = { title: string; link: string; source: string; topic: Topic; date: string };
const TABS: Array<["all" | Topic, string]> = [["all", "All"], ["heritage", "Heritage and museums"], ["design", "Design"], ["africa", "Africa and Global South"]];
const SEEN = "ared-news-seen";

function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24); return d < 14 ? `${d}d ago` : new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function NewsWidget() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"all" | Topic>("all");
  const [tick, setTick] = useState(0);
  const [fresh, setFresh] = useState(0);
  const ref = useRef<HTMLDetailsElement>(null);

  const load = () => {
    setFailed(false);
    fetch("/api/news").then((r) => r.json()).then((d: { items: Item[] }) => {
      setItems(d.items ?? []);
      let seen = 0; try { seen = Number(localStorage.getItem(SEEN) || 0); } catch {}
      setFresh((d.items ?? []).filter((i) => Date.parse(i.date) > seen).length);
    }).catch(() => { setItems([]); setFailed(true); });
  };
  // Wait until the browser is idle (or the widget is opened) so headlines never compete with the page.
  const started = useRef(false);
  const start = () => { if (started.current) return; started.current = true; load(); };
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(start, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(start, 3500);
    return () => globalThis.clearTimeout(id);
  }, []);
  useEffect(() => { if (!items?.length) return; const t = setInterval(() => setTick((n) => n + 1), 5000); return () => clearInterval(t); }, [items]);
  useEffect(() => {
    const out = (e: MouseEvent) => { const d = ref.current; if (d?.open && !d.contains(e.target as Node)) d.open = false; };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && ref.current?.open) ref.current.open = false; };
    document.addEventListener("mousedown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, []);
  const onToggle = () => {
    if (ref.current?.open) start();
    if (ref.current?.open && items?.length) { try { localStorage.setItem(SEEN, String(Date.parse(items[0].date))); } catch {} setFresh(0); }
  };

  const list = (items ?? []).filter((i) => tab === "all" || i.topic === tab);
  const head = items?.length ? items[tick % Math.min(items.length, 6)] : null;
  const srcs = Array.from(new Set((items ?? []).map((i) => i.source)));

  return (
    <details className="nw" ref={ref} onToggle={onToggle} data-no-translate>
      <summary aria-label="Latest news related to the archive">
        <span className="nw-dot" aria-hidden="true" />
        <span className="nw-lab">{head ? <span key={tick} className="nw-tick">{head.title}</span> : "Latest news"}</span>
        <span className="nw-x">Close</span>
        {fresh > 0 && <i className="nw-new" aria-label={`${fresh} new`}>{fresh > 9 ? "9+" : fresh}</i>}
      </summary>
      <div className="nw-panel" role="region" aria-label="Latest news">
        <header className="nw-head"><strong>In the news</strong><button type="button" className="nw-ref" onClick={load} aria-label="Refresh news">Refresh</button></header>
        <p className="nw-sub">Heritage, design and Global South stories from established outlets.</p>
        <div className="nw-tabs" role="tablist">
          {TABS.map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>)}
        </div>
        <ul className="nw-list">
          {items === null && [0, 1, 2, 3].map((n) => <li key={n} className="nw-skel" aria-hidden="true"><b /><b /><b /></li>)}
          {items !== null && list.length === 0 && <li className="nw-empty">{failed ? "News is unavailable right now. Try again in a moment." : "Nothing new here yet. Check back soon."}</li>}
          {list.slice(0, 12).map((i, n) => (
            <li key={i.link} style={{ ["--i" as string]: n } as React.CSSProperties}>
              <a href={i.link} target="_blank" rel="noopener noreferrer">
                <span className="nw-meta"><em className={"nw-src nw-" + i.topic}>{i.source}</em><time dateTime={i.date}>{ago(i.date)}</time></span>
                <span className="nw-title">{i.title}</span>
                <svg viewBox="0 0 24 24" className="nw-go" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
              </a>
            </li>
          ))}
        </ul>
        {srcs.length > 0 && <footer className="nw-foot">Sources: {srcs.join(", ")}. Links open the original publisher.</footer>}
      </div>
    </details>
  );
}
