"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ContributionForm from "./ContributionForm";
import "../ui/ui.css";

/** "Help the archive" as a dialog: opens in place, keeps your scroll position and your writing. */
export default function ProposeDialog({ record, className, children = "Propose a correction or connection ↗" }: { record: string; className?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
      if (e.key === "Tab" && box.current) {
        const f = [...box.current.querySelectorAll<HTMLElement>("button,input,textarea,a[href],[tabindex]:not([tabindex='-1'])")].filter((x) => !x.hasAttribute("disabled"));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("keydown", key, true); document.body.style.overflow = overflow; prev?.focus?.({ preventScroll: true }); };
  }, [open]);
  return (
    <>
      <button ref={trigger} type="button" className={className ?? "pd-link"} onClick={() => setOpen(true)}>{children}</button>
      {open && createPortal(
        <div className="pd-veil" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="pd-box" role="dialog" aria-modal="true" aria-labelledby="pd-title" tabIndex={-1} ref={box}>
            <button type="button" className="pd-x" aria-label="Close" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <h2 id="pd-title">Help the archive tell a fuller story.</h2>
            <p className="pd-lede">Propose a correction, connection, source or missing attribution. Evidence comes first, and every proposal is reviewed before it changes the public archive.</p>
            <ContributionForm record={record} onDone={() => setOpen(false)} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
