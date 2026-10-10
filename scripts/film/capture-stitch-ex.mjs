// For You scrolls inside its own container, so stitch real viewport renders into one tall strip.
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
const { chromium } = await import("../../tmp/film-tools/node_modules/playwright-core/index.mjs");
const B = "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const init = () => { try { sessionStorage.setItem("decolonisingArchive:ackCounted", "1"); localStorage.setItem("decolonisingArchive:acknowledgementVisits", "3"); } catch {} const add = () => { const s = document.createElement("style"); s.textContent = `.ared-langask,.nw,.ds,.nl-tab,nextjs-portal{display:none!important}`; document.documentElement.appendChild(s); }; if (document.documentElement) add(); else document.addEventListener("DOMContentLoaded", add); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function stitch(name, url, opts, steps) {
  const dir = `tmp/film/stitch/${name}`; mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext(opts); await ctx.addInitScript(init);
  const page = await ctx.newPage(); await page.goto(B + url, { waitUntil: "domcontentloaded", timeout: 90000 }); await sleep(4000);
  const info = await page.evaluate(() => {
    const els = [document.scrollingElement, ...document.querySelectorAll("*")].filter((e) => e && e.scrollHeight > e.clientHeight + 50 && (e === document.scrollingElement || /(auto|scroll)/.test(getComputedStyle(e).overflowY)));
    els.sort((a, b) => b.scrollHeight - a.scrollHeight); window.__sc = els[0];
    const r = els[0] === document.scrollingElement ? { top: 0 } : els[0].getBoundingClientRect();
    return { top: r.top, ch: els[0].clientHeight, sh: els[0].scrollHeight, tag: els[0].tagName + "." + els[0].className };
  });
  console.log(name, JSON.stringify(info));
  const step = Math.floor(info.ch * 0.8); const shots = [];
  for (let k = 0; k < steps; k++) {
    await page.evaluate((y) => { window.__sc.scrollTop = y; }, k * step); await sleep(1600);
    await page.evaluate(async () => { await Promise.all([...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 5000); }))); });
    const actual = await page.evaluate(() => window.__sc.scrollTop);
    const f = `${dir}/${String(k).padStart(2, "0")}.png`; await page.screenshot({ path: f }); shots.push({ f, y: actual });
  }
  writeFileSync(`${dir}/meta.json`, JSON.stringify({ ...info, step, shots, dpr: opts.deviceScaleFactor || 1 }));
  await ctx.close();
}
await stitch("m-explore", "/home-next/explore?q=adinkra", { viewport: { width: 390, height: 693 }, deviceScaleFactor: 1080 / 390, isMobile: true, hasTouch: true }, 5);
await browser.close();
execFileSync("tar", ["-cf", "tmp/film/film-pack4.tar", "-C", "tmp/film", "stitch"]);
console.log("PACKED");
