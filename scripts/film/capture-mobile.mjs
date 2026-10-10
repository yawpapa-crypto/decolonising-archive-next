// Real ARED on a phone-sized viewport (390×693 CSS px at 2.77×) → 1080×1920 frames for the 9:16 film.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
const { chromium } = await import("../../tmp/film-tools/node_modules/playwright-core/index.mjs");
const B = "http://localhost:3000"; const DPR = 1080 / 390;
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars", "--force-color-profile=srgb"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 693 }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
await ctx.addInitScript(() => {
  try { sessionStorage.setItem("decolonisingArchive:ackCounted", "1"); localStorage.setItem("decolonisingArchive:acknowledgementVisits", "3"); } catch {}
  const css = `.ared-langask,.nw,.ds,nextjs-portal,[data-nextjs-toast]{display:none!important}`;
  const add = () => { const s = document.createElement("style"); s.textContent = css; document.documentElement.appendChild(s); };
  if (document.documentElement) add(); else document.addEventListener("DOMContentLoaded", add);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function settle(page, ms = 2500) {
  await page.waitForLoadState("load").catch(() => {});
  await page.evaluate(async () => { await document.fonts.ready; const imgs = [...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }); await Promise.all(imgs.map((i) => i.complete ? 0 : new Promise((res) => { i.onload = i.onerror = res; setTimeout(res, 8000); }))); }).catch(() => {});
  await sleep(ms);
}
// Smooth, human-paced scroll of the page (touch devices have no wheel).
const scrollBy = async (page, dy, ms) => { await page.evaluate(async ([dy, ms]) => { const el = document.scrollingElement; const y0 = el.scrollTop; const t0 = performance.now(); await new Promise((res) => { const step = (t) => { const u = Math.min(1, (t - t0) / ms); const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; el.scrollTop = y0 + dy * e; if (u < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); }); }, [dy, ms]); };
async function record(name, url, act) {
  const dir = `tmp/film/capm/${name}`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const page = await ctx.newPage();
  await page.goto(B + url, { waitUntil: "domcontentloaded", timeout: 90000 }); await settle(page, 3000);
  const cdp = await ctx.newCDPSession(page); const frames = []; let t0 = null;
  cdp.on("Page.screencastFrame", async (f) => { const ts = f.metadata.timestamp; if (t0 == null) t0 = ts; const file = `${dir}/${String(frames.length).padStart(5, "0")}.jpg`; writeFileSync(file, Buffer.from(f.data, "base64")); frames.push({ file, t: +(ts - t0).toFixed(4) }); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  const marks = []; const mark = (label) => marks.push({ label, t: t0 == null ? 0 : Date.now() / 1000 - t0 });
  await sleep(600);
  try { await act(page, mark); } catch (e) { console.log(name, "action error", e.message.slice(0, 200)); }
  await cdp.send("Page.stopScreencast"); await sleep(300);
  writeFileSync(`${dir}/frames.json`, JSON.stringify({ frames, marks }, null, 1));
  console.log(name, "frames", frames.length, "dur", frames.at(-1)?.t, JSON.stringify(marks)); await page.close();
}
await record("m-home", "/home-next", async (page, mark) => { await sleep(2500); mark("hold"); await sleep(2500); });
await record("m-explore", "/home-next/explore?q=adinkra", async (page, mark) => { await sleep(1200); mark("results"); await scrollBy(page, 900, 3800); await sleep(1500); mark("end"); });
await record("m-record", "/home-next/explore?q=adinkra", async (page, mark) => {
  await sleep(800);
  const img = page.locator('main img[alt="Adinkra sample"]').first(); const b = await img.boundingBox().catch(() => null);
  if (b) { await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); mark("open"); }
  await sleep(2600); await settle(page, 500); mark("opened");
  await page.evaluate(() => { const d = document.querySelector(".fy-detail"); const sc = d && (function f(e) { while (e) { const s = getComputedStyle(e); if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight) return e; e = e.parentElement; } return document.scrollingElement; })(d); window.__sc = sc; });
  await page.evaluate(async () => { const el = window.__sc || document.scrollingElement; const y0 = el.scrollTop; const t0 = performance.now(); await new Promise((res) => { const st = (t) => { const u = Math.min(1, (t - t0) / 3200); el.scrollTop = y0 + 700 * (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2); u < 1 ? requestAnimationFrame(st) : res(); }; requestAnimationFrame(st); }); });
  mark("meta"); await sleep(1500);
  await page.evaluate(async () => { const el = window.__sc || document.scrollingElement; const y0 = el.scrollTop; const t0 = performance.now(); await new Promise((res) => { const st = (t) => { const u = Math.min(1, (t - t0) / 3200); el.scrollTop = y0 + 1100 * (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2); u < 1 ? requestAnimationFrame(st) : res(); }; requestAnimationFrame(st); }); });
  mark("related"); await sleep(1500);
});
await record("m-foryou", "/home-next/for-you", async (page, mark) => { await sleep(1200); mark("start"); await scrollBy(page, 1400, 6000); await sleep(800); await scrollBy(page, 1000, 4500); mark("end"); await sleep(800); });
await browser.close(); console.log("DONE");
