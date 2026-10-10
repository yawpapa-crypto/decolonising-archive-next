"use client";
import { useEffect, useRef, useState } from "react";

type Props = { url: string; title: string; text?: string; className?: string; style?: React.CSSProperties; label?: string };

const I = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
const SHARE = "M12 15V4M8 8l4-4 4 4M5 12v7h14v-7";

/** Share a record: the phone's own share sheet where there is one, otherwise a small menu. */
export default function ShareButton({ url, title, text, className, style, label = "Share" }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const abs = () => (url.startsWith("http") ? url : window.location.origin + url);

  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, [open]);

  const start = async () => {
    const data = { title, text: text || title, url: abs() };
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse && typeof navigator.share === "function") {
      try { await navigator.share(data); return; } catch (e) { if ((e as DOMException).name === "AbortError") return; }
    }
    setOpen((v) => !v);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(abs()); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* clipboard unavailable */ }
  };
  const enc = encodeURIComponent;
  const links = () => {
    const u = enc(abs()), t = enc(title);
    return [
      ["WhatsApp", `https://wa.me/?text=${t}%20${u}`],
      ["X", `https://twitter.com/intent/tweet?text=${t}&url=${u}`],
      ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
      ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`],
      ["Email", `mailto:?subject=${t}&body=${enc((text ? text + "\n\n" : "") + abs())}`],
    ] as const;
  };

  return (
    <span className="ared-share" ref={box}>
      <button type="button" className={className ?? "ared-share__btn"} style={style} onClick={start} aria-haspopup="menu" aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={SHARE} /></svg>{label}
      </button>
      {open && (
        <span className="ared-share__menu" role="menu" aria-label="Share this record">
          <button type="button" role="menuitem" onClick={copy}><I d="M9 9h10v10H9zM5 15V5h10" />{copied ? "Link copied" : "Copy link"}</button>
          {open && links().map(([name, href]) => (
            <a key={name} role="menuitem" href={href} target={name === "Email" ? undefined : "_blank"} rel="noopener noreferrer" onClick={() => setOpen(false)}>{name}</a>
          ))}
        </span>
      )}
    </span>
  );
}
