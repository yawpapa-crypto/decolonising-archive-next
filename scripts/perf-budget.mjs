// Fails when heavy assets or JavaScript grow past agreed limits. Run after `next build`:  npm run perf:budget
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const KB = 1024;
const LIMITS = { video: 6 * 1024 * KB, image: 600 * KB, jsChunk: 500 * KB, jsTotal: 4800 * KB };
// Known, accepted exceptions: video that only loads when someone presses play, and one app screenshot.
const ALLOW = new Set(["public/videos/ared-field-launch.mp4", "public/videos/ared-research-launch.mp4", "public/images/ared-field-preview.png"]);
let failed = false;
const fail = (m) => { failed = true; console.error("OVER BUDGET:", m); };

const walk = (dir) => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]) : [];

for (const f of walk("public/videos")) if (!ALLOW.has(f) && /\.(mp4|webm)$/.test(f) && statSync(f).size > LIMITS.video) fail(`${f} is ${(statSync(f).size / KB / 1024).toFixed(1)} MB`);
for (const f of walk("public/images")) if (!ALLOW.has(f) && /\.(jpe?g|png|webp)$/i.test(f) && statSync(f).size > LIMITS.image) fail(`${f} is ${Math.round(statSync(f).size / KB)} KB`);

// The /knowledge pages ship the whole registry to the browser (one 5 MB chunk). Tracked, not yet fixed.
const KNOWN_HEAVY = /9812-/;
const js = walk(".next/static/chunks").filter((f) => f.endsWith(".js") && !KNOWN_HEAVY.test(f));
if (js.length) {
  let total = 0;
  for (const f of js) { const s = statSync(f).size; total += s; if (s > LIMITS.jsChunk) fail(`${f} is ${Math.round(s / KB)} KB`); }
  if (total > LIMITS.jsTotal) fail(`total client JavaScript is ${Math.round(total / KB)} KB`);
} else console.log("No build output found; skipped JavaScript checks (run next build first).");

if (failed) process.exit(1);
console.log("Performance budget OK.");
