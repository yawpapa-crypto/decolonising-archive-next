// WCAG AA text-contrast audit, light and night mode, with the main pop-ups opened (headless Chrome).
import { writeFileSync, mkdirSync } from "node:fs";
const { chromium } = await import("../../tmp/film-tools/node_modules/playwright-core/index.mjs");
const B = process.env.BASE || "http://localhost:3000";
const OUT = "tmp/audit"; mkdirSync(OUT + "/contrast", { recursive: true });
const ROUTES = (process.env.ROUTES || "/home-next,/home-next/for-you,/home-next/explore,/home-next/following,/home-next/fieldnotes,/home-next/help,/signin,/signup").split(",");
const THEMES = (process.env.THEMES || "light,night").split(",");
const WIDTHS = (process.env.WIDTHS || "1280,390").split(",").map(Number);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const scan = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const bgOf = (el) => {
    const stack = [];
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== "none" && !s.backgroundImage.startsWith("linear-gradient")) return null; // text over a picture: judged by eye
      if (e.tagName === "IMG" || e.tagName === "VIDEO") return null;
      const c = parse(s.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; }
    }
    const canvas = parse(getComputedStyle(document.body).backgroundColor); const root = parse(getComputedStyle(document.documentElement).backgroundColor);
    let base = canvas && canvas.a >= 1 ? canvas : root && root.a >= 1 ? root : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) base = blend(stack[i], base);
    return base;
  };
  const out = new Map();
  const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05 && b.width > 1 && b.height > 1 && b.bottom > 0 && b.top < innerHeight * 3; };
  for (const el of document.querySelectorAll("body *")) {
    if (!/\S/.test([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""))) continue;
    if (!vis(el) || el.closest("[aria-hidden=true]") || el.closest("svg")) continue;
    const det = el.closest("details:not([open])"); if (det && !el.closest("summary")) continue; // inside a closed panel
    if (el.closest("video, .ared-film, .ared-ft")) continue; // captions over moving pictures: judged by eye
    if (el.closest(":disabled, [aria-disabled=true]")) continue; // disabled controls are exempt
    const s = getComputedStyle(el); const fg = parse(s.color); if (!fg) continue;
    const bg = bgOf(el); if (!bg) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    if (op < 0.2) continue; // mid-fade or hidden
    const f = blend({ ...fg, a: fg.a * op }, bg);
    const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
    const need = px >= 24 || (bold && px >= 18.66) ? 3 : 4.5;
    if (ratio + 0.01 < need) {
      const cls = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      const key = el.tagName.toLowerCase() + cls + "|" + s.color + "|" + Math.round(ratio * 100);
      if (!out.has(key)) out.set(key, { sel: el.tagName.toLowerCase() + cls, text: el.textContent.trim().slice(0, 40), fg: s.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, ratio: +ratio.toFixed(2), need, px });
    }
  }
  return [...out.values()];
};
const results = [];
const states = {
  "/home-next/for-you": [
    ["dock-pressed", async (p) => { await p.click('.fy-dock button[aria-label="With images only"]').catch(() => {}); await p.click('.fy-dock button[aria-label^="Period"]').catch(() => {}); await p.waitForTimeout(800); }],
    ["detail", async (p) => { await p.click('.fy-dock button[aria-label="With images only"]').catch(() => {}); await p.locator("[data-fy-id]").first().click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1500); }],
    ["signup-gate", async (p) => { await p.keyboard.press("Escape"); await p.waitForTimeout(400); await p.evaluate(() => window.dispatchEvent(new CustomEvent("ared-signup-required", { detail: { reason: "save" } }))); await p.waitForTimeout(800); }],
  ],
};
for (const theme of THEMES) for (const W of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: W, height: W < 600 ? 844 : 860 }, isMobile: W < 600, hasTouch: W < 600 });
  await ctx.addInitScript((night) => { try { sessionStorage.setItem("decolonisingArchive:ackCounted", "1"); localStorage.setItem("decolonisingArchive:acknowledgementVisits", "3"); localStorage.setItem("ared-display", JSON.stringify({ night })); localStorage.setItem("ared-lang-asked", "1"); } catch {} }, theme === "night");
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    try {
      await page.goto(B + route, { waitUntil: "domcontentloaded", timeout: 60000 }); await page.waitForTimeout(2500);
      const tag = `${theme}-${W}-${route.replace(/[^a-z0-9]+/gi, "_")}`;
      results.push({ theme, W, route, state: "page", fails: await page.evaluate(scan) });
      await page.screenshot({ path: `${OUT}/contrast/${tag}.png` }).catch(() => {});
      for (const [name, act] of states[route] || []) {
        await act(page);
        results.push({ theme, W, route, state: name, fails: await page.evaluate(scan) });
        await page.screenshot({ path: `${OUT}/contrast/${tag}-${name}.png` }).catch(() => {});
      }
    } catch (e) { results.push({ theme, W, route, error: String(e.message).slice(0, 140) }); }
    await page.close(); console.log(theme, W, route, "done");
  }
  await ctx.close();
}
writeFileSync(`${OUT}/contrast.json`, JSON.stringify(results, null, 1));
console.log("DONE", results.length); await browser.close();
