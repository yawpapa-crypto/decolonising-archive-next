"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Dest = { href: string; label: string; current?: boolean };

/**
 * Content-driven header. Measures what the full header actually needs (logo, the four
 * destinations, a usable search field, Help and account) against the space the header has
 * right now — so browser zoom, enlarged text and long translations all count — and switches
 * the header to its compact form before anything crowds, wraps or overlaps. In compact form the
 * destinations move into an accessible Menu; nothing is duplicated while hidden.
 */
export default function NavFit({ dests, signedIn = false }: { dests: Dest[]; signedIn?: boolean }) {
  const back = usePathname() || "/for-you";
  const ref = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);
  const [tight, setTight] = useState(false);
  const linksCache = useRef(0);
  const rightCache = useRef(0);
  const [withTabs, setWithTabs] = useState(false);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
  useIso(() => {
    const header = ref.current?.closest<HTMLElement>(".ared-nav");
    if (!header) return;
    const fit = () => {
      const cs = getComputedStyle(header);
      const avail = header.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const logo = header.querySelector<HTMLElement>(".ared-nav__logo")?.offsetWidth ?? 32;
      // Natural width of the destinations: measured live while they show, remembered while they don't.
      const linksEl = header.querySelector<HTMLElement>(".ared-nav__links");
      const live = linksEl && getComputedStyle(linksEl).display !== "none" ? linksEl.scrollWidth : 0;
      if (live) linksCache.current = live;
      const links = linksCache.current || measure.current?.offsetWidth || 0;
      const right = header.querySelector<HTMLElement>(".ared-nav__right");
      const kids = right ? Array.from(right.children).filter((c) => !c.classList.contains("ared-navfit")) as HTMLElement[] : [];
      const measured = kids.reduce((w, c) => w + (c.offsetWidth || 0), 0) + 12 * Math.max(0, kids.filter((c) => c.offsetWidth).length - 1);
      // While the account links sit in the Menu they measure 0, so keep the width they need when shown.
      if (header.dataset.tight !== "true") rightCache.current = measured;
      const rightW = Math.max(measured, rightCache.current);
      const search = Math.max(15 * rem, 240);                       // a search field people can actually use
      // The full header is symmetric (1fr | search | 1fr): the wider side sets the need on both sides.
      const left = logo + 24 + links;
      const need = 2 * Math.max(left, rightW) + search + 2 * 24 + 32; // 32px breathing room before anything touches
      const next = need > avail;
      // Search always stays a visible field. In compact form it shares the row with the logo, the Menu
      // and the account links; when that leaves it too narrow to type in, the sign-in pair moves into
      // the Menu so the field gets the room instead.
      const menuW = next ? 44 + 12 : 0;
      const searchTrack = avail - logo - rightW - menuW - 2 * 12;
      const tight = next && searchTrack < 13 * rem;
      header.dataset.tight = tight ? "true" : "false";
      setTight(tight);
      header.dataset.fit = next ? "compact" : "full";
      header.dataset.search = "inline";
      // Phones and tablets have the bottom tab bar; the Menu then skips the destinations it already lists.
      const tabs = document.querySelector(".ared-tabbar");
      setWithTabs(Boolean(tabs && getComputedStyle(tabs).display !== "none"));
      // Pages offset their content by the header's real height, which grows with large text and zoom.
      requestAnimationFrame(() => document.documentElement.style.setProperty("--ared-nav-h", `${Math.round(header.getBoundingClientRect().height)}px`));
      setCompact(next);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(header);
    if (measure.current) ro.observe(measure.current);
    const right = header.querySelector(".ared-nav__right"); if (right) ro.observe(right);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, []);

  useEffect(() => { if (!compact) setOpen(false); }, [compact]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", key);
    panel.current?.querySelector<HTMLElement>("a")?.focus();
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div ref={ref} className="ared-navfit">
      {/* Measuring copy of the labels: never focusable, never read, never painted. */}
      <span ref={measure} className="ared-navfit__measure" aria-hidden="true">{dests.map((d) => <span key={d.href}>{d.label}</span>)}</span>
      {compact && (
        <>
          <button ref={btn} type="button" className="ared-navfit__btn" aria-expanded={open} aria-controls="ared-navfit-panel" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d={open ? "M5 5l10 10M15 5 5 15" : "M3.5 6h13M3.5 10h13M3.5 14h13"} /></svg>
            <span className="ared-navfit__lbl">Menu</span>
          </button>
          {open && (
            <div ref={panel} id="ared-navfit-panel" className="ared-navfit__panel" role="navigation" aria-label="Site">
              {!withTabs && dests.map((d) => (
                <Link key={d.href} href={d.href} aria-current={d.current ? "page" : undefined} onClick={() => setOpen(false)}>{d.label}</Link>
              ))}
              <Link href="/help" onClick={() => setOpen(false)}>Help</Link>
              {!signedIn && tight && <>
                <Link href={`/signin?next=${encodeURIComponent(back)}`} onClick={() => setOpen(false)}>Sign in</Link>
                <Link href={`/signup?next=${encodeURIComponent("/onboarding?next=" + encodeURIComponent(back))}`} onClick={() => setOpen(false)}>Create account</Link>
              </>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
