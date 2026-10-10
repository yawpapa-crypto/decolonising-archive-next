"use client";
import { useEffect, useRef, useState } from "react";

/** A quiet tab on the right edge. Opens a one-field sign-up that goes straight to Brevo. */
export default function NewsletterTab() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) input.current?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending"); setMsg("");
    try {
      const r = await fetch("/api/newsletter/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, source: "home" }) });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
      if (!r.ok || !d.ok) { setState("error"); setMsg(d.error ?? "Could not subscribe. Try again."); return; }
      setState("done"); setMsg(d.message ?? "You are subscribed.");
    } catch { setState("error"); setMsg("No connection. Try again in a moment."); }
  }
  return (
    <aside className={`nl${open ? " is-open" : ""}`} aria-label="Newsletter">
      <button type="button" className="nl-tab" aria-expanded={open} onClick={() => setOpen((v) => !v)}>Newsletter</button>
      {open && (
        <div className="nl-panel">
          <button type="button" className="nl-x" aria-label="Close newsletter" onClick={() => setOpen(false)}>✕</button>
          <h2>Join the newsletter</h2>
          <p>New records, sources and research from the archive, in your inbox. No noise.</p>
          {state === "done" ? <p className="nl-ok" role="status">{msg}</p> : (
            <form onSubmit={submit}>
              <label className="nl-sr" htmlFor="nl-email">Email address</label>
              <input id="nl-email" ref={input} type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button type="submit" disabled={state === "sending"}>{state === "sending" ? "Subscribing…" : "Subscribe"}</button>
            </form>
          )}
          {state === "error" && <p className="nl-err" role="alert">{msg}</p>}
        </div>
      )}
    </aside>
  );
}
