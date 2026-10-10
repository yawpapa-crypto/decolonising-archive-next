// Responsive / zoom / large-text audit of the real site (headless Chrome on this machine).
import { writeFileSync, mkdirSync } from "node:fs";
const { chromium } = await import("../../tmp/film-tools/node_modules/playwright-core/index.mjs");
const B = "http://localhost:3000";
const OUT = "tmp/audit"; mkdirSync(OUT + "/shots", { recursive: true });
const ROUTES = (process.env.ROUTES || "/home-next,/home-next/for-you,/home-next/explore?q=adinkra,/home-next/following,/home-next/fieldnotes,/home-next/help,/home-next/profile,/signin,/signup").split(",");
const WIDTHS = (process.env.WIDTHS || "320,375,390,430,600,768,820,1024,1180,1280,1440,1920,2560").split(",").map(Number);
const MODES = (process.env.MODES || "base,zoom125,zoom150,zoom200,zoom400,text200").split(",");
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars"] });
const init = () => { try { sessionStorage.setItem("decolonisingArchive:ackCounted", "1"); localStorage.setItem("decolonisingArchive:acknowledgementVisits", "3"); } catch {} };
const results = [];
for (const mode of MODES) {
  const zoom = mode.startsWith("zoom") ? Number(mode.slice(4)) / 100 : 1;
  for (const W of WIDTHS) {
    if (zoom === 4 && W < 1280) continue; // 400% matters at desktop widths (≈320 CSS px)
    const vw = Math.round(W / zoom), vh = Math.round(Math.max(700, W * 0.62) / zoom);
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: zoom, isMobile: W < 768 && zoom === 1, hasTouch: W < 1024 });
    await ctx.addInitScript(init);
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      try {
        if (mode === "text200") { const cdp = await ctx.newCDPSession(page); await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32, fixed: 26 } }).catch(() => {}); }
        await page.goto(B + route, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForTimeout(2200);
        const r = await page.evaluate(() => {
          const de = document.scrollingElement; const iw = innerWidth;
          const over = de.scrollWidth - iw;
          const wide = over > 1 ? [...document.querySelectorAll("body *")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > iw + 1 && getComputedStyle(e).position !== "fixed"; }).slice(0, 6).map((e) => (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : e.tagName) + "@" + Math.round(e.getBoundingClientRect().right)) : [];
          const h = document.querySelector(".ared-nav");
          let nav = null;
          if (h) {
            const vis = (e) => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0; };
            const parts = [h.querySelector(".ared-nav__logo"), ...h.querySelectorAll(".ared-nav__links a"), h.querySelector(".ared-search"), ...(h.querySelector(".ared-nav__right")?.querySelectorAll(":scope > a, :scope > button, :scope .am > button, :scope .ared-navfit__btn") ?? [])].filter((e) => e && vis(e));
            const boxes = parts.map((e) => ({ n: (e.textContent || e.getAttribute("aria-label") || e.className).trim().slice(0, 14), b: e.getBoundingClientRect() }));
            const overlaps = [];
            for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i].b, c = boxes[j].b; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) overlaps.push(boxes[i].n + "×" + boxes[j].n); }
            const wrapped = [...h.querySelectorAll(".ared-nav__links a")].filter(vis).filter((a) => { const lbl = a.querySelector(".ared-nav__lbl") || a; const rg = document.createRange(); rg.selectNodeContents(lbl); const tops = new Set([...rg.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))); return tops.size > 1; }).map((a) => a.textContent.trim());
            const offscreen = boxes.filter((x) => x.b.right > iw + 1 || x.b.left < -1).map((x) => x.n);
            const search = h.querySelector(".ared-search"); const sw = search && vis(search) ? Math.round(search.getBoundingClientRect().width) : 0;
            const small = boxes.filter((x) => x.b.height < 40 || x.b.width < 40).map((x) => x.n + ":" + Math.round(x.b.width) + "x" + Math.round(x.b.height));
            nav = { fit: h.dataset.fit || "", overlaps, wrapped, offscreen, searchW: sw, small: small.slice(0, 6), navH: Math.round(h.getBoundingClientRect().height) };
          }
          // Text that no longer fits its box (fixed heights at large text sizes): spills out or is cut off.
          const clipped = [];
          for (const el of document.querySelectorAll("body *")) {
            if (clipped.length > 12) break;
            if (!/\S/.test([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""))) continue;
            const s = getComputedStyle(el); const b = el.getBoundingClientRect();
            if (s.display === "none" || s.visibility === "hidden" || b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > innerHeight * 2) continue;
            if (el.closest("details:not([open]), [aria-hidden=true], .ared-navfit__measure")) continue;
            const rg = document.createRange(); rg.selectNodeContents(el); const t = rg.getBoundingClientRect();
            if (t.height < 2) continue;
            let box = el; while (box && getComputedStyle(box).display === "inline") box = box.parentElement;
            const bb = box.getBoundingClientRect();
            const spill = Math.max(t.bottom - bb.bottom, bb.top - t.top);
            const lines = s.webkitLineClamp && s.webkitLineClamp !== "none";
            if (spill > 3 && !lines && s.textOverflow !== "ellipsis") clipped.push((typeof box.className === "string" && box.className ? "." + box.className.trim().split(/\s+/)[0] : box.tagName) + ":" + Math.round(spill) + "px");
          }
          return { over, wide, nav, clipped };
        });
        results.push({ mode, W, vw, route, ...r });
        if (process.env.ALLSHOTS || (r.over > 1 || r.nav?.overlaps.length || r.nav?.wrapped.length || r.nav?.offscreen.length) || (route === "/home-next/for-you" && [320, 768, 1024, 1280].includes(W))) {
          await page.screenshot({ path: `${OUT}/shots/${mode}-${W}-${route.replace(/[^a-z0-9]+/gi, "_")}.png`, clip: { x: 0, y: 0, width: vw, height: Math.min(vh, 260) } }).catch(() => {});
        }
      } catch (e) { results.push({ mode, W, vw, route, error: String(e.message).slice(0, 120) }); }
      await page.close();
    }
    await ctx.close();
    writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
    console.log(mode, W, "done");
  }
}
await browser.close();
console.log("DONE", results.length);
