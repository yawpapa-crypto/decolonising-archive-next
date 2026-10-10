"use client";
import { useEffect, useRef, useState } from "react";
import type { Activity } from "@/lib/following/server";
import { aredEvent } from "@/lib/events/client";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const read = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
export const write = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify([...new Set(v)].slice(-300))); window.dispatchEvent(new Event("ared-follows-changed")); } catch { /* storage unavailable */ } };

/** Feedback controls for one feed event. Everything is local and reversible; unfollow also calls the API for signed-in members. */
export default function EventMenu({ a, onHide }: { a: Activity; onHide: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState(false);
  const [msg, setMsg] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  const actor = a.actor?.id ?? "";
  const name = a.actor?.name ?? "this curator";
  const done = (m: string) => { setMsg(m); setOpen(false); window.setTimeout(() => setMsg(""), 3500); };
  return (
    <div className="cf-menu" ref={box}>
      <button type="button" className="cf-menu__btn" aria-label="More options for this item" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {open && (
        <ul className="cf-menu__list" role="menu">
          <li role="none"><button role="menuitem" onClick={() => { setWhy((w) => !w); setOpen(false); }}>Why am I seeing this?</button></li>
          <li role="none"><button role="menuitem" onClick={() => { write("ared-feed-more", [...read("ared-feed-more"), actor]); write("ared-feed-less", read("ared-feed-less").filter((x) => x !== actor)); done(`You will see more from ${name}.`); }}>Show more like this</button></li>
          <li role="none"><button role="menuitem" onClick={() => { write("ared-feed-less", [...read("ared-feed-less"), actor]); write("ared-feed-more", read("ared-feed-more").filter((x) => x !== actor)); aredEvent("less_like_this", `profile:${actor}`); onHide(a.id); done(`You will see less from ${name}.`); }}>Show less from {name}</button></li>
          <li role="none"><button role="menuitem" onClick={() => { write("ared-feed-hidden", [...read("ared-feed-hidden"), a.id]); aredEvent("less_like_this", `collection:${a.collection.id}`); onHide(a.id); }}>Not interested</button></li>
          <li role="none"><button role="menuitem" onClick={async () => {
            if (uuid.test(actor)) { try { await fetch("/api/following", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: actor, kind: "profile", follow: false }) }); } catch { /* offline */ } }
            write("ared-follow-sources", read("ared-follow-sources").filter((k) => k !== `s-${actor}`));
            onHide(a.id); done(`Unfollowed ${name}.`);
          }}>Unfollow {name}</button></li>
        </ul>
      )}
      {why && <p className="cf-why" role="note">{a.why ?? "Shown because it is recent public activity in the archive."}</p>}
      {msg && <p className="cf-toast" role="status">{msg}</p>}
    </div>
  );
}
