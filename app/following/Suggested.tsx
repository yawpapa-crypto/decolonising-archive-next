"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import FollowButton from "./FollowButton";
import { fallbackFor } from "@/lib/home/fallback-images";

function Pic({ src, i }: { src: string; i: number }) {
  const [s, setS] = useState(src);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) queueMicrotask(() => setS(fallbackFor(src + i)));
  }, [src, i]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={s} alt="" loading="eager" decoding="async" referrerPolicy="no-referrer" onError={() => { const f = fallbackFor(src + i); if (s !== f) setS(f); }} />
  );
}

export type Sug = {
  key: string;
  name: string;
  handle: string;
  why: string;
  href: string;
  thumbs: string[];
  count: string;
  db?: { id: string; kind: "profile" | "collection"; initial: boolean };
};

const LS = "ared-follow-sources";
export function useLocalFollows() {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    const read = () => { try { setSet(new Set(JSON.parse(localStorage.getItem(LS) || "[]"))); } catch { /* none */ } };
    read();
    window.addEventListener("ared-follows-changed", read);
    return () => window.removeEventListener("ared-follows-changed", read);
  }, []);
  const toggle = (k: string) =>
    setSet((p) => {
      const n = new Set(p);
      n.has(k) ? n.delete(k) : n.add(k);
      try { localStorage.setItem(LS, JSON.stringify([...n])); window.dispatchEvent(new Event("ared-follows-changed")); } catch { /* private mode */ }
      return n;
    });
  return { set, toggle };
}

const Tick = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden className="cs-tick"><path fill="currentColor" d="M12 2l2.4 1.7 2.9-.2 1.2 2.7 2.5 1.5-.5 2.9 1.3 2.6-1.9 2.2-.2 2.9-2.8.9-1.8 2.3L12 20.4 9.4 22l-1.8-2.3-2.8-.9-.2-2.9L2.7 13.7 4 11.1l-.5-2.9L6 6.7l1.2-2.7 2.9.2z" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function Avatar({ s, size }: { s: Sug; size: number }) {
  return (
    <span className="cs-av" style={{ width: size, height: size }} aria-hidden>
      {s.thumbs[0] ? <Pic src={s.thumbs[0]} i={9} /> : (
        s.name[0]
      )}
    </span>
  );
}

export function Btn({ s, signedIn, dark, local }: { s: Sug; signedIn: boolean; dark?: boolean; local: ReturnType<typeof useLocalFollows> }) {
  if (s.db) return <FollowButton id={s.db.id} kind={s.db.kind} signedIn={signedIn} initial={s.db.initial} />;
  const on = local.set.has(s.key);
  return (
    <button type="button" className={`cs-btn${dark ? " cs-btn--dark" : ""}${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => local.toggle(s.key)}>
      {on ? "Following" : "Follow"}
    </button>
  );
}

export function SuggestedStrip({ items, signedIn, title = "Suggested" }: { items: Sug[]; signedIn: boolean; title?: string }) {
  const local = useLocalFollows();
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section className="cs-strip" aria-labelledby="cs-strip-t">
      <h2 id="cs-strip-t">{title}</h2>
      <div className="cs-strip__wrap">
        <div className="cs-strip__row" ref={ref}>
          {items.map((s) => (
            <article key={s.key} className="cs-card">
              <Link href={s.href} className="cs-card__top" target={s.href.startsWith("http") ? "_blank" : undefined} aria-label={s.name}>
                <span className="cs-card__thumbs">
                  {s.thumbs.slice(0, 3).map((t, i) => <Pic key={i} src={t} i={i} />)}
                </span>
                <Avatar s={s} size={76} />
              </Link>
              <h3>{s.name} <Tick /></h3>
              <p>{s.why}</p>
              <Btn s={s} signedIn={signedIn} dark local={local} />
            </article>
          ))}
        </div>
        <button type="button" className="cs-next" aria-label="Next suggestions" onClick={() => ref.current?.scrollBy({ left: ref.current.clientWidth * 0.8, behavior: "smooth" })}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    </section>
  );
}

export function SuggestedPanel({ items, signedIn }: { items: Sug[]; signedIn: boolean }) {
  const local = useLocalFollows();
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const show = (k: string) => { if (timer.current) window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(k), 180); };
  const hide = () => { if (timer.current) window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(null), 220); };
  return (
    <aside className="cs-panel" aria-labelledby="cs-panel-t">
      <header><h2 id="cs-panel-t">Suggested</h2><Link href="/home-next/explore">See all</Link></header>
      <ul>
        {items.slice(0, 5).map((s) => (
          <li key={s.key} onMouseEnter={() => show(s.key)} onMouseLeave={hide} onFocus={() => show(s.key)} onBlur={hide}>
            <Link href={s.href} className="cs-row" target={s.href.startsWith("http") ? "_blank" : undefined}>
              <Avatar s={s} size={62} />
              <span><strong>{s.name} <Tick /></strong><em>{s.why}</em></span>
            </Link>
            <Btn s={s} signedIn={signedIn} local={local} />
            {open === s.key && (
              <div className="cs-hover" role="group" aria-label={s.name} onMouseEnter={() => show(s.key)} onMouseLeave={hide}>
                <div className="cs-hover__imgs">
                  {s.thumbs.slice(0, 4).map((t, i) => <Pic key={i} src={t} i={i} />)}
                </div>
                <div className="cs-hover__foot">
                  <Avatar s={s} size={62} />
                  <span><strong>{s.name}</strong><em>{s.handle} <Tick /> · {s.count}</em></span>
                  <Btn s={s} signedIn={signedIn} dark local={local} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
