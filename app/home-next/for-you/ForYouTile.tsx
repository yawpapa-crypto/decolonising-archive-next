"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cachedImageSrc } from "@/lib/home/cached-image";
import { hash, type DiscoverItem } from "@/lib/home/discover-shared";

/** Content-only palette. The interface itself stays linen, ink, white and grey. */
const PALETTE = [
  // Each pairing clears WCAG AA (4.5:1) for the small labels printed on it.
  { bg: "#c9902f", fg: "#111111" },
  { bg: "#a94c1b", fg: "#ffffff" },
  { bg: "#8f1d21", fg: "#ffffff" },
  { bg: "#2447a8", fg: "#ffffff" },
  { bg: "#2f5a3b", fg: "#ffffff" },
  { bg: "#d7a3a1", fg: "#111111" },
  { bg: "#6b4a34", fg: "#ffffff" },
  { bg: "#e8c547", fg: "#111111" },
  { bg: "#26262a", fg: "#ffffff" },
  { bg: "#ece4d4", fg: "#111111" },
  { bg: "#6c5b8f", fg: "#ffffff" },
];

const LABEL: Record<DiscoverItem["kind"], string> = {
  image: "Image",
  object: "Object",
  book: "Book",
  article: "Article",
  chapter: "Chapter",
  essay: "Essay",
  collection: "Collection",
};

/** Deterministic proportions: the same record has the same shape on every render. */
export function tileRatio(item: DiscoverItem): number {
  if (item.ar) return item.ar;
  const h = hash(item.id);
  if (item.image) return [0.75, 0.8, 1, 1.25, 0.66, 0.9, 1.33, 0.7][h % 8];
  switch (item.kind) {
    case "book": return 0.68 + (h % 3) * 0.02;
    case "article": return [0.78, 0.86, 0.72][h % 3];
    case "chapter": return [0.74, 0.82][h % 2];
    case "essay": return [0.6, 0.66][h % 2];
    case "collection": return 1;
    default: return [0.8, 0.9, 1][h % 3];
  }
}

/* One shared observer marks cover titles that no longer fit (large text, narrow tiles), so they fade
   out cleanly instead of being sliced through a line of letters. The full title stays in the alt
   text and the record view. */
let clipObserver: ResizeObserver | null = null;
const markClip = (el: Element) => { const e = el as HTMLElement; e.toggleAttribute("data-clip", e.scrollHeight > e.clientHeight + 1); };
function watchClip(el: HTMLElement | null) {
  if (!el || typeof ResizeObserver === "undefined") return;
  clipObserver ??= new ResizeObserver((entries) => entries.forEach((en) => markClip(en.target)));
  const ro = clipObserver;
  ro.observe(el);
  markClip(el);
  return () => ro.unobserve(el); // React 19 runs this when the tile unmounts
}

function titleSize(title: string, kind: DiscoverItem["kind"]) {
  const n = title.length;
  const base = kind === "book" ? 1.0 : kind === "essay" ? 0.95 : 0.9;
  const scale = n < 28 ? 1.35 : n < 55 ? 1.1 : n < 95 ? 0.92 : 0.78;
  return `max(var(--fy-title-min, 0px), calc(${(base * scale * 7.7).toFixed(2)}cqw * var(--fy-title-scale, 1)))`;
}

export interface TileProps {
  item: DiscoverItem;
  priority?: boolean;
  saved: boolean;
  target: string;
  onSave: (item: DiscoverItem) => void;
  onPick: (item: DiscoverItem, rect: DOMRect) => void;
  onWhy: (item: DiscoverItem, rect: DOMRect) => void;
  onOpen?: (item: DiscoverItem) => void;
  /** Visual only: no link, no controls (used for the large view). */
  bare?: boolean;
  restricted?: boolean;
}

