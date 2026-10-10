"use client";
import { useEffect, useRef, useState } from "react";
import LanguageLayer from "./LanguageLayer";
import { LANGS } from "./i18n";
type Settings = { night: boolean; calm: boolean; large: boolean; contrast: boolean; readable: boolean; links: boolean };
const defaults: Settings = { night: false, calm: false, large: false, contrast: false, readable: false, links: false };

function applyAttrs(st: Settings) {
  const r = document.documentElement;
  r.dataset.aredNight = String(st.night); r.dataset.aredCalm = String(st.calm);
  r.dataset.aredLarge = String(st.large); r.dataset.aredContrast = String(st.contrast);
  r.dataset.aredReadable = String(st.readable); r.dataset.aredLinks = String(st.links);
}

/** Applies saved display settings on pages that do not show the widget. */
export function DisplayApply() {
  useEffect(() => { try { const v = localStorage.getItem("ared-display"); if (v) applyAttrs({ ...defaults, ...JSON.parse(v) }); } catch {} }, []);
  return null;
}
const HELLO: Record<string, string> = { en: "Welcome", tw: "Akwaaba", yo: "Káàbọ̀", ig: "Nnọọ", ha: "Barka da zuwa", sw: "Karibu", zu: "Siyakwamukela", fr: "Bienvenue", ee: "Woezɔ", gaa: "Ojekoo", am: "እንኳን ደህና መጡ", ar: "أهلاً وسهلاً", pt: "Bem-vindo", af: "Welkom", sn: "Mauya", so: "Soo dhawow" };
const VOICE: Record<string, string> = { tw: "ak", yo: "yo", ig: "ig", ha: "ha", sw: "sw", zu: "zu", fr: "fr", am: "am", ar: "ar", pt: "pt", af: "af", sn: "sn", so: "so", en: "en" };
function voiceFor(code: string): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  const p = VOICE[code]; if (!p) return undefined;
  return window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(p));
}
const ICONS: Record<string, string> = {
  night: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  calm: "M3 12h4l3-7 4 14 3-7h4",
  large: "M4 19 9 5l5 14M6 14h6M16 19l3-8 3 8M17 17h4",
  contrast: "M12 3a9 9 0 1 0 0 18V3z M12 3a9 9 0 0 1 0 18",
  readable: "M5 5h14M12 5v14M8 19h8",
  links: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
};
const ROWS = [
  { key: "night", label: "Night mode", hint: "Easier on the eyes after dark" },
  { key: "calm", label: "Reduce motion", hint: "Quiet the animations" },
  { key: "large", label: "Larger text", hint: "Bigger, easier reading" },
  { key: "contrast", label: "Higher contrast", hint: "Sharper edges and colour" },
  { key: "readable", label: "Readable text", hint: "Open spacing, clear letter shapes" },
  { key: "links", label: "Highlight links", hint: "Underline every link" },
] as const;

