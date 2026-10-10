"use client";
import Link from "next/link";
import "./account-menu.css";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { signOutNow } from "./signout";
const SettingsModal = dynamic(() => import("./SettingsModal"), { ssr: false });

type Theme = "light" | "night" | "contrast";

function readTheme(): Theme {
  try {
    const s = JSON.parse(localStorage.getItem("ared-display") ?? "{}") as { night?: boolean; contrast?: boolean };
    return s.night ? "night" : s.contrast ? "contrast" : "light";
  } catch { return "light"; }
}
function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.dataset.aredNight = String(t === "night");
  root.dataset.aredContrast = String(t === "contrast");
  try {
    const s = JSON.parse(localStorage.getItem("ared-display") ?? "{}") as Record<string, unknown>;
    localStorage.setItem("ared-display", JSON.stringify({ ...s, night: t === "night", contrast: t === "contrast" }));
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event("ared-display"));
}

const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [admin, setAdmin] = useState(false);
  useEffect(() => { fetch("/api/account").then((r) => r.json()).then((d) => setAdmin(Boolean(d?.admin))).catch(() => {}); }, []);
  const [theme, setTheme] = useState<Theme>("light");
  const [grid, setGrid] = useState(1);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(readTheme());
    try { const g = localStorage.getItem("ared-density"); if (g === "0" || g === "2") setGrid(Number(g)); } catch { /* ignore */ }
    // The feed's zoom buttons change the same setting; keep Grid size in step with them.
    const on = (e: Event) => { const v = (e as CustomEvent<number>).detail; if (v === 0 || v === 1 || v === 2) setGrid(v); };
    window.addEventListener("ared-density", on);
    return () => window.removeEventListener("ared-density", on);
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setCreateOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setCreateOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
  }, [createOpen]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    fetch("/api/for-you/elements").then((r) => r.json()).then((d: { items?: unknown[] }) => { if (live) setCount(d.items?.length ?? 0); }).catch(() => undefined);
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => { live = false; document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", key); };
  }, [open]);

  const size = useCallback((n: number) => {
    setGrid(n);
    try { localStorage.setItem("ared-density", String(n)); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("ared-density", { detail: n }));
  }, []);
  const pick = (t: Theme) => { setTheme(t); applyTheme(t); };
  const close = () => setOpen(false);

  return (
    <div className="am" ref={wrap}>
      <button type="button" className={`am-create${createOpen ? " is-open" : ""}`} aria-haspopup="menu" aria-expanded={createOpen} onClick={() => { setCreateOpen((v) => !v); setOpen(false); }}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M10 3v14M3 10h14" /></svg><span>Create</span></button>
      {createOpen && (
        <div className="am-panel am-panel--create" role="menu">
          <Link role="menuitem" href="/profile?new=1" onClick={() => setCreateOpen(false)}><Ico d="M4 4h7v16H4zM13 4h7v7h-7zM13 13h7v7h-7z" /><span><b>Collection</b><small>A collection of records</small></span></Link>
          <Link role="menuitem" href="/explore" onClick={() => setCreateOpen(false)}><Ico d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5" /><span><b>Record</b><small>Find it in Explore and save it</small></span></Link>
          <a role="menuitem" href="https://apps.apple.com/au/app/ared-field/id6794563712" target="_blank" rel="noopener noreferrer" onClick={() => setCreateOpen(false)}><Ico d="M7 3h10v18H7zM11 18h2" /><span><b>ARED Field</b><small>Capture in the field. iOS app</small></span></a>
        </div>
      )}
      <button type="button" className={`am-trigger${open ? " is-open" : ""}`} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => { setOpen((v) => !v); setCreateOpen(false); }}>
        <span className="am-avatar" aria-hidden />
        <svg className="am-chev" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 8 5 5 5-5" /></svg>
      </button>
      {open && (
        <div className="am-panel" role="menu">
          <Link role="menuitem" href="/profile" onClick={close}><span>View profile</span><i className="am-avatar am-avatar--sm" aria-hidden /></Link>
          <Link role="menuitem" href="/elements" onClick={close}><span>Saved records <b>{count ?? "·"}</b></span><Ico d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" /></Link>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); setSettings(true); }}><span>Settings</span><Ico d="M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5" /></button>
          <Link role="menuitem" href="/help#contact" onClick={close}><span>Contact us</span><Ico d="M4 5h16v11H9l-5 4V5zM9 10h.01M12 10h.01M15 10h.01" /></Link>
          <a role="menuitem" href="https://www.instagram.com/afr_rd_/" target="_blank" rel="noopener noreferrer" onClick={close}><span>Community</span><Ico d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 2.7-5 6-5s6 2 6 5M16 5.5a3 3 0 0 1 0 5.5M18 14c2 .6 3 2.200 3 5" /></a>
          {admin && <Link role="menuitem" href="/admin" onClick={close}><span>Admin</span><Ico d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /></Link>}
          <button role="menuitem" type="button" onClick={() => { close(); void signOutNow(); }}><span>Log out</span><Ico d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" /></button>
          <div className="am-sep" />
          <div className="am-row"><span>Theme</span>
            <div className="am-seg" role="group" aria-label="Theme">
              <button type="button" aria-pressed={theme === "light"} aria-label="Light" onClick={() => pick("light")}><Ico d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></button>
              <button type="button" aria-pressed={theme === "night"} aria-label="Night" onClick={() => pick("night")}><Ico d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z" /></button>
              <button type="button" aria-pressed={theme === "contrast"} aria-label="High contrast" onClick={() => pick("contrast")}><Ico d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18" /></button>
            </div>
          </div>
          <div className="am-row"><span>Grid size</span>
            <div className="am-seg" role="group" aria-label="Grid size">
              {["I", "II", "III"].map((l, n) => <button key={l} type="button" aria-pressed={grid === n} aria-label={`Grid size ${l}`} onClick={() => size(n)}>{l}</button>)}
            </div>
          </div>
        </div>
      )}
      {settings && <SettingsModal onClose={() => setSettings(false)} host={wrap.current?.closest<HTMLElement>(".ared-home") ?? null} />}
    </div>
  );
}
