"use client";

export type Density = 0 | 1 | 2;
export const DENSITY_TILE: Record<Density, number> = { 0: 150, 1: 220, 2: 320 };
const DENSITY_NAME: Record<Density, string> = { 0: "Compact", 1: "Comfortable", 2: "Large" };

const I = (p: { d: string }) => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={p.d} /></svg>
);

export const PERIODS = ["Any period", "Before 1900", "1900 to 1960", "1960 to 2000", "2000 onwards"] as const;
/* Shown beside the clock when the labels are hidden on narrow screens, so the chosen period stays visible. */
const PERIOD_SHORT = ["", "<1900", "1900–60", "1960–2000", "2000+"] as const;

export interface DockProps {
  period: number;
  onPeriod: () => void;
  density: Density;
  onDensity: (d: Density) => void;
  imagesOnly: boolean;
  onImagesOnly: () => void;
  oaOnly: boolean;
  onOaOnly: () => void;
  drift: boolean;
  onDrift: () => void;
  onShuffle: () => void;
  onSaveView: (rect: DOMRect) => void;
  busy: boolean;
  saving?: boolean;
}

/** A floating tool bar: zoom, filters, drift, shuffle, and save-what-is-on-screen. */
export default function FeedDock(p: DockProps) {
  return (
    <div className="fy-dock" role="toolbar" aria-label="Feed tools">
      <div className="fy-dock__grp" role="group" aria-label="Zoom">
        <button type="button" className="fy-dock__b fy-dock__b--ico" aria-label="Zoom out: smaller tiles" title="Smaller tiles" disabled={p.density === 0} onClick={() => p.onDensity((p.density - 1) as Density)}><I d="M5 10h10" /></button>
        <span className="fy-dock__lab" aria-live="polite">{DENSITY_NAME[p.density]}</span>
        <button type="button" className="fy-dock__b fy-dock__b--ico" aria-label="Zoom in: larger tiles" title="Larger tiles" disabled={p.density === 2} onClick={() => p.onDensity((p.density + 1) as Density)}><I d="M5 10h10M10 5v10" /></button>
      </div>
      <span className="fy-dock__sep" aria-hidden />
      <button type="button" className="fy-dock__b" aria-pressed={p.imagesOnly} onClick={p.onImagesOnly} aria-label="With images only" title="Only records with images"><I d="M3.5 5.5h13v9h-13zM3.5 13l4-4 3 3 2-2 4 4" /><span>With images</span></button>
      <button type="button" className="fy-dock__b" aria-pressed={p.oaOnly} onClick={p.onOaOnly} aria-label="Open access only" title="Only records the source marks as open access or freely licensed"><I d="M7 9V6.5a3 3 0 0 1 5.8-1M5 9h10v7H5z" /><span>Open access</span></button>
      <button type="button" className="fy-dock__b" aria-pressed={p.period > 0} onClick={p.onPeriod} aria-label={`Period: ${PERIODS[p.period]}. Next: ${PERIODS[(p.period + 1) % PERIODS.length]}`} title={`Period: ${PERIODS[p.period]} (click for ${PERIODS[(p.period + 1) % PERIODS.length]})`}><I d="M10 4.5v5.5l3.5 2M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" /><span>{PERIODS[p.period]}</span>{p.period > 0 && <b className="fy-dock__short" aria-hidden>{PERIOD_SHORT[p.period]}</b>}</button>
      <span className="fy-dock__sep" aria-hidden />
      <button type="button" className="fy-dock__b" aria-pressed={p.drift} onClick={p.onDrift} aria-label={p.drift ? "Pause drift" : "Drift: scroll the feed slowly by itself"} title={p.drift ? "Pause drift" : "Drift: the feed scrolls slowly by itself"}><I d={p.drift ? "M7 5v10M13 5v10" : "m7 4.5 8 5.5-8 5.5z"} /><span>{p.drift ? "Pause" : "Drift"}</span></button>
      <button type="button" className="fy-dock__b" onClick={p.onShuffle} disabled={p.busy} aria-busy={p.busy} aria-label={p.busy ? "Shuffling" : "Shuffle the feed"} title="Shuffle the feed"><I d="M3.5 6h3l7 8h3M3.5 14h3l2-2.4M11.5 8.4 13.5 6h3M14.5 4l2 2-2 2M14.5 12l2 2-2 2" /><span>Shuffle</span></button>
      <span className="fy-dock__sep" aria-hidden />
      <button type="button" className="fy-dock__b fy-dock__b--solid" disabled={p.saving} aria-busy={p.saving} aria-label={p.saving ? "Saving what’s in view" : "Save what’s in view"} title="Save every record on screen" onClick={(e) => p.onSaveView(e.currentTarget.getBoundingClientRect())}><I d="M5.5 3.5h9v13L10 13l-4.5 3.5z" /><span>Save what&rsquo;s in view</span></button>
    </div>
  );
}
