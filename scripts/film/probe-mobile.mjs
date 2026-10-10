const { chromium } = await import("../../tmp/film-tools/node_modules/playwright-core/index.mjs");
const b = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 2.7693, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
await ctx.addInitScript(() => { try { sessionStorage.setItem("decolonisingArchive:ackCounted", "1"); localStorage.setItem("decolonisingArchive:acknowledgementVisits", "3"); } catch {} const add = () => { const s = document.createElement("style"); s.textContent = ".ared-langask,.nw,.ds,nextjs-portal{display:none!important}"; document.documentElement.appendChild(s); }; if (document.documentElement) add(); else document.addEventListener("DOMContentLoaded", add); });
for (const [n, u] of [["m-home", "/home-next"], ["m-explore", "/home-next/explore?q=adinkra"], ["m-foryou", "/home-next/for-you"]]) {
  const p = await ctx.newPage(); await p.goto("http://localhost:3000" + u, { waitUntil: "load", timeout: 90000 }); await p.waitForTimeout(4000);
  await p.screenshot({ path: `tmp/film/${n}.png` });
  const inputs = await p.$$eval("input", (a) => a.map((i) => ({ al: i.getAttribute("aria-label"), vis: !!i.offsetParent, r: i.getBoundingClientRect().toJSON() })));
  const btns = await p.$$eval("header button, header a", (a) => a.slice(0, 12).map((x) => (x.getAttribute("aria-label") || x.textContent || "").trim().slice(0, 30)));
  console.log(n, JSON.stringify(inputs), JSON.stringify(btns)); await p.close();
}
await b.close(); console.log("DONE");
