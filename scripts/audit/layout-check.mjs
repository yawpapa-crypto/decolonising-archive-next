#!/usr/bin/env node
/**
 * Layout and contrast gate for ARED. Opens the real site in Chrome and fails (exit 1) when:
 *   - a page scrolls sideways (content wider than the screen),
 *   - navigation items overlap, wrap onto two lines or fall off screen,
 *   - text misses WCAG 2.2 AA contrast, in day or night mode.
 * Text that spills out of its box at 200% text size is reported as a warning.
 *
 *   npm run audit:layout                         # against http://localhost:3000
 *   BASE=https://preview.example npm run audit:layout
 *   AUDIT_QUICK=1 npm run audit:layout           # fewer sizes, for a fast pre-push check
 *
 * Uses the installed Google Chrome (channel "chrome"); set CHROME_PATH to use another binary.
 * Results: tmp/audit/layout-check.json
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE || "http://localhost:3000").replace(/\/$/, "");
const QUICK = Boolean(process.env.AUDIT_QUICK);
const ROUTES = (process.env.ROUTES || "/home-next,/home-next/for-you,/home-next/explore,/home-next/following,/home-next/fieldnotes,/home-next/help,/signin,/signup").split(",");
const WIDTHS = QUICK ? [390, 1024, 1280] : [320, 390, 768, 1024, 1180, 1440, 1920];
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
// Known, deliberate exceptions: the Fieldnotes scroll-reveal heading starts faint and fills in as you scroll.
const ALLOW = [/^h2\|A whole archive/];

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, headless: true } : { channel: "chrome", headless: true });
const failures = [], warnings = [];

async function context(opts, night = false, textScale = 1) {
  const ctx = await browser.newContext({ ...opts, extraHTTPHeaders: BYPASS ? { "x-vercel-protection-bypass": BYPASS } : undefined });
  await ctx.addInitScript((n) => { try { sessionStorage.setItem("decolonisingArchive:ackCounted", "1"); localStorage.setItem("decolonisingArchive:acknowledgementVisits", "3"); localStorage.setItem("ared-lang-asked", "1"); localStorage.setItem("ared-display", JSON.stringify({ night: n })); } catch {} }, night);
  return { ctx, textScale };
}
async function open(c, route) {
  const page = await c.ctx.newPage();
  if (c.textScale !== 1) { const cdp = await c.ctx.newCDPSession(page); await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * c.textScale, fixed: 13 * c.textScale } }).catch(() => {}); }
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2200);
  return page;
}

/* ---------- checks that run inside the page ---------- */
function layoutProbe() {
  const iw = innerWidth; const over = document.scrollingElement.scrollWidth - iw;
  const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0; };
  const h = document.querySelector(".ared-nav"); const nav = { overlaps: [], wrapped: [], offscreen: [] };
  if (h) {
    const parts = [h.querySelector(".ared-nav__logo"), ...h.querySelectorAll(".ared-nav__links a"), h.querySelector(".ared-search"), ...(h.querySelector(".ared-nav__right")?.querySelectorAll(":scope > a, :scope > button, :scope .am > button, :scope .ared-navfit__btn") ?? [])].filter((e) => e && vis(e));
    const boxes = parts.map((e) => ({ n: (e.textContent || e.getAttribute("aria-label") || e.className).trim().slice(0, 16), b: e.getBoundingClientRect() }));
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i].b, c = boxes[j].b; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) nav.overlaps.push(boxes[i].n + " × " + boxes[j].n); }
    nav.wrapped = [...h.querySelectorAll(".ared-nav__links a")].filter(vis).filter((a) => { const rg = document.createRange(); rg.selectNodeContents(a.querySelector(".ared-nav__lbl") || a); return new Set([...rg.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size > 1; }).map((a) => a.textContent.trim());
    nav.offscreen = boxes.filter((x) => x.b.right > iw + 1 || x.b.left < -1).map((x) => x.n);
  }
  const clipped = [];
  for (const el of document.querySelectorAll("body *")) {
    if (clipped.length > 8) break;
    if (!/\S/.test([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""))) continue;
    const s = getComputedStyle(el); const b = el.getBoundingClientRect();
    if (s.display === "none" || s.visibility === "hidden" || b.width < 2 || b.bottom < 0 || b.top > innerHeight * 2) continue;
    if (el.closest("details:not([open]), [aria-hidden=true], [data-clip], h1, h2")) continue;
    const rg = document.createRange(); rg.selectNodeContents(el); const t = rg.getBoundingClientRect(); if (t.height < 2) continue;
    let box = el; while (box && getComputedStyle(box).display === "inline") box = box.parentElement;
    const bb = box.getBoundingClientRect(); const spill = Math.max(t.bottom - bb.bottom, bb.top - t.top);
    if (spill > 6 && s.textOverflow !== "ellipsis" && (s.webkitLineClamp || "none") === "none") clipped.push((typeof box.className === "string" && box.className ? "." + box.className.trim().split(/\s+/)[0] : box.tagName) + " +" + Math.round(spill) + "px");
  }
  return { over, nav, clipped };
}
function contrastProbe() {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
  const canvas = parse(getComputedStyle(document.body).backgroundColor);
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if ((s.backgroundImage && s.backgroundImage !== "none" && !s.backgroundImage.startsWith("linear-gradient")) || e.tagName === "IMG" || e.tagName === "VIDEO") return null; const c = parse(s.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } } let base = canvas && canvas.a >= 1 ? canvas : { r: 255, g: 255, b: 255, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) base = blend(stack[i], base); return base; };
  const out = new Map();
  for (const el of document.querySelectorAll("body *")) {
    if (!/\S/.test([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""))) continue;
    const s = getComputedStyle(el); const b = el.getBoundingClientRect();
    if (s.visibility === "hidden" || s.display === "none" || b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > innerHeight * 3) continue;
    if (el.closest("[aria-hidden=true], svg, :disabled, [aria-disabled=true], video, .ared-film, .ared-ft") || (el.closest("details:not([open])") && !el.closest("summary"))) continue;
    const fg = parse(s.color); if (!fg) continue; const bg = bgOf(el); if (!bg) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity; if (op < 0.2) continue;
    const f = blend({ ...fg, a: fg.a * op }, bg); const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(s.fontSize), need = px >= 24 || (+s.fontWeight >= 700 && px >= 18.66) ? 3 : 4.5;
    if (ratio + 0.01 < need) { const sel = el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""); const k = sel + "|" + el.textContent.trim().slice(0, 30); if (!out.has(k)) out.set(k, { sel, text: el.textContent.trim().slice(0, 30), ratio: +ratio.toFixed(2), need, fg: s.color }); }
  }
  return [...out.values()];
}

