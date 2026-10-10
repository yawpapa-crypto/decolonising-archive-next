/**
 * The floating archive field. One flat list, positioned in page coordinates so objects
 * can cross section boundaries: x in vw (top-left, may be negative or past 100 to crop
 * against the viewport), y in svh from the top of the canvas.
 *
 * w px at desktop · ar width/height · r tilt deg · s scroll drift -1..1 (sign = direction)
 * d pointer depth 0..1 · o opacity · from edge it enters from · m mobile [x, y, w] (omit = hidden)
 */
export type FieldObject = {
  x: number; y: number; w: number; ar: number; r: number; s: number; d: number; o: number;
  from?: "l" | "r";
  m?: readonly [number, number, number];
};

const ALL: readonly FieldObject[] = [
  /* Hero: dense, irregular, cropped by the viewport; the copy box (26-74vw, 28-72svh) stays clear */
  { x: -2, y: 14, w: 118, ar: 0.8, r: -22, s: 0.5, d: 0.9, o: 1, m: [-7, 15, 96] },
  { x: 10, y: 32, w: 84, ar: 1, r: 12, s: -0.3, d: 0.6, o: 1 },
  { x: 21, y: 10, w: 96, ar: 1.2, r: -14, s: 0.4, d: 0.7, o: 1, m: [22, 11, 70] },
  { x: 6, y: 57, w: 128, ar: 0.9, r: 8, s: -0.6, d: 1, o: 1, m: [-6, 66, 100] },
  { x: 19, y: 74, w: 72, ar: 1, r: -20, s: 0.3, d: 0.5, o: 0.9 },
  { x: 29, y: 90, w: 100, ar: 0.85, r: 16, s: -0.4, d: 0.8, o: 1, m: [14, 86, 84] },
  { x: 41, y: 84, w: 76, ar: 1.1, r: -12, s: 0.5, d: 0.4, o: 0.8 },
  { x: 58, y: 91, w: 90, ar: 1, r: 14, s: -0.5, d: 0.5, o: 0.9, m: [58, 88, 78] },
  { x: 70, y: 82, w: 110, ar: 0.8, r: -10, s: 0.4, d: 0.7, o: 1, m: [78, 80, 96] },
  { x: 80, y: 70, w: 70, ar: 1.2, r: 18, s: -0.3, d: 0.6, o: 0.9 },
  { x: 90, y: 57, w: 132, ar: 0.9, r: -8, s: 0.6, d: 1, o: 1, m: [92, 62, 100] },
  { x: 98, y: 38, w: 100, ar: 1, r: 20, s: -0.5, d: 0.8, o: 1, m: [95, 40, 84] },
  { x: 88, y: 20, w: 118, ar: 0.85, r: -16, s: 0.3, d: 0.9, o: 1, m: [78, 17, 88] },
  { x: 76, y: 10, w: 80, ar: 1, r: 12, s: -0.4, d: 0.5, o: 0.85 },
  { x: 14, y: 45, w: 64, ar: 1, r: -6, s: 0.5, d: 0.4, o: 0.7 },
  { x: 50, y: 102, w: 140, ar: 1.2, r: 6, s: 0.7, d: 0.5, o: 1, m: [38, 100, 110] },
  { x: 24, y: 101, w: 90, ar: 1, r: -18, s: -0.6, d: 0.5, o: 1 },
  { x: 3, y: 86, w: 70, ar: 1, r: 10, s: 0.4, d: 0.5, o: 0.8, m: [3, 78, 62] },
  { x: 47, y: 80, w: 58, ar: 1, r: 8, s: 0.4, d: 0.4, o: 0.8 },
  { x: 59, y: 78, w: 80, ar: 0.9, r: 12, s: -0.4, d: 0.6, o: 1 },
  { x: 34, y: 15, w: 66, ar: 1.1, r: -10, s: 0.4, d: 0.5, o: 0.9 },
  { x: 84, y: 84, w: 90, ar: 1, r: -14, s: -0.5, d: 0.7, o: 1 },
  { x: 60, y: 17, w: 72, ar: 0.9, r: 12, s: -0.3, d: 0.5, o: 0.9 },
  { x: 24, y: 36, w: 70, ar: 1, r: 14, s: 0.3, d: 0.6, o: 1 },
  { x: 72, y: 40, w: 76, ar: 0.9, r: -16, s: -0.4, d: 0.6, o: 1 },
  { x: 69, y: 58, w: 64, ar: 1, r: 8, s: 0.3, d: 0.5, o: 0.9 },
  { x: 27, y: 60, w: 66, ar: 1.1, r: -10, s: -0.3, d: 0.5, o: 0.9 },
  /* Between: single objects entering from the edges of large empty fields */
  { x: -3, y: 121, w: 150, ar: 0.8, r: -10, s: 0.5, d: 0, o: 0.95, from: "l", m: [-9, 122, 92] },
  { x: 97, y: 165, w: 130, ar: 1, r: 14, s: -0.5, d: 0, o: 0.95, from: "r", m: [94, 168, 90] },
  { x: 98, y: 214, w: 96, ar: 1, r: 16, s: 0.4, d: 0, o: 0.8 },
  { x: -2, y: 268, w: 110, ar: 0.9, r: -12, s: -0.4, d: 0, o: 0.8, m: [-8, 262, 78] },
  { x: 90, y: 350, w: 70, ar: 1, r: 10, s: 0.3, d: 0, o: 0.7, from: "r", m: [88, 344, 56] },
  { x: 6, y: 303, w: 60, ar: 1, r: -8, s: -0.3, d: 0, o: 0.7, from: "l" },
  { x: -4, y: 422, w: 150, ar: 0.8, r: -8, s: 0.6, d: 0, o: 0.9, from: "l", m: [-12, 424, 100] },
  { x: 97, y: 452, w: 100, ar: 1.1, r: 12, s: -0.5, d: 0, o: 0.9, from: "r" },
  { x: 88, y: 388, w: 64, ar: 1, r: -14, s: 0.3, d: 0, o: 0.7 },
  { x: 8, y: 512, w: 64, ar: 1, r: 6, s: -0.2, d: 0, o: 0.6 },
  /* Sign-up field: dense again around the pill (centre ~590svh), thinning toward the identity below */
  { x: -3, y: 552, w: 120, ar: 0.9, r: -12, s: 0.4, d: 0.9, o: 1, from: "l", m: [-8, 548, 90] },
  { x: 7, y: 572, w: 84, ar: 1, r: 14, s: -0.5, d: 0.8, o: 1, m: [2, 566, 70] },
  { x: 15, y: 548, w: 70, ar: 1.1, r: -20, s: 0.3, d: 0.6, o: 0.9 },
  { x: 10, y: 598, w: 100, ar: 0.8, r: 10, s: -0.6, d: 0.9, o: 1, m: [-4, 606, 86] },
  { x: 21, y: 616, w: 76, ar: 1, r: -8, s: 0.4, d: 0.7, o: 0.7, m: [14, 624, 70] },
  { x: 21, y: 580, w: 64, ar: 1, r: 18, s: -0.3, d: 0.5, o: 0.95 },
  { x: 27, y: 556, w: 60, ar: 1.2, r: -14, s: 0.5, d: 0.5, o: 0.9 },
  { x: 28, y: 606, w: 66, ar: 1, r: 10, s: -0.4, d: 0.5, o: 0.8 },
  { x: 34, y: 622, w: 60, ar: 1, r: -6, s: 0.3, d: 0.5, o: 0.5, m: [40, 632, 64] },
  { x: 42, y: 556, w: 56, ar: 1, r: 8, s: -0.5, d: 0.4, o: 0.8 },
  { x: 58, y: 553, w: 66, ar: 1, r: -12, s: 0.4, d: 0.5, o: 0.9, m: [68, 550, 62] },
  { x: 66, y: 556, w: 60, ar: 1.1, r: 16, s: -0.4, d: 0.5, o: 0.85 },
  { x: 72, y: 576, w: 70, ar: 0.9, r: -10, s: 0.5, d: 0.7, o: 1 },
  { x: 76, y: 550, w: 92, ar: 0.9, r: -10, s: 0.5, d: 0.7, o: 1, m: [80, 552, 70] },
  { x: 80, y: 600, w: 84, ar: 1, r: 14, s: -0.6, d: 0.8, o: 1 },
  { x: 88, y: 552, w: 130, ar: 0.85, r: -18, s: 0.4, d: 0.9, o: 1, from: "r", m: [88, 560, 100] },
  { x: 93, y: 578, w: 70, ar: 1, r: 8, s: -0.3, d: 0.8, o: 0.95, m: [96, 586, 60] },
  { x: 89, y: 610, w: 100, ar: 1, r: -8, s: 0.5, d: 0.8, o: 0.8, m: [82, 616, 80] },
  { x: 73, y: 614, w: 72, ar: 1, r: 12, s: -0.4, d: 0.6, o: 0.6 },
  { x: 62, y: 622, w: 60, ar: 1, r: -14, s: 0.3, d: 0.5, o: 0.5, m: [62, 630, 60] },
  { x: 49, y: 626, w: 56, ar: 1, r: 6, s: -0.3, d: 0.4, o: 0.4 },
  { x: 3, y: 626, w: 90, ar: 1, r: -14, s: 0.3, d: 0.6, o: 0.55 },
  { x: 99, y: 624, w: 110, ar: 0.9, r: 10, s: -0.5, d: 0.7, o: 0.5 },
];

