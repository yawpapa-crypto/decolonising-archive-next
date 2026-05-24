/** Milanote-inspired canvas palette (tokens + sticky/fill swatches). */

export const CANVAS_PALETTE = {
  paper: "#ffffff",
  canvasWarm: "#f6f3ec",
  charcoal: "#2f2d38",
  lemon: "#dfff2f",
  coral: "#ff6b4a",
  green: "#54c78a",
  sky: "#8ec5ff",
  pink: "#ffd6df",
  yellow: "#fff5a6",
  lavender: "#ddd6ff",
  muted: "#72757e",
} as const;

export const CANVAS_FILL_SWATCHES = [
  CANVAS_PALETTE.paper,
  CANVAS_PALETTE.canvasWarm,
  CANVAS_PALETTE.yellow,
  CANVAS_PALETTE.lavender,
  CANVAS_PALETTE.sky,
  CANVAS_PALETTE.green,
  CANVAS_PALETTE.pink,
  CANVAS_PALETTE.coral,
  "#f0f6d8",
];

export const STICKY_SWATCHES = [
  CANVAS_PALETTE.yellow,
  CANVAS_PALETTE.sky,
  CANVAS_PALETTE.pink,
  CANVAS_PALETTE.green,
  CANVAS_PALETTE.lavender,
  CANVAS_PALETTE.coral,
];