/* ---------- run ---------- */
const results = [];
const layoutRuns = [
  ...WIDTHS.map((W) => ({ label: `${W}px`, opts: { viewport: { width: W, height: 900 }, isMobile: W < 768, hasTouch: W < 1024 }, scale: 1 })),
  { label: "1280px at 200% zoom", opts: { viewport: { width: 640, height: 450 }, deviceScaleFactor: 2 }, scale: 1 },
  ...(QUICK ? [] : [{ label: "1280px at 400% zoom", opts: { viewport: { width: 320, height: 225 }, deviceScaleFactor: 4 }, scale: 1 }]),
  { label: "390px, text 200%", opts: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, scale: 2 },
  { label: "1280px, text 200%", opts: { viewport: { width: 1280, height: 900 } }, scale: 2 },
];
for (const run of layoutRuns) {
  const c = await context(run.opts, false, run.scale);
  for (const route of ROUTES) {
    try {
      const page = await open(c, route); const r = await page.evaluate(layoutProbe); await page.close();
      const where = `${route} @ ${run.label}`;
      if (r.over > 1) failures.push(`${where}: page scrolls sideways by ${r.over}px`);
      if (r.nav.overlaps.length) failures.push(`${where}: nav overlap ${r.nav.overlaps.join(", ")}`);
      if (r.nav.wrapped.length) failures.push(`${where}: nav label wraps ${r.nav.wrapped.join(", ")}`);
      if (r.nav.offscreen.length) failures.push(`${where}: nav item off screen ${r.nav.offscreen.join(", ")}`);
      if (r.clipped.length) warnings.push(`${where}: text spills its box ${r.clipped.join(", ")}`);
      results.push({ kind: "layout", where, ...r });
    } catch (e) { failures.push(`${route} @ ${run.label}: could not load (${String(e.message).slice(0, 80)})`); }
  }
  await c.ctx.close(); process.stdout.write(".");
}
for (const night of [false, true]) for (const W of QUICK ? [1280] : [390, 1280]) {
  const c = await context({ viewport: { width: W, height: 860 }, isMobile: W < 600, hasTouch: W < 600 }, night);
  for (const route of ROUTES) {
    try {
      const page = await open(c, route); const fails = (await page.evaluate(contrastProbe)).filter((f) => !ALLOW.some((re) => re.test(`${f.sel}|${f.text}`))); await page.close();
      for (const f of fails) failures.push(`${route} @ ${W}px ${night ? "night" : "day"}: contrast ${f.ratio}:1 (needs ${f.need}) on ${f.sel} "${f.text}"`);
      results.push({ kind: "contrast", where: `${route} @ ${W}px ${night ? "night" : "day"}`, fails });
    } catch (e) { failures.push(`${route} @ ${W}px: could not load (${String(e.message).slice(0, 80)})`); }
  }
  await c.ctx.close(); process.stdout.write(".");
}
await browser.close();
mkdirSync("tmp/audit", { recursive: true });
writeFileSync("tmp/audit/layout-check.json", JSON.stringify({ base: BASE, at: new Date().toISOString(), failures, warnings, results }, null, 1));
const uniq = (a) => [...new Set(a)];
console.log(`\n\nARED layout check against ${BASE}`);
console.log(`${uniq(failures).length} failure(s), ${uniq(warnings).length} warning(s)\n`);
uniq(failures).slice(0, 60).forEach((f) => console.log("  ✗ " + f));
uniq(warnings).slice(0, 20).forEach((w) => console.log("  ! " + w));
process.exit(failures.length ? 1 : 0);