export default function DisplaySettings() {
  const [lang, setLang] = useState("en");
  const [hello, setHello] = useState(0);
  const [settings, setSettings] = useState(defaults);
  const ref = useRef<HTMLDetailsElement>(null);
  const [voices, setVoices] = useState<Record<string, boolean>>({});
  const [talk, setTalk] = useState(true);
  useEffect(() => {
    try { setTalk(localStorage.getItem("ared-speak") !== "0"); } catch {}
    if (!("speechSynthesis" in window)) return;
    const load = () => { const m: Record<string, boolean> = {}; for (const l of LANGS) m[l.code] = !!voiceFor(l.code); setVoices(m); };
    load(); window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  const say = (code: string) => {
    if (!talk) return; const v = voiceFor(code); if (!v) return;
    const u = new SpeechSynthesisUtterance(HELLO[code] || HELLO.en); u.voice = v; u.lang = v.lang; u.rate = 0.9;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  };
  const toggleTalk = () => { const n = !talk; setTalk(n); try { localStorage.setItem("ared-speak", n ? "1" : "0"); } catch {} if (!n && "speechSynthesis" in window) window.speechSynthesis.cancel(); };

  useEffect(() => {
    try { setLang(localStorage.getItem("ared-lang") || "en"); } catch {}
    const on = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener("ared-lang-changed", on);
    return () => window.removeEventListener("ared-lang-changed", on);
  }, []);
  const pick = (code: string) => {
    setLang(code); setHello(h => h + 1);
    try { localStorage.setItem("ared-lang", code); localStorage.setItem("ared-lang-asked", "1"); } catch {}
    window.dispatchEvent(new CustomEvent("ared-lang", { detail: code }));
    say(code);
  };
  useEffect(() => {
    const sync = () => { try { const s = localStorage.getItem("ared-display"); if (s) setSettings({ ...defaults, ...JSON.parse(s) }); } catch {} };
    sync();
    window.addEventListener("ared-display", sync);
    return () => window.removeEventListener("ared-display", sync);
  }, []);
  useEffect(() => {
    applyAttrs(settings);
    try { localStorage.setItem("ared-display", JSON.stringify(settings)); } catch {}
  }, [settings]);
  useEffect(() => {
    const out = (e: MouseEvent) => { const d = ref.current; if (d?.open && !d.contains(e.target as Node)) d.open = false; };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && ref.current?.open) { ref.current.open = false; ref.current.querySelector("summary")?.focus(); } };
    document.addEventListener("mousedown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, []);

  const active = ROWS.filter(r => settings[r.key]).length;
  const dirty = active > 0;
  const reset = () => setSettings(defaults);
  useEffect(() => {
    const open = () => { if (ref.current) ref.current.open = true; };
    window.addEventListener("ared-open-display", open);
    return () => window.removeEventListener("ared-open-display", open);
  }, []);

  return (
    <>
      <LanguageLayer />
      <details className="ds" ref={ref} data-night={settings.night} data-large={settings.large} data-contrast={settings.contrast}>
        <summary aria-label="Display and accessibility settings">
          <span className="ds-orb" aria-hidden="true" />
          <span>Display</span>
          {dirty && <i className="ds-count" aria-hidden="true">{active}</i>}
        </summary>
        <div className="ds-panel" role="group" aria-label="Make yourself comfortable">
          <header className="ds-head">
            <strong>Make yourself comfortable</strong>
            {dirty && <button type="button" className="ds-reset" onClick={reset}>Reset</button>}
          </header>

          <div className="ds-preview" aria-hidden="true">
            <span className="ds-pv-tag">Live preview</span>
            <span className="ds-pv-title" key={hello}>{HELLO[lang] || HELLO.en}</span>
            <span className="ds-pv-sub">Aa Bb Cc, the archive, read your way</span>
            <span className="ds-pv-bars"><b /><b /><b /></span>
          </div>

          <div className="ds-rows">
            {ROWS.map(({ key, label, hint }, i) => (
              <button key={key} type="button" role="switch" aria-checked={settings[key]} aria-label={label}
                className={"ds-row" + (settings[key] ? " on" : "")} style={{ ["--i" as string]: i } as React.CSSProperties}
                onClick={() => setSettings({ ...settings, [key]: !settings[key] })}>
                <svg viewBox="0 0 24 24" className="ds-ic" aria-hidden="true"><path d={ICONS[key]} /></svg>
                <span className="ds-tx"><b>{label}</b><small>{hint}</small></span>
                <span className="ds-sw" aria-hidden="true"><span /></span>
              </button>
            ))}
          </div>

          <div className="ds-lang" data-no-translate>
            <div className="ds-lhead"><span className="ds-lh">Language</span><button type="button" className={"ds-talk" + (talk ? " on" : "")} aria-pressed={talk} onClick={toggleTalk} title="Say a greeting when you pick a language">{talk ? "Voice on" : "Voice off"}</button></div>
            <div className="ds-chips" role="radiogroup" aria-label="Language">
              {LANGS.map(l => (
                <button key={l.code} type="button" role="radio" aria-checked={lang === l.code}
                  className={"ds-chip" + (lang === l.code ? " on" : "")} onClick={() => pick(l.code)}>{l.native}{voices[l.code] && talk && l.code !== "en" ? <svg viewBox="0 0 24 24" className="ds-spk" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zM16 8a5 5 0 0 1 0 8" /></svg> : null}</button>
              ))}
            </div>
          </div>
        </div>
      </details>
    </>
  );
}
