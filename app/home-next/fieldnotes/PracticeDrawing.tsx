const STEPS: Array<{ label: string; paths: string[] }> = [
  { label: "Search", paths: ["M-54 -8 A46 46 0 1 1 38 -8 A46 46 0 1 1 -54 -8", "M26 26 L68 68", "M-30 -8 H12 M-30 10 H-2"] },
  { label: "Read", paths: ["M-72 -45 Q-36 -60 0 -40 Q36 -60 72 -45 V50 Q36 36 0 54 Q-36 36 -72 50 Z", "M0 -40 V54", "M-56 -20 Q-36 -26 -16 -18 M-56 0 Q-36 -6 -16 2 M16 -18 Q36 -26 56 -20 M16 2 Q36 -6 56 0"] },
  { label: "Find heritage sites", paths: ["M-72 -10 L0 -60 L72 -10 Z", "M-50 -2 V44 M-17 -2 V44 M17 -2 V44 M50 -2 V44", "M-76 54 H76 M-64 44 H64"] },
  { label: "Research", paths: ["M-48 -58 L36 -62 L40 54 L-44 58 Z", "M-30 -60 L-26 56 M-10 -28 H22 M-10 -4 H16 M-10 20 H22", "M46 -42 L58 -38 L32 30 L22 40 L24 22 Z"] },
  { label: "Qualitative tools", paths: ["M-72 -52 H18 V8 H-30 L-50 30 V8 H-72 Z", "M-56 -32 H2 M-56 -14 H-12", "M28 -34 H58 L76 -16 L58 2 H28 Z M62 -16 A4 4 0 1 1 54 -16 A4 4 0 1 1 62 -16", "M-4 32 H62 M-4 50 H44"] },
  { label: "Collect", paths: ["M-72 -26 H-38 L-26 -12 H72 L62 54 H-82 Z", "M-52 -26 V-52 H-8 V-26 M4 -12 L8 -58 L54 -52 L50 -12", "M-62 8 H52 M-66 28 H48"] },
];
const ARROW = "M0 0 Q22 -20 50 0 M36 -12 L50 0 L34 4";

/** A continuous, self-redrawing line drawing of what the app does. CSS only, no controls. */
export default function PracticeDrawing() {
  const W = 1800;
  const gap = W / STEPS.length;
  return (
    <div className="fn-pen-story" aria-label="Search, read, find heritage sites, research, use qualitative tools, collect">
      <svg viewBox={`0 0 ${W} 300`} role="img" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {STEPS.map((s, i) => {
            const cx = gap * i + gap / 2;
            return (
              <g key={s.label} style={{ ["--i" as string]: i }}>
                <g transform={`translate(${cx} 120)`}>
                  {s.paths.map((d, k) => <path key={k} pathLength={1} d={d} className="pen-p" />)}
                </g>
                {i < STEPS.length - 1 && <g transform={`translate(${cx + gap / 2 - 25} 128)`}><path pathLength={1} d={ARROW} className="pen-p pen-p--arrow" /></g>}
                <text x={cx} y="262" className="pen-t" textAnchor="middle" fill="currentColor" stroke="none">{s.label}</text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