export default function ForYouTile({ item, priority, saved, target, onSave, onPick, onWhy, onOpen, bare, restricted }: TileProps) {
  // A failed image is never shown as a hole: the tile becomes a typographic object instead.
  const [bad, setBad] = useState(false);
  const [copied, setCopied] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // An image that failed before hydration never fires onError, so check it once mounted.
  useEffect(() => {
    const el = imgRef.current;
    const frame = requestAnimationFrame(() => {
      if (el && el.complete && el.naturalWidth === 0) setBad(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const hasImage = Boolean(item.image) && !bad;
  const ratio = bad && item.image ? tileRatio({ ...item, image: undefined, ar: undefined }) : tileRatio(item);
  const linkProps = item.external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const label = LABEL[item.kind];
  const isBook = item.kind === "book";
  const isCollection = item.kind === "collection";
  const c = PALETTE[hash(`${item.kind}:${item.title}`) % PALETTE.length];

  const pubStyle = hasImage
    ? undefined
    : {
        background: isBook ? c.bg : isCollection ? "var(--color-ink-black)" : `color-mix(in srgb, ${c.bg} 20%, var(--fy-tint-base, #ffffff))`,
        color: isBook ? c.fg : isCollection ? "var(--color-linen-canvas)" : "var(--color-ink-black)",
        ["--sheet" as string]: c.bg,
      };

  const content = hasImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={cachedImageSrc(item.image!)}
      alt={item.alt ?? item.title}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={() => { setBad(true); try { navigator.sendBeacon?.("/api/visual/report", new Blob([JSON.stringify({ url: item.image })], { type: "application/json" })); } catch {} }}
      onLoad={(e) => {
        // Some providers answer 200 with a 1px placeholder: treat that as no image.
        if (e.currentTarget.naturalWidth < 20) setBad(true);
      }}
    />
  ) : (
    <span className="fy-t__in">
      <span className="fy-t__top">
        <span className="fy-t__dot" style={{ background: isBook ? "currentColor" : c.bg }} aria-hidden />
        <span className="fy-t__kind">{label}{item.year ? ` · ${item.year}` : ""}</span>
      </span>
      <span ref={watchClip} className="fy-t__big" style={{ fontSize: titleSize(item.title, item.kind) }}>{item.title}</span>
      {item.abstract && item.kind === "essay" && <span className="fy-t__abs">{item.abstract}</span>}
      <span className="fy-t__meta">
        {item.authors && <span className="fy-t__who">{item.authors}</span>}
        {(item.venue || item.source) && (
          <span className="fy-t__row">
            <span>{item.venue ?? item.source}</span>
            {item.year && <span className="fy-t__yr">{item.year}</span>}
          </span>
        )}
      </span>
    </span>
  );

  const fam = ({ book: "book", article: "article", chapter: "paper", essay: "document", collection: "collection" } as Record<string, string>)[item.kind] ?? "source";
  const cls = `fy-t ${hasImage ? "fy-t--img" : `fy-t--pub fy-t--${item.kind} fy-t--fam-${fam}`}`;
  const sizing = { aspectRatio: String(ratio), ...pubStyle };

  if (bare) {
    return (
      <div className={`${cls} fy-t--bare`} style={sizing}>
        <div className="fy-t__link">{content}</div>
      </div>
    );
  }

  return (
    <div className={cls} style={sizing} data-fy-id={item.id} data-archive-record-id={item.id}>
      <Link
        href={item.href}
        {...linkProps}
        className="fy-t__link"
        aria-label={`${label}: ${item.title}`}
        onClick={(e) => {
          if (restricted) { e.preventDefault(); window.dispatchEvent(new Event("ared-signup-required")); return; }
          if (!onOpen || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || isCollection) return;
          e.preventDefault();
          onOpen(item);
        }}
      >
        {content}
      </Link>

      {item.why && <button type="button" className="fy-t__context" aria-label="Why this?" aria-haspopup="dialog" onClick={(e)=>onWhy(item,e.currentTarget.getBoundingClientRect())}>?</button>}
      {hasImage && (
        <span className="fy-t__cap" aria-hidden>
          <span className="fy-t__capt">{item.title}</span>
          <span className="fy-t__caps">{[label, item.year, item.source].filter(Boolean).join(" · ")}</span>
        </span>
      )}

      {hasImage && item.photographer && item.credit && <p className="fy-photo-credit">Photo by <a href={item.credit}>{item.photographer}</a> on <a href="https://unsplash.com/?utm_source=decolonising_archive&utm_medium=referral">Unsplash</a></p>}
      {!isCollection && (
        <div className="fy-t__ctl">
          <button type="button" className="fy-pill fy-pill--glass" aria-haspopup="dialog" onClick={(e) => onPick(item, e.currentTarget.getBoundingClientRect())}>
            <span className="fy-pill__lab">{target}</span>
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 5 5 5-5" /></svg>
          </button>
          <button type="button" className={`fy-pill fy-pill--save${saved ? " is-saved" : ""}`} aria-pressed={saved} onClick={() => onSave(item)}>
            {saved ? "Saved" : "Save"}
          </button>
          <button type="button" className="fy-pill fy-pill--glass fy-pill--cite" aria-label={copied ? "Citation copied" : "Copy citation"} title="Copy citation" onClick={() => {
            const where = item.source ?? item.venue;
            const url = typeof window !== "undefined" ? new URL(item.href || "/", window.location.origin).toString() : item.href;
            const text = [item.title, where, item.year, url].filter(Boolean).join(". ");
            void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); });
          }}>
            {copied ? (
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
            ) : (
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="9" height="9" rx="2" /><path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" /></svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
