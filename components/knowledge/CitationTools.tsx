"use client";
import { useState } from "react";
import "@/app/home-next/ui/ui.css";

const STYLES = [["apa", "APA"], ["chicago", "Chicago"], ["mla", "MLA"]] as const;

/** Cite this record: style switch, copy, and BibTeX/RIS downloads. */
export type CiteItem = { id: string; title: string; authors?: string; year?: string; source?: string; url?: string };

const clean = (v?: string) => (v ?? "").replace(/\s+/g, " ").trim();
const key = (i: CiteItem) => clean(i.id).replace(/[^\w]+/g, "_").slice(0, 40) || "record";
function bibtex(i: CiteItem) {
  const f = (k: string, v?: string) => (clean(v) ? `  ${k} = {${clean(v).replace(/[{}]/g, "")}},\n` : "");
  return `@misc{${key(i)},\n${f("title", i.title)}${f("author", i.authors)}${f("year", i.year)}${f("howpublished", i.source)}${f("url", i.url)}  note = {Accessed via the Decolonising Archive},\n}\n`;
}
function ris(i: CiteItem) {
  const l = (t: string, v?: string) => (clean(v) ? `${t}  - ${clean(v)}\r\n` : "");
  const authors = clean(i.authors).split(/;|\band\b/).map(clean).filter(Boolean).map((a) => l("AU", a)).join("");
  return `TY  - GEN\r\n${l("TI", i.title)}${authors}${l("PY", i.year)}${l("PB", i.source)}${l("UR", i.url)}ER  - \r\n`;
}
function formatted(i: CiteItem, style: string) {
  const a = clean(i.authors), y = clean(i.year) || "n.d.", t = clean(i.title), s = clean(i.source), u = clean(i.url);
  if (style === "mla") return `${a ? a + ". " : ""}“${t}.” ${s ? s + ", " : ""}${y}${u ? ", " + u : ""}.`;
  if (style === "chicago") return `${a ? a + ". " : ""}“${t}.” ${s ? s + ", " : ""}${y}.${u ? " " + u + "." : ""}`;
  return `${a ? a + " " : ""}(${y}). ${t}.${s ? " " + s + "." : ""}${u ? " " + u : ""}`;
}
function save(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CitationTools({ id, item }: { id: string; item?: CiteItem }) {
  const [style, setStyle] = useState<string>("apa");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function copy() {
    setBusy(true); setStatus("");
    try {
      const res = await fetch(`/api/records/${encodeURIComponent(id)}/citation?style=${style}`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      setText(data.formatted);
      try { await navigator.clipboard.writeText(data.formatted); setStatus("Citation copied."); }
      catch { setStatus("Select and copy the citation below."); }
    } catch {
      if (item) {
        const t = formatted(item, style); setText(t);
        try { await navigator.clipboard.writeText(t); setStatus("Citation copied."); } catch { setStatus("Select and copy the citation below."); }
      } else setStatus("A citation is not available for this record yet.");
    }
    finally { setBusy(false); }
  }

  const q = encodeURIComponent(id);
  return (
    <details className="ct">
      <summary className="ct__sum">Cite this record</summary>
      <div className="ct__body">
        <div className="ct__row">
          <div className="ct__seg" role="radiogroup" aria-label="Citation style">
            {STYLES.map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={style === v} className={style === v ? "is-on" : ""} onClick={() => { setStyle(v); setText(""); setStatus(""); }}>{l}</button>
            ))}
          </div>
          <button type="button" className="ct__btn ct__btn--primary" disabled={busy} aria-busy={busy} onClick={copy}>{busy ? "Preparing…" : "Copy citation"}</button>
          {item ? (
            <>
              <button type="button" className="ct__btn" onClick={() => save(`${key(item)}.bib`, bibtex(item), "application/x-bibtex")}>BibTeX</button>
              <button type="button" className="ct__btn" onClick={() => save(`${key(item)}.ris`, ris(item), "application/x-research-info-systems")}>RIS</button>
            </>
          ) : (
            <>
              <a className="ct__btn" href={`/api/records/${q}/citation?format=bibtex`} download>BibTeX</a>
              <a className="ct__btn" href={`/api/records/${q}/citation?format=ris`} download>RIS</a>
            </>
          )}
        </div>
        {text && <textarea className="ct__text" aria-label="Formatted citation" readOnly value={text} rows={4} onFocus={(e) => e.currentTarget.select()} />}
        <p className="ct__status" role="status" aria-live="polite">{status}</p>
        <p className="ct__fine">Generated from recorded metadata. Check the source and your style guide; missing attribution or dates are never invented.</p>
      </div>
    </details>
  );
}
