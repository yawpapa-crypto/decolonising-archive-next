/**
 * The archive's waiting mark: a single ink line draws a Sankofa heart, curls in on itself, and
 * lets go, on a loop. Pure CSS (no JS, no timers), so it only ever fills time that is already
 * being spent — it never adds any. Reduced motion shows the finished drawing, still.
 */
export default function LineLoader({ size = 64, label, inline = false }: { size?: number; label?: string; inline?: boolean }) {
  return (
    <span className={`cz-load${inline ? " cz-load--inline" : ""}`} role="status" aria-live="polite">
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path className="cz-load__heart" pathLength={1} d="M50 86C33 72 15 59 15 38c0-13 9-22 20-22 9 0 15 7 15 15 0-8 6-15 15-15 11 0 20 9 20 22 0 21-18 34-35 48Z" />
        <path className="cz-load__curl cz-load__curl--l" pathLength={1} d="M40 47c-8 1-12-9-5-13 6-3 11 3 8 7-2 3-6 1-5-2" />
        <path className="cz-load__curl cz-load__curl--r" pathLength={1} d="M60 47c8 1 12-9 5-13-6-3-11 3-8 7 2 3 6 1 5-2" />
        <path className="cz-load__stem" pathLength={1} d="M50 31v20" />
      </svg>
      {label && <span className="cz-load__label">{label}</span>}
    </span>
  );
}
