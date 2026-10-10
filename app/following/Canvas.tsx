"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DiscoverItem } from "@/lib/home/discover-shared";
import { cachedImageSrc } from "@/lib/home/cached-image";
import { tileRatio } from "@/app/home-next/for-you/ForYouTile";

type Card = { id: string; x: number; y: number; w: number; z: number };
type Note = { id: string; x: number; y: number; w: number; text: string; z: number };
type View = { x: number; y: number; k: number };
type State = { cards: Record<string, Card>; notes: Note[]; hidden: string[]; view: View };

const MIN_K = 0.05, MAX_K = 3;
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
const ratio = (it: DiscoverItem) => tileRatio(it);

/** Starting arrangement: loose columns with small deterministic jitter, so it reads as placed rather than tabulated. */
function layout(items: DiscoverItem[]): Record<string, Card> {
  // Same 220px tiles and 12px gutters as For You, so the board reads as the same material.
  const W = 220, G = 12;
  const cols = Math.max(4, Math.min(9, Math.round(Math.sqrt(items.length * 1.1))));
  const colH = Array.from({ length: cols }, () => 0);
  const out: Record<string, Card> = {};
  items.forEach((it, i) => {
    const c = colH.indexOf(Math.min(...colH));
    out[it.id] = { id: it.id, x: c * (W + G), y: colH[c], w: W, z: i };
    colH[c] += W / ratio(it) + G;
  });
  return out;
}

type CardProps = { c: Card; it: DiscoverItem; selected: boolean; onDown: (e: React.PointerEvent, id: string) => void; onResize: (e: React.PointerEvent, id: string) => void; onOpen: (it: DiscoverItem) => void; onBad: (id: string) => void; onNudge: (id: string, dx: number, dy: number) => void };
/** One card. Memoised so dragging a single card does not re-render the other hundred. */
const CardView = memo(function CardView({ c, it, selected, onDown, onResize, onOpen, onBad, onNudge }: CardProps) {
  const h = c.w / ratio(it);
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // An image that settled before hydration never fires its events.
    const el = img.current;
    if (!el || !el.complete) return;
    if (el.naturalWidth > 20) setLoaded(true); else onBad(c.id);
  }, [c.id, onBad]);
  return (
    <figure
      className={`cv__card${selected ? " is-sel" : ""}${loaded ? " is-loaded" : ""}`} data-id={c.id} tabIndex={0} role="link" aria-label={it.title}
      style={{ transform: `translate3d(${c.x}px,${c.y}px,0)`, width: c.w, height: h, zIndex: c.z }}
      onPointerDown={(e) => onDown(e, c.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(it);
        const s = e.shiftKey ? 40 : 10;
        const m: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
        if (m[e.key]) { e.preventDefault(); onNudge(c.id, ...m[e.key]); }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={cachedImageSrc(it.image!)} alt="" draggable={false} referrerPolicy="no-referrer" decoding="async" loading="lazy" onLoad={(e) => { if (e.currentTarget.naturalWidth > 20) setLoaded(true); else onBad(c.id); }} onError={() => onBad(c.id)} />
      <figcaption className="cv__cap"><span>{it.title}</span>{it.source && <em>{it.source}</em>}</figcaption>
      <button type="button" className="cv__open" aria-label={`Open ${it.title}`} tabIndex={-1} onPointerDown={(e) => e.stopPropagation()} onClick={() => onOpen(it)}>↗</button>
      {selected && <span className="cv__rs" onPointerDown={(e) => onResize(e, c.id)} aria-hidden />}
    </figure>
  );
});

