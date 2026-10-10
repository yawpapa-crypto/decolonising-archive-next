"use client";
import { recommendationEvent, rememberSessionIntent } from "@/lib/recommendations/client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

type Sug = { text: string; kind: string };
type Row = { text: string; kind: "recent" | "trend" | "live" | "typed"; tag?: string };

const TRY = ["goldweights", "kente cloth", "Asante", "adinkra", "Yoruba", "manuscripts"];
const TRENDING = ["goldweights", "adinkra", "Benin bronzes", "oral literature", "kente cloth", "protest posters", "typography", "architecture"];
const KEY = "ared-recent-searches";
const readRecent = (): string[] => { try { return (JSON.parse(localStorage.getItem(KEY) || "[]") as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 8); } catch { return []; } };
const writeRecent = (l: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 8))); } catch { /* ignore */ } };

/** The part of a suggestion the person has not typed yet is bold, as in Google. */
function Bold({ text, q }: { text: string; q: string }) {
  const t = text.toLowerCase(), f = q.trim().toLowerCase();
  if (f && t.startsWith(f)) return <><span>{text.slice(0, f.length)}</span><b>{text.slice(f.length)}</b></>;
  const at = f ? t.indexOf(f) : -1;
  if (at > -1) return <>{text.slice(0, at)}<b>{text.slice(at, at + f.length)}</b>{text.slice(at + f.length)}</>;
  return <>{text}</>;
}

const ICON = {
  search: "M9 15.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM14 14l4 4",
  recent: "M10 5v5l3 2M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z",
  trend: "M3 14l5-5 3 3 6-7M13 5h4v4",
};

