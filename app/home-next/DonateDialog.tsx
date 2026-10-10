"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const KOFI = "https://ko-fi.com/areddesign";

/** A button that opens a short case for donating, with one clear way through to Ko-fi. */
export default function DonateDialog({ className, children = "Donate to ARED" }: { className?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); prev?.focus?.({ preventScroll: true }); };
  }, [open]);
  return (
    <>
      <button ref={trigger} type="button" className={className} onClick={() => { setHost(trigger.current?.closest<HTMLElement>(".ared-home") ?? document.body); setOpen(true); }}>{children}</button>
      {open && host && createPortal(<div className="dn-veil" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="dn-box" role="dialog" aria-modal="true" aria-labelledby="dn-title" tabIndex={-1} ref={box}>
            <button type="button" className="dn-x" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
            <p className="dn-eyebrow">Support the archive</p>
            <h2 id="dn-title">Keep African and Global South knowledge open, free and growing.</h2>
            <p>The Decolonising Archive is an independent, open-access project. It gathers design knowledge, photographs, records and research from communities too often left out of the archive, and it keeps them free to read for everyone.</p>
            <p>Your gift pays for the work behind the screen: finding and checking sources, crediting them properly, building the tools to search them, and keeping the platform online. Every contribution, large or small, goes back into the archive.</p>
            <a className="dn-go" href={KOFI} target="_blank" rel="noopener noreferrer">Donate on Ko-fi <span aria-hidden>↗</span></a>
            <button type="button" className="dn-later" onClick={() => setOpen(false)}>Maybe later</button>
          </div>
        </div>, host)}
    </>
  );
}
