"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import SafeImg from "../SafeImg";
import { fallbackFor } from "@/lib/home/fallback-images";

/** Mouse drag scrolls a strip sideways; a drag never counts as a click. Touch and trackpad scroll natively. */
function useDrag(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let down = false;
    let moved = false;
    let sx = 0;
    let sl = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true;
      moved = false;
      sx = e.clientX;
      sl = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (!moved && Math.abs(dx) < 5) return;
      moved = true;
      el.classList.add("is-drag");
      el.scrollLeft = sl - dx;
    };
    const onUp = () => {
      down = false;
      el.classList.remove("is-drag");
    };
    const onClick = (e: MouseEvent) => {
      if (!moved) return;
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    };
    const noDrag = (e: Event) => e.preventDefault();
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    el.addEventListener("dragstart", noDrag);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("dragstart", noDrag);
    };
  }, [ref]);
}

const Chevron = ({ dir }: { dir: "l" | "r" }) => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={dir === "r" ? "m7.5 4.5 5.5 5.5-5.5 5.5" : "m12.5 4.5-5.5 5.5 5.5 5.5"} />
  </svg>
);

/** A horizontally scrolling strip with edge arrows that appear only when there is more to see. */
export function Strip({ children, className, label, auto = false }: { children: ReactNode; className: string; label: string; auto?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: true });
  useDrag(ref);
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ l: el.scrollLeft > 8, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 8 });
  }, []);
  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);
  /* Auto-glide: slow, back and forth, and it yields the moment anyone touches or hovers the strip. */
  useEffect(() => {
    const el = ref.current;
    if (!auto || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let pos = el.scrollLeft;
    let dir = 1;
    let hold = false;
    let resume = 0;
    let last = performance.now();
    const pause = () => {
      hold = true;
      window.clearTimeout(resume);
      resume = window.setTimeout(() => {
        hold = false;
        pos = el.scrollLeft;
      }, 3500);
    };
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const max = el.scrollWidth - el.clientWidth;
      if (!hold && max > 0) {
        pos += dir * 0.028 * dt;
        if (pos >= max) { pos = max; dir = -1; }
        if (pos <= 0) { pos = 0; dir = 1; }
        el.scrollLeft = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const evs = ["pointerenter", "pointerdown", "wheel", "focusin", "touchstart"] as const;
    evs.forEach((e) => el.addEventListener(e, pause, { passive: true }));
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resume);
      evs.forEach((e) => el.removeEventListener(e, pause));
    };
  }, [auto]);
  const go = (d: 1 | -1) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="ex-strip">
      <div ref={ref} className={className} role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      {edge.l && (
        <button type="button" className="ex-arrow ex-arrow--l" aria-label={`${label}: previous`} onClick={() => go(-1)}><Chevron dir="l" /></button>
      )}
      {edge.r && (
        <button type="button" className="ex-arrow ex-arrow--r" aria-label={`${label}: next`} onClick={() => go(1)}><Chevron dir="r" /></button>
      )}
    </div>
  );
}

export interface Curated {
  key: string;
  title: string;
  sub: string;
  href: string;
  images: string[];
  tint: string;
}

export function SelectedRail({ items }: { items: Curated[] }) {
  return (
    <Strip className="ex-rail" label="Selected by ARED">
      {items.map((s) => (
        <Link key={s.key} href={s.href} className="ex-card" style={{ ["--sheet" as string]: s.tint }}>
          <span className="ex-card__imgs" aria-hidden>
            {[0, 1, 2].map((n) => (
              <span key={n}><SafeImg srcs={[s.images[n] || fallbackFor(`${s.key}:${n}`)]} /></span>
            ))}
          </span>
          <strong>{s.title}</strong>
          <small>{s.sub}</small>
        </Link>
      ))}
    </Strip>
  );
}

export interface Term {
  term: string;
  image?: string;
  tint: string;
}

/** Two staggered rows of searches that scroll together. */
export function Trending({ terms }: { terms: Term[] }) {
  const rows = [terms.filter((_, i) => i % 2 === 0), terms.filter((_, i) => i % 2 === 1)];
  return (
    <Strip className="ex-try" label="Trending searches" auto>
      <div className="ex-try__rows">
        {rows.map((r, n) => (
          <div key={n} className="ex-try__row" style={{ paddingLeft: n ? 36 : 0 }}>
            {r.map((t) => (
              <Link key={t.term} href={`/home-next/explore?q=${encodeURIComponent(t.term)}`} className="ex-pill">
                <span className="ex-pill__img" style={{ background: t.image ? `center / cover url(${t.image})` : `color-mix(in srgb, ${t.tint} 35%, #fff)` }} aria-hidden />
                <span>{t.term}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </Strip>
  );
}