/** One search box for the nav and the home page: live suggestions, recent searches, keyboard and touch friendly. */
export default function SearchBox({ variant = "nav" }: { variant?: "nav" | "big" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [typed, setTyped] = useState("");        // what the person actually typed, kept while arrowing through rows
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [live, setLive] = useState<Sug[]>([]);
  const [active, setActive] = useState(-1);
  const [ph, setPh] = useState(0);
  const [pending, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const cache = useRef(new Map<string, Sug[]>());
  const abort = useRef<AbortController | null>(null);
  const listId = useId();

  // Keep the box in step with the address (so a finished search still shows its words).
  useEffect(() => { const v = new URLSearchParams(window.location.search).get("q") || ""; setQ(v); setTyped(v); }, [pathname]);
  useEffect(() => { setRecent(readRecent()); }, []);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setPh((n) => (n + 1) % TRY.length), 3200);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const out = (e: Event) => { if (form.current && !form.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, []);

  // Live suggestions: debounced, stale requests cancelled, answers remembered.
  useEffect(() => {
    const t = typed.trim();
    if (!t) { setLive([]); return; }
    const hit = cache.current.get(t.toLowerCase());
    if (hit) { setLive(hit); return; }
    const id = window.setTimeout(async () => {
      abort.current?.abort();
      const ctl = new AbortController(); abort.current = ctl;
      try {
        const r = await fetch(`/api/suggest?q=${encodeURIComponent(t)}`, { signal: ctl.signal });
        if (!r.ok) return;
        const d = (await r.json()) as { items: Sug[] };
        cache.current.set(t.toLowerCase(), d.items);
        setLive(d.items);
      } catch { /* aborted or offline: keep what is on screen */ }
    }, 70);
    return () => window.clearTimeout(id);
  }, [typed]);

  const term = typed.trim();
  const low = term.toLowerCase();
  // Local answers appear at once; live ones replace them when they arrive.
  const local: Row[] = term
    ? Array.from(new Set([...recent, ...TRENDING])).filter((s) => s.toLowerCase().startsWith(low) && s.toLowerCase() !== low).slice(0, 4).map((s) => ({ text: s, kind: recent.includes(s) ? "recent" : "trend" } as Row))
    : [];
  const liveRows: Row[] = live.filter((l) => l.text.toLowerCase() !== low).map((l) => ({ text: l.text, kind: "live", tag: l.kind }));
  const seen = new Set<string>();
  const rows: Row[] = (term
    ? [...(liveRows.length ? liveRows : local)]
    : [...recent.map((s) => ({ text: s, kind: "recent" } as Row)), ...TRENDING.filter((t) => !recent.includes(t)).slice(0, Math.max(3, 8 - recent.length)).map((s) => ({ text: s, kind: "trend" } as Row))]
  ).filter((r) => { const k = r.text.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);

  const submit = useCallback((value: string) => {
    const v = value.trim(); if (!v) return;
    const next = [v, ...readRecent().filter((s) => s.toLowerCase() !== v.toLowerCase())];
    writeRecent(next); setRecent(next); setQ(v); setTyped(v); setOpen(false); setActive(-1);
    input.current?.blur();
    rememberSessionIntent(v);
    recommendationEvent("search", "theme", v);
    start(() => router.push(`/home-next/explore?q=${encodeURIComponent(v)}`));
  }, [router]);

  const forget = (s: string) => { const n = readRecent().filter((x) => x !== s); writeRecent(n); setRecent(n); input.current?.focus(); };
  const clear = () => { setQ(""); setTyped(""); setActive(-1); setOpen(true); input.current?.focus(); };

  const move = (to: number) => {
    setActive(to);
    setQ(to < 0 ? typed : rows[to].text); // arrowing puts the suggestion in the box, like Google
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (!open) { setOpen(true); return; } move(active + 1 >= rows.length ? -1 : active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (!open) { setOpen(true); return; } move(active <= -1 ? rows.length - 1 : active - 1); }
    else if (e.key === "Escape") { if (open) { setOpen(false); setQ(typed); } else if (q) clear(); }
    else if (e.key === "Delete" && e.shiftKey && active >= 0 && rows[active]?.kind === "recent") { e.preventDefault(); forget(rows[active].text); }
  };

  return (
    <form ref={form} className={(variant === "big" ? "ared-bigsearch " : "ared-search ") + "sb" + (open && rows.length ? " is-open" : "") + (pending ? " is-busy" : "")}
      action="/home-next/explore" method="get" role="search" onSubmit={(e) => { e.preventDefault(); submit(q); }}>
      <svg className="sb__ico" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={ICON.search} /></svg>
      <input ref={input} type="text" inputMode="search" enterKeyHint="search" name="q" value={q} autoComplete="off" autoCapitalize="none" spellCheck={false}
        placeholder={variant === "big" ? "Search records, places, makers" : `Try ‘${TRY[ph]}’`} aria-label="Search the archive"
        role="combobox" aria-expanded={open && rows.length > 0} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => { setQ(e.target.value); setTyped(e.target.value); setActive(-1); setOpen(true); }}
        onFocus={() => { setRecent(readRecent()); setOpen(true); }} onKeyDown={onKey} />
      {q && <button type="button" className="sb__x" aria-label="Clear search" onPointerDown={(e) => e.preventDefault()} onClick={clear}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15" /></svg></button>}
      {variant === "big" && <button type="submit" className="sb__go" aria-label="Search"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M11 5l5 5-5 5" /></svg></button>}
      {pending && <i className="sb__bar" aria-hidden="true" />}
      {open && rows.length > 0 && (
        <div className="sb__list" id={listId} role="listbox" aria-label="Search suggestions">
          {rows.map((r, n) => (
            <div key={r.kind + r.text} id={`${listId}-${n}`} role="option" aria-selected={n === active} className={"sb__row" + (n === active ? " on" : "")}
              onPointerDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(n)} onClick={() => submit(r.text)}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d={r.kind === "recent" ? ICON.recent : r.kind === "trend" ? ICON.trend : ICON.search} /></svg>
              <span className="sb__t">{term && r.kind !== "recent" ? <Bold text={r.text} q={typed} /> : r.text}</span>
              {r.tag && r.tag !== "Search" && <em className="sb__tag">{r.tag}</em>}
              {r.kind === "recent" && <button type="button" className="sb__rm" aria-label={`Remove ${r.text} from recent searches`} onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => { e.stopPropagation(); forget(r.text); }}>Remove</button>}
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
