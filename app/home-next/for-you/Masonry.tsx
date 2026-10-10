"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { tileRatio } from "./ForYouTile";
import type { DiscoverItem } from "@/lib/home/discover-shared";

const GAP = 12;

/** Roughly 220px tiles, as in the reference: 2 columns on a phone, 6 on a laptop, 9 on a wide display. */
export function columnsFor(width: number, min = 2, tile = 220) {
  return Math.max(min, Math.min(14, Math.floor((width + GAP) / (tile + GAP))));
}

/**
 * Stable masonry in plain CSS flex columns. Each item is placed once, in the
 * shortest column, from its known aspect ratio, so appending never moves what is on screen.
 */
export default function Masonry({
  items,
  render,
  leading,
  fixed,
  tile = 220,
  gap = GAP,
}: {
  items: DiscoverItem[];
  render: (item: DiscoverItem, index: number, cols: number) => ReactNode;
  leading?: { node: ReactNode; ratio: number };
  /** Fixed grid (used by the pannable canvas): this many columns of this width. */
  fixed?: { cols: number; colWidth: number };
  /** Target tile width in px (the zoom control). */
  tile?: number;
  gap?: number;
}) {
  const [measured, setMeasured] = useState(5);
  const isFixed = Boolean(fixed);
  const cols = fixed ? fixed.cols : measured;
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (isFixed) return;
    const ro = new ResizeObserver(([e]) => setMeasured(columnsFor(e.contentRect.width, 2, tile)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [isFixed, tile]);

  const columns = useMemo(() => {
    const out: Array<Array<{ item?: DiscoverItem; index: number }>> = Array.from({ length: cols }, () => []);
    const heights = new Array(cols).fill(0);
    const place = (entry: { item?: DiscoverItem; index: number }, ratio: number) => {
      let c = 0;
      for (let i = 1; i < cols; i++) if (heights[i] < heights[c] - 0.001) c = i;
      out[c].push(entry);
      heights[c] += 1 / ratio + 0.02;
    };
    if (leading) place({ index: -1 }, leading.ratio);
    items.forEach((item, index) => place({ item, index }, tileRatio(item)));
    return out;
  }, [items, cols, leading]);

  return (
    <div ref={host} className="fy-field" style={{ gap, ...(fixed ? { width: "max-content" } : null) }} data-testid="field">
      {columns.map((col, i) => (
        <div key={i} className="fy-col" style={{ gap, ...(fixed ? { flex: "none", width: fixed.colWidth } : null) }}>
          {col.map((e) => (e.item ? render(e.item, e.index, cols) : <div key="leading">{leading?.node}</div>))}
        </div>
      ))}
    </div>
  );
}
