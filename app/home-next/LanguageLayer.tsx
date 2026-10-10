"use client";
import { useEffect, useRef, useState } from "react";
import { LANGS, lookup, type LangCode } from "./i18n";

const KEY = "ared-lang";
const ATTRS = ["aria-label", "title", "placeholder"] as const;

/** Translates the interface in place and shows a one-time language choice on a first visit. */
export default function LanguageLayer() {
  const [lang, setLang] = useState<LangCode>("en");
  const [ask, setAsk] = useState(false);
  const textOrig = useRef(new WeakMap<Node, { en: string; tr: string }>());
  const attrOrig = useRef(new WeakMap<Element, Record<string, { en: string; tr: string }>>());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as LangCode | null;
      if (saved && LANGS.some((l) => l.code === saved)) setLang(saved);
      else if (!localStorage.getItem("ared-lang-asked")) setAsk(true);
    } catch { /* storage unavailable */ }
    const on = (e: Event) => setLang(((e as CustomEvent).detail as LangCode) || "en");
    window.addEventListener("ared-lang", on);
    return () => window.removeEventListener("ared-lang", on);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    let raf = 0;
    const tx = (s: string) => { const t = s.trim(); if (!t) return null; const r = lang === "en" ? undefined : lookup(lang, t); return r ?? null; };
    const run = () => {
      raf = 0;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const parent = (n as Text).parentElement;
        if (!parent || parent.closest("script,style,noscript,[data-no-translate]")) continue;
        const cur = n.nodeValue ?? "";
        const rec = textOrig.current.get(n);
        if (rec && cur === rec.tr) { if (lang === "en" || tx(rec.en) !== rec.tr) { n.nodeValue = tx(rec.en) ? cur.replace(rec.tr, tx(rec.en)!) : cur.replace(rec.tr, rec.en); if (lang === "en" || !tx(rec.en)) textOrig.current.delete(n); else textOrig.current.set(n, { en: rec.en, tr: tx(rec.en)! }); } continue; }
        const r = tx(cur);
        if (r) { const next = cur.replace(cur.trim(), r); textOrig.current.set(n, { en: cur.trim(), tr: r }); n.nodeValue = next; }
      }
      document.querySelectorAll("[aria-label],[title],[placeholder]").forEach((el) => {
        if (el.closest("[data-no-translate]")) return;
        const store = attrOrig.current.get(el) ?? {};
        for (const a of ATTRS) {
          const v = el.getAttribute(a); if (v == null) continue;
          const rec = store[a];
          if (rec && v === rec.tr) { const t = tx(rec.en); if (!t || lang === "en") { el.setAttribute(a, rec.en); delete store[a]; } else if (t !== rec.tr) { el.setAttribute(a, t); store[a] = { en: rec.en, tr: t }; } continue; }
          const t = tx(v); if (t) { store[a] = { en: v.trim(), tr: t }; el.setAttribute(a, t); }
        }
        attrOrig.current.set(el, store);
      });
    };
    const schedule = () => { if (!raf) raf = window.setTimeout(run, 16) as unknown as number; };
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { mo.disconnect(); if (raf) clearTimeout(raf); };
  }, [lang]);

  const choose = (code: LangCode) => {
    try { localStorage.setItem(KEY, code); localStorage.setItem("ared-lang-asked", "1"); } catch { /* ignore */ }
    setLang(code); setAsk(false);
    window.dispatchEvent(new CustomEvent("ared-lang-changed", { detail: code }));
  };
  if (!ask) return null;
  return (
    <div className="ared-langask" role="dialog" aria-label="Choose your language" data-no-translate>
      <p>Choose your language</p>
      <div>{LANGS.map((l) => <button key={l.code} type="button" onClick={() => choose(l.code)}>{l.native}</button>)}</div>
      <button type="button" className="ared-langask__x" aria-label="Continue in English" onClick={() => choose("en")}>×</button>
    </div>
  );
}
