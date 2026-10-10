"use client";
import LineLoader from "@/app/home-next/ui/LineLoader";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOutNow } from "./signout";
import { emailConfirmed } from "@/lib/account/delete-guard";

type Tab = "profile" | "account" | "display" | "privacy" | "interests" | "help" | "delete";
type Form = { email: string; username: string; full_name: string; bio: string; website: string };

const I = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

export default function SettingsModal({ onClose, host }: { onClose: () => void; host: HTMLElement | null }) {
  const [tab, setTab] = useState<Tab>("profile");
  const [f, setF] = useState<Form | null>(null);
  const [orig, setOrig] = useState<Form | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const [optOut, setOptOut] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [del, setDel] = useState<"idle" | "working" | "error">("idle");
  const [delMsg, setDelMsg] = useState("");
  const [cleared, setCleared] = useState(false);
  useEffect(() => { try { setOptOut(localStorage.getItem("ared-privacy-optout") === "1"); } catch {} }, []);
  const toggleOptOut = () => { const n = !optOut; setOptOut(n); try { localStorage.setItem("ared-privacy-optout", n ? "1" : "0"); document.cookie=`ared-recommendations-optout=${n?"1":"0"};Path=/;Max-Age=31536000;SameSite=Lax`; } catch {} };
  const clearDevice = () => {
    try { Object.keys(localStorage).filter((k) => k.startsWith("ared")).forEach((k) => { if (!["ared-privacy-optout"].includes(k)) localStorage.removeItem(k); }); } catch {}
    setCleared(true);
  };
  async function deleteAccount() {
    setDel("working"); setDelMsg("");
    try {
      const r = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) { setDel("error"); setDelMsg(d.error ?? "Could not delete."); return; }
      try { Object.keys(localStorage).filter((k) => k.startsWith("ared")).forEach((k) => localStorage.removeItem(k)); } catch {}
      window.location.assign("/?account=deleted");
    } catch { setDel("error"); setDelMsg("No connection. Try again."); }
  }

  useEffect(() => {
    let live = true;
    fetch("/api/account").then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); if (live) { setF(d); setOrig(d); } }).catch((e: Error) => { if (live) setMsg(e.message || "Could not load your profile."); });
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => { live = false; document.removeEventListener("keydown", key); prev?.focus?.({ preventScroll: true }); };
  }, [onClose]);

  const dirty = f && orig && JSON.stringify(f) !== JSON.stringify(orig);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f || !orig) return;
    setState("saving"); setMsg("");
    const body: Record<string, string> = { full_name: f.full_name, bio: f.bio, website: f.website };
    if (f.username !== orig.username) body.username = f.username;
    try {
      const r = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) { setState("error"); setMsg(d.error ?? "Could not save."); return; }
      setOrig(f); setState("saved");
    } catch { setState("error"); setMsg("No connection. Try again."); }
  }
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setState("idle"); setF((v) => (v ? { ...v, [k]: e.target.value } : v)); };

  const NAV: Array<[Tab, string, string]> = [
    ["profile", "Profile", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6"],
    ["account", "Account details", "M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5"],
    ["display", "Display and language", "M12 3a9 9 0 1 0 0 18V3zM12 3a9 9 0 0 1 0 18"],
    ["privacy", "Privacy and data", "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3zM9 12l2 2 4-4"],
    ["interests", "Interests", "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"],
    ["help", "Help and contact", "M4 5h16v11H9l-5 4V5z"],
    ["delete", "Delete account", "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6"],
  ];

  const node = (
    <div className="st-veil" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="st" role="dialog" aria-modal="true" aria-label="Settings" ref={box} tabIndex={-1}>
        <aside className="st-side">
          <button type="button" className="st-x" onClick={onClose} aria-label="Close settings"><I d="M6 6l12 12M18 6 6 18" /></button>
          <nav aria-label="Settings sections">
            {NAV.map(([id, label, d]) => <button key={id} type="button" className={tab === id ? "is-on" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}><I d={d} /><span>{label}</span></button>)}
          </nav>
          <a className="st-app" href="https://apps.apple.com/au/app/ared-field/id6794563712" target="_blank" rel="noopener noreferrer"><I d="M7 3h10v18H7zM11 18h2" /><span>ARED Field for iOS</span></a>
        </aside>
        <section className="st-main">
          {tab === "profile" && (
            <form onSubmit={save}>
              <h2>Profile</h2>
              {!f && !msg && <p className="st-note"><LineLoader inline size={18} label="Loading your settings" /></p>}
              {msg && !f && <p className="st-err" role="alert">{msg}</p>}
              {f && <>
                <label>Username<span className="st-at"><i>@</i><input value={f.username} onChange={set("username")} maxLength={24} autoCapitalize="none" spellCheck={false} placeholder="username" /></span></label>
                <label>Full name<input value={f.full_name} onChange={set("full_name")} maxLength={120} autoComplete="name" /></label>
                <label>Bio <em>{f.bio.length}/240</em><textarea value={f.bio} onChange={set("bio")} maxLength={240} rows={3} /></label>
                <label>Website<input value={f.website} onChange={set("website")} type="url" placeholder="https://" /></label>
                <div className="st-foot">
                  <button className="st-save" disabled={!dirty || state === "saving"}>{state === "saving" ? <LineLoader inline size={18} label="Saving" /> : "Save changes"}</button>
                  {state === "saved" && <span role="status" className="st-ok">Saved.</span>}
                  {state === "error" && <span role="alert" className="st-err">{msg}</span>}
                </div>
              </>}
            </form>
          )}
          {tab === "account" && (
            <div>
              <h2>Account details</h2>
              <p className="st-k">Email</p><p className="st-v">{f?.email || "…"}</p>
              <p className="st-k">Password</p>
              <p className="st-note">Passwords are changed through a secure link we email you.</p>
              <Link className="st-btn" href="/home-next/settings#account" onClick={onClose}>Change password</Link>
              <button type="button" className="st-btn st-btn--ghost" onClick={() => void signOutNow()}>Log out</button>
            </div>
          )}
          {tab === "display" && (
            <div>
              <h2>Display and language</h2>
              <p className="st-note">Night mode, larger text, readable text, higher contrast, reduced motion and link highlighting work on every page. Your language choice translates the interface.</p>
              <button type="button" className="st-btn" onClick={() => { onClose(); setTimeout(() => window.dispatchEvent(new CustomEvent("ared-open-display")), 60); }}>Open display controls</button>
              <p className="st-note" style={{ marginTop: 16 }}>These settings are stored on this device. You can also reach them any time from the Display button at the bottom left.</p>
            </div>
          )}
          {tab === "privacy" && (
            <div>
              <h2>Privacy and data</h2>
              <div className="st-row">
                <div><p className="st-k" style={{ margin: 0 }}>Share usage analytics</p><p className="st-note" style={{ margin: "2px 0 0" }}>Helps us see which parts of the archive are useful. Turn off to stop ARED recording your activity on this device.</p></div>
                <button type="button" role="switch" aria-checked={!optOut} aria-label="Share usage analytics" className={"st-sw" + (!optOut ? " on" : "")} onClick={toggleOptOut}><span /></button>
              </div>
              <div className="st-row">
                <div><p className="st-k" style={{ margin: 0 }}>Download your data</p><p className="st-note" style={{ margin: "2px 0 0" }}>A spreadsheet (CSV) of your profile and the collections, saves and notes linked to your account. Opens in Excel, Numbers or Google Sheets.</p></div>
                <a className="st-btn st-btn--ghost" href="/api/account/export" download>Download CSV</a>
              </div>
              <div className="st-row">
                <div><p className="st-k" style={{ margin: 0 }}>Clear this device</p><p className="st-note" style={{ margin: "2px 0 0" }}>Removes display, language and unfinished-save choices stored in this browser. Your account is not affected.</p></div>
                <button type="button" className="st-btn st-btn--ghost" onClick={clearDevice}>{cleared ? "Cleared" : "Clear"}</button>
              </div>
              <p className="st-note" style={{ marginTop: 18 }}><Link href="/privacy" onClick={onClose} className="st-link">Privacy policy</Link> · <Link href="/terms" onClick={onClose} className="st-link">Terms</Link> · <Link href="/home-next/help#contact" onClick={onClose} className="st-link">Ask about your data</Link></p>
            </div>
          )}
          {tab === "delete" && (
            <div>
              <h2>Delete account</h2>
              <p className="st-note">This permanently removes your account and the profile, collections and saves attached to it. It cannot be undone. Download your data first if you want a copy.</p>
              <label>Type your email address to confirm<input value={confirm} onChange={(e) => { setConfirm(e.target.value); setDel("idle"); }} type="email" autoComplete="off" placeholder={f?.email || "you@example.com"} /></label>
              <div className="st-foot">
                <button type="button" className="st-danger" disabled={!f || !emailConfirmed(confirm, f.email) || del === "working"} onClick={() => void deleteAccount()}>{del === "working" ? "Deleting…" : "Delete my account permanently"}</button>
                {del === "error" && <span role="alert" className="st-err">{delMsg}</span>}
              </div>
            </div>
          )}
          {tab === "interests" && (
            <div>
              <h2>Interests</h2>
              <p className="st-note">The subjects you choose steer For You. Your saves keep adding to them. Changes apply to new batches.</p>
              <Link className="st-btn" href="/home-next/preferences" onClick={onClose}>Edit your interests</Link>
            </div>
          )}
          {tab === "help" && (
            <div>
              <h2>Help and contact</h2>
              <p className="st-note">Guides for searching, saving and organising, and a way to reach the team.</p>
              <Link className="st-btn" href="/home-next/help" onClick={onClose}>Open Help</Link>
              <Link className="st-btn st-btn--ghost" href="/home-next/help#contact" onClick={onClose}>Contact us</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
  return createPortal(node, host ?? document.body);
}
