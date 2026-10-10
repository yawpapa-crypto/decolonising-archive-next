"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LineLoader from "../ui/LineLoader";

export interface PickList {
  id: string;
  title: string;
  count: number;
  cover?: string | null;
}

export interface PickerProps {
  rect: DOMRect;
  loggedIn: boolean;
  lists: PickList[] | null;
  current: string | null;
  itemTitle?: string;
  onChoose: (list: PickList | null) => void;
  onCreate: (title: string) => Promise<PickList | null>;
  onClose: () => void;
}

const Bookmark = () => <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M6 3.5h8v13l-4-3-4 3z" /></svg>;
const Plus = () => <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 4.5v11M4.5 10h11" /></svg>;
const Search = () => <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3.5 3.5" /></svg>;

/** Save to a collection: paper card, real collection covers, one quiet action per row. */
export default function CollectionPicker({ rect, loggedIn, lists, current, itemTitle, onChoose, onCreate, onClose }: PickerProps) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cursor, setCursor] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", down);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", down);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const width = 340, height = 420;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const top = rect.bottom + 8 + height > window.innerHeight ? Math.max(8, rect.top - 8 - height) : rect.bottom + 8;
  const shown = (lists ?? []).filter((l) => l.title.toLowerCase().includes(q.trim().toLowerCase()));
  const rows = 1 + shown.length;
  const choose = (n: number) => onChoose(n === 0 ? null : shown[n - 1]);
  const onKey = (e: React.KeyboardEvent) => {
    if (creating) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => (c + 1) % rows); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => (c <= 0 ? rows - 1 : c - 1)); }
    else if (e.key === "Enter" && cursor >= 0) { e.preventDefault(); choose(cursor); }
  };

  return (
    <div ref={ref} className="cz-pick" role="dialog" aria-label="Save to a collection" style={{ left, top }} onKeyDown={onKey}>
      <div className="cz-pick__head">
        <strong>Save to collection</strong>
        {itemTitle && <small title={itemTitle}>{itemTitle}</small>}
      </div>
      {loggedIn && (lists?.length ?? 0) > 4 && (
        <label className="cz-pick__search">
          <Search />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setCursor(-1); }} placeholder="Find a collection" aria-label="Find a collection" />
        </label>
      )}
      <div className="cz-pick__list" role="listbox" aria-label="Collections">
        <button type="button" role="option" aria-selected={current === null} className={`cz-pick__row${current === null ? " is-on" : ""}${cursor === 0 ? " is-cur" : ""}`} onClick={() => onChoose(null)}>
          <span className="cz-pick__cover" aria-hidden><Bookmark /></span>
          <span className="cz-pick__name"><strong>Saved records</strong><small>{loggedIn ? "Keep it without a collection" : "Kept until you leave"}</small></span>
          <span className="cz-pick__state">{current === null ? "Saved" : "Save"}</span>
        </button>
        {lists === null && <p className="cz-pick__hint"><LineLoader inline size={20} label="Finding your collections" /></p>}
        {shown.map((l, n) => (
          <button key={l.id} type="button" role="option" aria-selected={current === l.id} className={`cz-pick__row${current === l.id ? " is-on" : ""}${cursor === n + 1 ? " is-cur" : ""}`} onClick={() => onChoose(l)}>
            <span className="cz-pick__cover" style={l.cover ? { backgroundImage: `url("${l.cover.replace(/"/g, "%22")}")` } : undefined} aria-hidden>{!l.cover && l.title.slice(0, 1).toUpperCase()}</span>
            <span className="cz-pick__name"><strong>{l.title}</strong><small>{l.count} {l.count === 1 ? "record" : "records"}</small></span>
            <span className="cz-pick__state">{current === l.id ? "Added" : "Add"}</span>
          </button>
        ))}
        {lists && lists.length === 0 && loggedIn && <p className="cz-pick__hint">No collections yet. Start one below and this record goes straight in.</p>}
        {lists && lists.length > 0 && shown.length === 0 && <p className="cz-pick__hint">No collection by that name.</p>}
      </div>
      {err && <p className="cz-pick__err" role="alert">{err}</p>}
      <div className="cz-pick__foot">
        {!loggedIn ? (
          <p className="cz-pick__hint"><Link href="/signin?next=/home-next/for-you">Log in</Link> to keep saves and build collections.</p>
        ) : creating ? (
          <form
            className="cz-pick__new"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim() || busy) return;
              setBusy(true); setErr("");
              const made = await onCreate(name.trim());
              setBusy(false);
              if (made) onChoose(made); else setErr("That collection could not be created. Try again.");
            }}
          >
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name the collection" aria-label="Collection name" maxLength={120} />
            <button type="submit" className="cz-btn" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create"}</button>
          </form>
        ) : (
          <button type="button" className="cz-btn--line" onClick={() => { setName(q.trim()); setCreating(true); }}>
            <Plus /> {q.trim() && shown.length === 0 ? `New collection “${q.trim().slice(0, 28)}”` : "New collection"}
          </button>
        )}
      </div>
    </div>
  );
}
