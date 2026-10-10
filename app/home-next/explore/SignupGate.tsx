"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./explore.css";
import { returnUrlWithPending } from "../pending-save";

/** Visitors can browse freely; saves and collections require an account. */
function host(): HTMLElement {
  const h = document.querySelector("div.ared-home.ex-ui, div.ared-home.fy-root, div.ared-home:has(main.fy)") as HTMLElement | null;
  if (h) return h;
  let w = document.getElementById("sg-host");
  if (!w) { w = document.createElement("div"); w.id = "sg-host"; w.className = "ared-home"; w.style.cssText = "position:static;min-height:0;height:0;overflow:visible;background:none"; document.body.appendChild(w); }
  return w;
}

export default function SignupGate() {
  const [show, setShow] = useState(false);
  const [reason, setReason] = useState<"save" | "collection">("save");
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const request = (e: Event) => { setReason((e as CustomEvent).detail?.reason === "collection" ? "collection" : "save"); setShow(true); };
    window.addEventListener("ared-signup-required", request);
    return () => window.removeEventListener("ared-signup-required", request);
  }, []);
  useEffect(() => {
    if (!show) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    card.current?.querySelector<HTMLElement>("a")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setShow(false); return; }
      if (event.key !== "Tab") return;
      const links = card.current?.querySelectorAll<HTMLElement>("a, button");
      if (!links?.length) return;
      const first = links[0], last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap, true);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", trap, true); previousFocus?.focus(); };
  }, [show]);
  if (!show) return null;
  const next = encodeURIComponent(returnUrlWithPending());
  return createPortal(<div className="sg" role="dialog" aria-modal="true" aria-labelledby="signup-gate-title" onMouseDown={(e) => { if (e.target === e.currentTarget) setShow(false); }}><div ref={card} className="sg-card"><button type="button" className="sg-x" aria-label="Close" onClick={() => setShow(false)}>×</button><p className="sg-k">{reason === "collection" ? "Your collections" : "Your library"}</p><h2 id="signup-gate-title">{reason === "collection" ? "Build your own collection" : "Keep this for later"}</h2><p className="sg-p">{reason === "collection" ? "Create an account to organise records into collections. We will remember the record you chose." : "Create an account to save records and build your own collections. We will remember the record you chose."}</p><Link href={`/signup?next=${next}`} className="sg-btn">Create account</Link><p className="sg-s">Already have an account? <Link href={`/signin?next=${next}`}>Sign in</Link></p><button type="button" className="sg-later" onClick={() => setShow(false)}>Keep browsing</button></div></div>, host());
}
