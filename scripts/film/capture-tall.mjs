// Full-page renders of the real feeds, panned by the compositor for perfectly smooth scrolling.
import { execFileSync } from "node:child_process";
const { chromium } = await import("../../tmp/film-tools/node_modules/playwright-core/index.mjs");
const B = "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const init = () => { try { sessionStorage.setItem("decolonisingArchive:ackCounted", "1"); localStorage.setItem("decolonisingArchive:acknowledgementVisits", "3"); } catch {} const add = () => { const s = document.createElement("style"); s.textContent = `.ared-langask,.nw,.ds,.nl-tab,nextjs-portal{display:none!important}`; document.documentElement.appendChild(s); }; if (document.documentElement) add(); else document.addEventListener("DOMContentLoaded", add); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function tall(name, url, opts, height) {
  const ctx = await browser.newContext(opts); await ctx.addInitScript(init);
  const page = await ctx.newPage(); await page.goto(B + url, { waitUntil: "domcontentloaded", timeout: 90000 }); await sleep(3500);
  for (let y = 0; y < height; y += 400) { await page.evaluate((y) => window.scrollTo(0, y), y); await sleep(450); }
  await sleep(2500);
  await page.evaluate(async () => { await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 6000); }))); });
  await page.evaluate(() => window.scrollTo(0, 0)); await sleep(1200);
  await page.screenshot({ path: `tmp/film/${name}.png`, fullPage: true });
  console.log(name, "ok"); await ctx.close();
}
await tall("t-foryou", "/home-next/for-you", { viewport: { width: 1440, height: 1440 } }, 4200);
await tall("tm-foryou", "/home-next/for-you", { viewport: { width: 390, height: 693 }, deviceScaleFactor: 1080 / 390, isMobile: true, hasTouch: true }, 4200);
await tall("tm-explore", "/home-next/explore?q=adinkra", { viewport: { width: 390, height: 693 }, deviceScaleFactor: 1080 / 390, isMobile: true, hasTouch: true }, 2600);
await browser.close();
execFileSync("tar", ["-cf", "tmp/film/film-pack3.tar", "-C", "tmp/film", "t-foryou.png", "tm-foryou.png", "tm-explore.png"]);
console.log("PACKED");
