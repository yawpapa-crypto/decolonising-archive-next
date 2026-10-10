"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type SavedRow = {
  record_id: string; record_title: string | null; record_source: string | null; record_source_url: string | null;
  record_type: string | null; record_year: string | null; record_metadata: { image?: string; collectionSlug?: string } | null;
};
export type Tile = { id: string; title: string; meta: string; image?: string; href: string; external: boolean };

export function toTile(r: SavedRow): Tile {
  const slug = r.record_metadata?.collectionSlug;
  const ext = !slug && !!r.record_source_url;
  return {
    id: r.record_id,
    title: r.record_title || "Untitled record",
    meta: [r.record_source, r.record_year].filter(Boolean).join(" · "),
    image: r.record_metadata?.image,
    href: slug ? `/collections/${slug}/records/${encodeURIComponent(r.record_id)}` : r.record_source_url || "#",
    external: ext,
  };
}

/** Grid size is the same setting as the account menu and the feed: 0 small, 1 medium, 2 large. */
export function useGridSize(): [number, (n: number) => void] {
  const [n, setN] = useState(1);
  useEffect(() => {
    try { const g = localStorage.getItem("ared-density"); if (g === "0" || g === "2") setN(Number(g)); } catch { /* ignore */ }
    const on = (e: Event) => { const v = (e as CustomEvent<number>).detail; if (v === 0 || v === 1 || v === 2) setN(v); };
    window.addEventListener("ared-density", on);
    return () => window.removeEventListener("ared-density", on);
  }, []);
  const set = useCallback((v: number) => {
    setN(v);
    try { localStorage.setItem("ared-density", String(v)); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("ared-density", { detail: v }));
  }, []);
  return [n, set];
}

export function SizeControl({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="rg-seg" role="group" aria-label="Grid size">
      {["I", "II", "III"].map((l, i) => <button key={l} type="button" aria-pressed={value === i} aria-label={`Grid size ${l}`} onClick={() => onChange(i)}>{l}</button>)}
    </div>
  );
}

const MIN = [150, 220, 320];

export default function RecordGrid({ tiles, size, onRemove, removeLabel = "Remove" }: { tiles: Tile[]; size: number; onRemove?: (t: Tile) => void; removeLabel?: string }) {
  return (
    <ul className="rg" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${MIN[size]}px, 1fr))` }}>
      {tiles.map((t) => {
        const inner = (
          <>
            <span className="rg-img">{t.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={t.image} alt="" loading="lazy" decoding="async" /> : <span className="rg-ph" aria-hidden>{t.title.slice(0, 1)}</span>}</span>
            <strong>{t.title}</strong>
            {t.meta && <small>{t.meta}</small>}
          </>
        );
        return (
          <li key={t.id}>
            {t.external ? <a href={t.href} target="_blank" rel="noopener noreferrer" className="rg-card">{inner}</a> : <Link href={t.href} className="rg-card">{inner}</Link>}
            {onRemove && <button type="button" className="rg-x" onClick={() => onRemove(t)} aria-label={`${removeLabel}: ${t.title}`}>{removeLabel}</button>}
          </li>
        );
      })}
    </ul>
  );
}
