// Real ARED interface capture: headless Chrome, 1440x1440, CDP screencast frames with timestamps.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
const { chromium } = await import("../../tmp/film-tools/node_modules/playwright-core/index.mjs");
const B = "http://localhost:3000";
const ONLY = process.env.SHOTS ? process.env.SHOTS.split(",") : null;
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars", "--force-color-profile=srgb"] });
const VW = Number(process.env.VW || 1440), VH = Number(process.env.VH || 1440), PFX = process.env.PFX || "";
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
// Quiet the floating chrome that is not part of these shots (news ticker, newsletter tab, display pill, dev overlay).
await ctx.addInitScript(() => {
  try { localStorage.setItem("ared-newsletter-dismissed", "1"); sessionStorage.setItem("decolonisingArchive:ackCounted", "1"); localStorage.setItem("decolonisingArchive:acknowledgementVisits", "3"); } catch {}
  const css = `.ared-langask,.nw,.ds,nextjs-portal,[data-nextjs-toast],[class*="news-widget"],[class*="NewsWidget"],[class*="nl-tab"],[class*="newsletter-tab"],.ared-display,[class*="display-toggle"],[class*="DisplaySettings"]{display:none!important}`;
  const add = () => { const s = document.createElement("style"); s.textContent = css; document.documentElement.appendChild(s); };
  if (document.documentElement) add(); else document.addEventListener("DOMContentLoaded", add);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function settle(page, ms = 2500) {
  await page.waitForLoadState("load").catch(() => {});
  await page.evaluate(async () => { await document.fonts.ready; const imgs = [...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }); await Promise.all(imgs.map((i) => i.complete ? 0 : new Promise((res) => { i.onload = i.onerror = res; setTimeout(res, 8000); }))); }).catch(() => {});
  await sleep(ms);
}
async function record(name, url, act) {
  if (ONLY && !ONLY.includes(name)) return;
  name = PFX + name; const dir = `tmp/film/cap/${name}`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const page = await ctx.newPage();
  await page.goto(B + url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await settle(page, 3000);
  const cdp = await ctx.newCDPSession(page);
  const frames = []; let t0 = null;
  cdp.on("Page.screencastFrame", async (f) => {
    const ts = f.metadata.timestamp; if (t0 == null) t0 = ts;
    const file = `${dir}/${String(frames.length).padStart(5, "0")}.jpg`;
    writeFileSync(file, Buffer.from(f.data, "base64")); frames.push({ file, t: +(ts - t0).toFixed(4) });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: VW, maxHeight: VH, everyNthFrame: 1 });
  const marks = []; const mark = (label) => marks.push({ label, t: t0 == null ? 0 : (Date.now() / 1000 - t0) });
  await sleep(600);
  try { await act(page, mark); } catch (e) { console.log(name, "action error", e.message); }
  await cdp.send("Page.stopScreencast");
  await sleep(300);
  writeFileSync(`${dir}/frames.json`, JSON.stringify({ frames, marks }, null, 1));
  console.log(name, "frames", frames.length, "dur", frames.at(-1)?.t, "marks", JSON.stringify(marks));
  await page.close();
}
const smoothScroll = async (page, dy, ms) => { const steps = Math.round(ms / 16); for (let i = 0; i < steps; i++) { const e = 0.5 - 0.5 * Math.cos(Math.PI * (i + 1) / steps) - (0.5 - 0.5 * Math.cos(Math.PI * i / steps)); await page.mouse.wheel(0, dy * e); await sleep(16); } };
const glide = async (page, x, y, ms = 700) => { await page.mouse.move(x, y, { steps: Math.max(8, Math.round(ms / 16)) }); };

// 1. Homepage: hero, logo outline→full on hover.
await record("home", "/home-next", async (page, mark) => {
  await sleep(1200); mark("hold");
  const logo = page.locator("header a").first(); const b = await logo.boundingBox();
  if (b) { await glide(page, b.x + b.width / 2, b.y + b.height / 2, 900); mark("logo-hover"); }
  await sleep(2600); await glide(page, 720, 900, 900); await sleep(2500);
});
// 2. Search: type a real query, results resolve in Explore.
await record("search", "/home-next", async (page, mark) => {
  const box = page.locator('input[aria-label="Search the archive"]').first();
  const b = await box.boundingBox(); if (b) await glide(page, b.x + 60, b.y + b.height / 2, 800);
  await box.click(); mark("focus"); await sleep(500);
  for (const ch of "adinkra") { await page.keyboard.type(ch); await sleep(110 + Math.random() * 90); }
  mark("typed"); await sleep(450); await page.keyboard.press("Enter"); mark("submit");
  await page.waitForURL(/explore\?q=adinkra/, { timeout: 30000 }).catch(() => {});
  await settle(page, 1500); mark("results");
  await smoothScroll(page, 520, 2600); await sleep(1600); mark("end");
});
// 3. Record: open the Smithsonian adinkra cloth, reveal metadata, source and related records.
await record("record", "/home-next/explore?q=adinkra", async (page, mark) => {
  await sleep(800);
  // The first large image tile in the leftmost column under the first card: a real stamped adinkra cloth.
  const boxes = await page.$$eval("main img", (ims, VH) => ims.map((i) => { const r = i.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, alt: i.alt, nw: i.naturalWidth }; }).filter((b) => b.w > 150 && b.nw > 200 && b.y > 250 && b.y < VH - 60), VH);
  boxes.sort((a, b) => a.x - b.x || a.y - b.y);
  const b = boxes.find((x) => x.alt === "Adinkra sample") || boxes[0]; console.log("record target", JSON.stringify(b));
  if (b) { await glide(page, b.x + b.w / 2, b.y + b.h / 2, 1000); mark("hover"); await sleep(1000); await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2); mark("open"); }
  await sleep(2400); await settle(page, 600); mark("opened");
  await glide(page, VW * 0.68, VH * 0.62, 600);
  await smoothScroll(page, 360, 2400); await sleep(1600); mark("meta");
  const src = page.locator(".fy-detail__meta a, .fy-detail__info a, .fy-detail__actions a").first(); const sb = await src.boundingBox().catch(() => null);
  if (sb) { await glide(page, sb.x + sb.width / 2, sb.y + sb.height / 2, 800); mark("source-hover"); await sleep(1600); }
  await glide(page, VW / 2, VH * 0.62, 500);
  await smoothScroll(page, 760, 3200); await sleep(1800); mark("related");
});
// 4. Local / Global on the homepage collage.
await record("localglobal", "/home-next", async (page, mark) => {
  const pick = async (label) => { const btn = page.getByRole("radio", { name: new RegExp(`^${label}`, "i") }).first(); const b = await btn.boundingBox().catch(() => null); if (!b) return; await glide(page, b.x + b.width / 2, b.y + b.height / 2, 700); await btn.click(); mark(label.toLowerCase()); await sleep(2600); };
  await sleep(900); await pick("Local"); await pick("Global"); await pick("Both");
});
// 5. For You: dense masonry, slow scroll, hover reveals the quiet controls.
await record("foryou", "/home-next/for-you", async (page, mark) => {
  await sleep(1000); mark("start");
  await smoothScroll(page, 700, 4200); await sleep(500);
  await glide(page, 520, 640, 900); mark("hover"); await sleep(2200);
  await smoothScroll(page, 600, 3800); await sleep(1500); mark("end");
});
// 6. Following: the narrow feed, then the Decolonising Archive profile wall.
await record("following", "/home-next/following", async (page, mark) => {
  await sleep(1400); mark("feed"); await smoothScroll(page, 380, 2600); await sleep(800);
  const who = page.getByRole("link", { name: /Decolonising Archive/ }).first(); const b = await who.boundingBox().catch(() => null);
  if (b) { await glide(page, b.x + b.width / 2, b.y + b.height / 2, 800); await who.click(); mark("profile"); await settle(page, 1200); await smoothScroll(page, 600, 3200); await sleep(1500); }
});
await browser.close();
console.log("DONE");