/* Ghosts: faint, slow tiles that pass behind the headline, as in the reference. */
const GHOSTS: readonly FieldObject[] = [
  { x: 36, y: 30, w: 70, ar: 1, r: -8, s: 0, d: 0.3, o: 0.16 },
  { x: 61, y: 26, w: 64, ar: 1.1, r: 12, s: 0, d: 0.3, o: 0.16 },
  { x: 43, y: 62, w: 82, ar: 0.9, r: 6, s: 0, d: 0.3, o: 0.14 },
  { x: 56, y: 68, w: 60, ar: 1, r: -14, s: 0, d: 0.3, o: 0.16 },
  { x: 41, y: 46, w: 56, ar: 1, r: 10, s: 0, d: 0.3, o: 0.12 },
  { x: 58, y: 48, w: 68, ar: 1, r: -6, s: 0, d: 0.3, o: 0.14 },
  { x: 49, y: 20, w: 58, ar: 1.2, r: 14, s: 0, d: 0.3, o: 0.18 },
  { x: 2, y: 34, w: 62, ar: 1, r: -10, s: 0, d: 0.5, o: 0.9, m: [0, 36, 56] },
  { x: 96, y: 66, w: 84, ar: 1, r: 12, s: 0, d: 0.6, o: 1, m: [90, 70, 70] },
];

/** Hero objects flow upward inside a clipped, faded band; everything else is moved by scroll. */
export const HERO: readonly FieldObject[] = [...ALL.filter((o) => o.y < 96), ...GHOSTS].map((o) =>
  o.x > 30 && o.x < 70 ? { ...o, o: Math.min(o.o, 0.2) } : o,
);
/* The film band pushed the sign-up section down; objects that surround it ride down with it. */
const CTA_SHIFT = 160;
const shiftCta = (o: FieldObject): FieldObject => (o.y >= 540 ? { ...o, y: o.y + CTA_SHIFT, ...(o.m && o.m[1] >= 540 ? { m: [o.m[0], o.m[1] + CTA_SHIFT, o.m[2]] as const } : {}) } : o);
export const REST: readonly FieldObject[] = [...ALL.filter((o) => o.y >= 96).map(shiftCta), ...[275,295,325,345,365,380].map((y,i) => ({x:i%2?88:10,y,w:100,ar:0.85,r:i%2?8:-8,s:0.2,d:0,o:0.85}))];
