"use client";
import LineLoader from "@/app/home-next/ui/LineLoader";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const APP_STORE = "https://apps.apple.com/au/app/ared-field/id6794563712";

/** iPhone goes to the App Store. Android is in testing, so people leave an email to be invited. */
export default function AppDownload({ className, label = "Download our app", id }: { className?: string; label?: string; id?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    (box.current?.querySelector<HTMLInputElement>("#app-email") ?? box.current)?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); prev?.focus?.({ preventScroll: true }); };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending"); setMsg("");
    try {
      const r = await fetch("/api/android-testers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) { setState("error"); setMsg(d.error ?? "Something went wrong. Try again."); return; }
      setState("done");
    } catch {
      setState("error"); setMsg("No connection. Try again in a moment.");
    }
  }

  return (
    <>
      <button ref={trigger} type="button" id={id} className={className} onClick={() => { setHost(trigger.current?.closest<HTMLElement>(".ared-home") ?? document.body); setOpen(true); setState("idle"); }}>{label}</button>
      {open && host && createPortal(<div className="app-veil" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="app-box" role="dialog" aria-modal="true" aria-labelledby="app-title" tabIndex={-1} ref={box}>
            <button type="button" className="app-x" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
            <h2 id="app-title">Get ARED Field</h2>
            <a className="app-row" href={APP_STORE} target="_blank" rel="noopener noreferrer"><span>iPhone and iPad</span><span>App Store ↗</span></a>
            <div className="app-row app-row--android">
              <span>Android</span>
              <span className="app-note">In testing now. Leave your email and we will invite you to the testers.</span>
              {state === "done" ? (
                <p className="app-ok" role="status">Thank you. We will email you when your invitation is ready.</p>
              ) : (
                <form onSubmit={submit}>
                  <label className="app-sr" htmlFor="app-email">Email address</label>
                  <input id="app-email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <button type="submit" disabled={state === "sending"}>{state === "sending" ? <LineLoader inline size={18} label="Sending" /> : "Join the testers"}</button>
                </form>
              )}
              {state === "error" && <p className="app-err" role="alert">{msg}</p>}
            </div>
          </div>
        </div>, host)}
    </>
  );
}