export default function Canvas({ items: all, title, back, storageKey }: { items: DiscoverItem[]; title: string; back: string; storageKey: string }) {
  const key = `ared-canvas:${storageKey}`;
  const items = useMemo(() => all.filter((i) => i.image), [all]);
  const base = useMemo<State>(() => ({ cards: layout(items), notes: [], hidden: [], view: { x: 40, y: 110, k: 0.85 } }), [items]);
  const [st, setSt] = useState<State>(base);
  const [sel, setSel] = useState<string | null>(null);
  const [bad, setBad] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [anim, setAnim] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const stRef = useRef(st); stRef.current = st;
  const zTop = useRef(1000);
  const raf = useRef(0);
  const pending = useRef<((s: State) => State) | null>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ kind: "pan" | "card" | "note" | "resize"; id?: string; sx: number; sy: number; ox: number; oy: number; ow?: number; moved: boolean } | null>(null);
  const pinch = useRef<{ d: number; k: number } | null>(null);

  /** Every pointer-driven change goes through here: at most one state commit per animation frame. */
  const commit = useCallback((fn: (s: State) => State) => {
    const prev = pending.current;
    pending.current = prev ? (s) => fn(prev(s)) : fn;
    if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; const f = pending.current; pending.current = null; if (f) setSt(f); });
  }, []);
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "null") as State | null;
      if (raw?.cards) setSt({ ...base, ...raw, cards: { ...base.cards, ...raw.cards } });
    } catch { /* first visit or blocked storage */ }
    setReady(true);
  }, [key, base]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => { try { localStorage.setItem(key, JSON.stringify(st)); } catch { /* full or blocked */ } }, 250);
    return () => clearTimeout(t);
  }, [st, ready, key]);

  const smooth = useCallback((fn: (s: State) => State) => {
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { setAnim(true); setTimeout(() => setAnim(false), 320); }
    setSt(fn);
  }, []);
  const visibleCards = useMemo(() => Object.values(st.cards).filter((c) => !st.hidden.includes(c.id) && !bad.includes(c.id) && items.some((i) => i.id === c.id)), [st.cards, st.hidden, bad, items]);
  const fit = useCallback(() => {
    const el = box.current; if (!el || !visibleCards.length) return;
    const byId = new Map(items.map((i) => [i.id, i]));
    const minX = Math.min(...visibleCards.map((c) => c.x)), minY = Math.min(...visibleCards.map((c) => c.y));
    const maxX = Math.max(...visibleCards.map((c) => c.x + c.w)), maxY = Math.max(...visibleCards.map((c) => c.y + c.w / ratio(byId.get(c.id)!)));
    const k = Math.min(1.2, Math.max(MIN_K, Math.min(el.clientWidth / (maxX - minX + 160), el.clientHeight / (maxY - minY + 160))));
    smooth((s) => ({ ...s, view: { k, x: (el.clientWidth - (maxX - minX) * k) / 2 - minX * k, y: (el.clientHeight - (maxY - minY) * k) / 2 - minY * k } }));
  }, [visibleCards, items, smooth]);
  useEffect(() => { if (ready && !localStorage.getItem(key)) fit(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ready, bad.length === 0]);

  const zoomAt = useCallback((px: number, py: number, f: number, animate = false) => {
    const fn = (s: State): State => { const k = Math.min(MAX_K, Math.max(MIN_K, s.view.k * f)); const r = k / s.view.k; return { ...s, view: { k, x: px - (px - s.view.x) * r, y: py - (py - s.view.y) * r } }; };
    if (animate) smooth(fn); else commit(fn);
  }, [commit, smooth]);
  const centre = () => ({ x: (box.current?.clientWidth ?? 0) / 2, y: (box.current?.clientHeight ?? 0) / 2 });

  useEffect(() => {
    const el = box.current; if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.012));
      else commit((s) => ({ ...s, view: { ...s.view, x: s.view.x - e.deltaX, y: s.view.y - e.deltaY } }));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [zoomAt, commit]);

  const del = useCallback((id: string) => { setSt((s) => id.startsWith("note-") ? { ...s, notes: s.notes.filter((n) => n.id !== id) } : { ...s, hidden: [...s.hidden, id] }); setSel(null); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || /INPUT|TEXTAREA/.test(t.tagName)) return;
      const c = centre();
      if (e.key === "+" || e.key === "=") zoomAt(c.x, c.y, 1.25, true);
      else if (e.key === "-") zoomAt(c.x, c.y, 1 / 1.25, true);
      else if (e.key === "0") fit();
      else if ((e.key === "Backspace" || e.key === "Delete") && sel) { e.preventDefault(); del(sel); }
      else if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomAt, fit, del, sel]);

  const open = useCallback((it: DiscoverItem) => { if (!it.href) return; if (it.external) window.open(it.href, "_blank", "noopener,noreferrer"); else window.location.href = it.href; }, []);
  const begin = useCallback((e: React.PointerEvent, kind: "pan" | "card" | "note" | "resize", id?: string) => {
    e.stopPropagation();
    (box.current as HTMLElement).setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), k: stRef.current.view.k }; drag.current = null; return; }
    const s = stRef.current;
    const c = id ? (kind === "note" ? s.notes.find((n) => n.id === id) : s.cards[id]) : undefined;
    drag.current = { kind, id, sx: e.clientX, sy: e.clientY, ox: kind === "pan" ? s.view.x : c?.x ?? 0, oy: kind === "pan" ? s.view.y : c?.y ?? 0, ow: c?.w, moved: false };
    if (id) { setSel(id); const z = ++zTop.current; setSt((p) => kind === "note" ? { ...p, notes: p.notes.map((n) => n.id === id ? { ...n, z } : n) } : { ...p, cards: { ...p.cards, [id]: { ...p.cards[id], z } } }); }
    else setSel(null);
  }, []);
  const onMove = (e: React.PointerEvent) => {
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y); const r = box.current!.getBoundingClientRect();
      const target = pinch.current.k * (d / pinch.current.d);
      zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, target / stRef.current.view.k);
      return;
    }
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    d.moved = true;
    commit((s) => {
      const k = s.view.k;
      if (d.kind === "pan") return { ...s, view: { ...s.view, x: d.ox + dx, y: d.oy + dy } };
      if (d.kind === "card" && d.id) return { ...s, cards: { ...s.cards, [d.id]: { ...s.cards[d.id], x: d.ox + dx / k, y: d.oy + dy / k } } };
      if (d.kind === "resize" && d.id) return { ...s, cards: { ...s.cards, [d.id]: { ...s.cards[d.id], w: Math.max(90, (d.ow ?? 200) + dx / k) } } };
      if (d.kind === "note" && d.id) return { ...s, notes: s.notes.map((n) => n.id === d.id ? { ...n, x: d.ox + dx / k, y: d.oy + dy / k } : n) };
      return s;
    });
  };
  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    drag.current = null;
  };
  const cardDown = useCallback((e: React.PointerEvent, id: string) => begin(e, "card", id), [begin]);
  const resizeDown = useCallback((e: React.PointerEvent, id: string) => begin(e, "resize", id), [begin]);
  const nudge = useCallback((id: string, dx: number, dy: number) => setSt((s) => ({ ...s, cards: { ...s.cards, [id]: { ...s.cards[id], x: s.cards[id].x + dx, y: s.cards[id].y + dy } } })), []);
  const bump = useCallback((id: string) => setBad((b) => (b.includes(id) ? b : [...b, id])), []);
  const addNote = (cx?: number, cy?: number) => {
    const c = centre(); const px = cx ?? c.x, py = cy ?? c.y; const id = `note-${Date.now()}`;
    setSt((s) => ({ ...s, notes: [...s.notes, { id, x: (px - s.view.x) / s.view.k - 110, y: (py - s.view.y) / s.view.k - 40, w: 220, text: "", z: ++zTop.current }] }));
    setSel(id);
    setTimeout(() => (box.current?.querySelector(`[data-nid="${id}"] [contenteditable]`) as HTMLElement | null)?.focus(), 30);
  };
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const pct = Math.round(st.view.k * 100);
  const z = (f: number) => { const c = centre(); zoomAt(c.x, c.y, f, true); };

  return (
    <div className="cv" ref={box} role="application" aria-label={`Canvas for ${title}`}
      onPointerDown={(e) => begin(e, "pan")} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onDoubleClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("cv__world")) { const r = box.current!.getBoundingClientRect(); addNote(e.clientX - r.left, e.clientY - r.top); } }}>
      <div className={`cv__world${anim ? " is-anim" : ""}`} style={{ transform: `translate3d(${st.view.x}px,${st.view.y}px,0) scale(${st.view.k})` }}>
        {visibleCards.map((c) => (
          <CardView key={c.id} c={c} it={byId.get(c.id)!} selected={sel === c.id} onDown={cardDown} onResize={resizeDown} onOpen={open} onBad={bump} onNudge={nudge} />
        ))}
        {st.notes.map((n) => (
          <div key={n.id} data-nid={n.id} className={`cv__note${sel === n.id ? " is-sel" : ""}`} style={{ transform: `translate3d(${n.x}px,${n.y}px,0)`, width: n.w, zIndex: n.z }}
            onPointerDown={(e) => { if ((e.target as HTMLElement).isContentEditable && sel === n.id) { e.stopPropagation(); return; } begin(e, "note", n.id); }}>
            <div contentEditable suppressContentEditableWarning role="textbox" aria-label="Note" data-ph="Write something" onBlur={(e) => { const text = e.currentTarget.innerText; setSt((s) => ({ ...s, notes: s.notes.map((x) => x.id === n.id ? { ...x, text } : x) })); }}>{n.text}</div>
          </div>
        ))}
      </div>
      <div className="cv__top" onPointerDown={(e) => e.stopPropagation()}>
        <Link href={back} className="cv__btn" aria-label="Back to collection">←</Link>
        <strong>{title}</strong>
        <span>{visibleCards.length}</span>
      </div>
      <div className="cv__bar" onPointerDown={(e) => e.stopPropagation()} role="toolbar" aria-label="Canvas tools">
        <button onClick={() => z(1 / 1.25)} aria-label="Zoom out" title="Zoom out (−)">−</button>
        <output aria-live="polite">{pct}%</output>
        <button onClick={() => z(1.25)} aria-label="Zoom in" title="Zoom in (+)">+</button>
        <i />
        <button onClick={fit} title="Fit everything (0)">Fit</button>
        <button onClick={() => addNote()} title="Add a note (double-click anywhere)">Note</button>
        {sel && <button onClick={() => del(sel)} className="cv__del" title="Remove (Delete)">Remove</button>}
        <button onClick={() => { setSt({ ...base, view: stRef.current.view }); setBad([]); setSel(null); }} title="Restore the original arrangement">Reset</button>
      </div>
      <p className="cv__hint">Drag to pan · Ctrl and scroll or pinch to zoom · double-click for a note</p>
    </div>
  );
}
