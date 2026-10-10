"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const GO = [
  { label: "For You", href: "/home-next/for-you" },
  { label: "Explore", href: "/home-next/explore" },
  { label: "Saved records", href: "/home-next/elements" },
  { label: "About", href: "/about" },
  { label: "Profile", href: "/home-next/profile" },
  { label: "Settings", href: "/home-next/settings" },
  { label: "Help center", href: "/home-next/help" },
];
const IDEAS = ["goldweights", "kente cloth", "adinkra", "Asante", "Yoruba", "manuscripts", "Benin bronzes", "oral literature", "protest posters", "textiles"];

interface Row { key: string; label: string; hint: string; href: string }

/** Command bar: press Cmd/Ctrl+K or / anywhere to jump or search, without leaving the keyboard. */
export default function CommandBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const close = useCallback(() => { setOpen(false); setQ(""); setAt(0); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, [contenteditable]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onEvt = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("ared:command", onEvt);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ared:command", onEvt);
    };
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const rows = useMemo<Row[]>(() => {
    const t = q.trim();
    const low = t.toLowerCase();
    const out: Row[] = [];
    if (t) {
      out.push({ key: "s", label: `Search Explore for ‘${t}’`, hint: "Enter", href: `/home-next/explore?q=${encodeURIComponent(t)}` });
      out.push({ key: "l", label: `Search Explore for ‘${t}’`, hint: "Explore", href: `/home-next/explore?q=${encodeURIComponent(t)}` });
    }
    GO.filter((g) => !low || g.label.toLowerCase().includes(low)).forEach((g) => out.push({ key: g.href, label: g.label, hint: "Go to", href: g.href }));
    IDEAS.filter((s) => low && s.toLowerCase().includes(low) && s.toLowerCase() !== low).slice(0, 4).forEach((s) => out.push({ key: `i-${s}`, label: s, hint: "Search", href: `/home-next/explore?q=${encodeURIComponent(s)}` }));
    if (!t) IDEAS.slice(0, 5).forEach((s) => out.push({ key: `i-${s}`, label: s, hint: "Try", href: `/home-next/explore?q=${encodeURIComponent(s)}` }));
    return out;
  }, [q]);

  const go = (r: Row | undefined) => {
    if (!r) return;
    close();
    router.push(r.href);
  };

  if (!open) return null;
  return (
    <div className="fy-cmd" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="fy-cmd__panel" role="dialog" aria-modal="true" aria-label="Command bar">
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setAt(0); }}
          placeholder="Search the archive or jump to a page"
          aria-label="Command"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowDown") { e.preventDefault(); setAt((a) => Math.min(rows.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setAt((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter") go(rows[at]);
          }}
        />
        <ul role="listbox">
          {rows.map((r, n) => (
            <li key={r.key} role="option" aria-selected={n === at} className={n === at ? "is-on" : ""} onMouseEnter={() => setAt(n)} onClick={() => go(r)}>
              <span>{r.label}</span>
              <small>{r.hint}</small>
            </li>
          ))}
        </ul>
        <p className="fy-cmd__foot">Up and down to move, Enter to go, Esc to close</p>
      </div>
    </div>
  );
}
