"use client";
import { useEffect, useRef, useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="cf-round" aria-label="Share this profile" title={done ? "Link copied" : "Share"} onClick={async () => {
      const url = location.href;
      try { if (navigator.share) { await navigator.share({ title, url }); return; } } catch { /* cancelled */ }
      try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* blocked */ }
    }}>
      {done ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>}
    </button>
  );
}
const Ico = {
  canvas: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></svg>,
  flag: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4h13l-2.5 4.5L18 13H5" /></svg>,
  link: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" /></svg>,
  block: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></svg>,
};

/** The "..." menu, in the Cosmos shape: collections get View canvas and Report; people get Copy link, Block and Report. */
export function MoreButton({ handle, kind = "profile", canvasHref }: { handle: string; kind?: "profile" | "collection"; canvasHref?: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  const flash = (m: string) => { setMsg(m); setOpen(false); setTimeout(() => setMsg(""), 2600); };
  const copy = async () => { try { await navigator.clipboard.writeText(location.href); flash("Link copied"); } catch { flash("Could not copy"); } };
  const block = () => { try { const k = "ared-feed-less"; const v = JSON.parse(localStorage.getItem(k) || "[]"); localStorage.setItem(k, JSON.stringify([...new Set([...v, handle])])); const b = JSON.parse(localStorage.getItem("ared-blocked") || "[]"); localStorage.setItem("ared-blocked", JSON.stringify([...new Set([...b, handle])])); window.dispatchEvent(new Event("ared-follows-changed")); flash("Blocked on this device"); } catch { flash("Could not block"); } };
  const report = () => { window.location.href = `/feedback?report=${encodeURIComponent(location.pathname)}`; };
  return (
    <span className="cf-moremenu" ref={box}>
      <button type="button" className="cf-round" aria-label="More options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
      </button>
      {open && (
        <ul className="cf-mmenu" role="menu">
          {kind === "collection" && canvasHref && <li role="none"><a role="menuitem" href={canvasHref}>View canvas {Ico.canvas}</a></li>}
          {kind === "profile" && <li role="none"><button role="menuitem" onClick={copy}>Copy link {Ico.link}</button></li>}
          {kind === "profile" && <li role="none"><button role="menuitem" className="is-red" onClick={block}>Block {Ico.block}</button></li>}
          <li role="none"><button role="menuitem" className="is-red" onClick={report}>Report {Ico.flag}</button></li>
        </ul>
      )}
      {msg && <span className="cf-mtoast" role="status">{msg}</span>}
    </span>
  );
}
