"use client";
import { useEffect, useId, useRef, useState } from "react";
import "./ui.css";

/** Accessible listbox used everywhere in place of a native select. */
export type Opt = { value: string; label: string; hint?: string };

/** Accessible listbox in place of a native select, so the control matches the rest of the interface. */
export default function Select({ name, label, options, value, onChange, compact }: { name: string; label: string; options: Opt[]; value: string; onChange: (v: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const cur = options.find((o) => o.value === value) ?? options[0];
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  const pick = (o: Opt) => { onChange(o.value); setOpen(false); };
  return (
    <div className={`st-field${compact ? " st-field--compact" : ""}`} ref={box}>
      <span className={compact ? "st-sr" : "st-label"} id={`${id}-l`}>{label}</span>
      <input type="hidden" name={name} value={value} />
      <button
        type="button" className="st-select" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${id}-l ${id}-b`} id={`${id}-b`}
        onClick={() => { setOpen((o) => !o); setHi(Math.max(0, options.findIndex((o) => o.value === value))); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!open) { setOpen(true); return; } setHi((h) => (h + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length); }
          else if ((e.key === "Enter" || e.key === " ") && open) { e.preventDefault(); pick(options[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      >
        <span>{cur.label}</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <ul className="st-list" role="listbox" aria-labelledby={`${id}-l`}>
          {options.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value} className={i === hi ? "is-hi" : ""} onMouseEnter={() => setHi(i)} onClick={() => pick(o)}>
              <strong>{o.label}</strong>{o.hint && <em>{o.hint}</em>}
              {o.value === value && <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

