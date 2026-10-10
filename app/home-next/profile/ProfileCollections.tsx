"use client";
import Select from "../ui/Select";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SizeControl, useGridSize } from "../RecordGrid";

type Collection = { id: string; title: string; count: number; cover?: string | null };
type Order = "latest" | "name" | "group";
const MIN = [160, 240, 340];

export default function ProfileCollections() {
  const [tab, setTab] = useState("collections");
  const [lists, setLists] = useState<Collection[]>([]);
  const [status, setStatus] = useState("Loading collections…");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState<Order>("latest");
  const [size, setSize] = useGridSize();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/for-you/collections").then(async (r) => { if (!r.ok) throw new Error(); return r.json(); }).then((d) => { if (active) { setLists(d.lists); setStatus(""); } }).catch(() => { if (active) setStatus("Collections could not load. Refresh to try again."); });
    if (new URLSearchParams(window.location.search).get("new")) setCreating(true);
    try { const o = localStorage.getItem("ared-collections-order"); if (o === "name" || o === "group") setOrder(o); } catch { /* ignore */ }
    return () => { active = false; };
  }, []);

  const changeOrder = (o: Order) => { setOrder(o); try { localStorage.setItem("ared-collections-order", o); } catch { /* ignore */ } };

  const sections = useMemo(() => {
    if (order === "latest") return [{ key: "", items: lists }];
    const sorted = [...lists].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    if (order === "name") return [{ key: "", items: sorted }];
    const by = new Map<string, Collection[]>();
    for (const l of sorted) {
      const k = (l.title.trim()[0] ?? "#").toUpperCase();
      const key = /[A-Z]/.test(k) ? k : "#";
      by.set(key, [...(by.get(key) ?? []), l]);
    }
    return [...by.entries()].map(([key, items]) => ({ key, items }));
  }, [lists, order]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setStatus("Creating collection…");
    try {
      const r = await fetch("/api/for-you/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setLists((v) => [d.list, ...v]); setCreating(false); setTitle(""); setStatus("");
    } catch (er) { setStatus(er instanceof Error ? er.message : "Could not create collection."); }
  }
  async function rename(id: string, e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch(`/api/for-you/collections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) { setLists((v) => v.map((l) => (l.id === id ? { ...l, title: d.title } : l))); setRenaming(null); setStatus(""); } else setStatus(d.error || "Could not rename the collection.");
  }
  async function remove(id: string) {
    const r = await fetch(`/api/for-you/collections/${id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) { setLists((v) => v.filter((l) => l.id !== id)); setDeleting(null); setStatus(""); } else { setStatus("Could not delete the collection."); setDeleting(null); }
  }

  return <>
    <div className="account-tabs" role="tablist" aria-label="Your archive"><button role="tab" aria-selected={tab === "saved"} onClick={() => setTab("saved")}>Saved records</button><button role="tab" aria-selected={tab === "collections"} onClick={() => setTab("collections")}>Collections {lists.length}</button></div>
    {tab === "saved" ? <div className="account-empty"><h2>Your saved knowledge</h2><p>Every record you have saved, in one place.</p><div className="account-actions" style={{ justifyContent: "center" }}><Link href="/elements" className="ared-btn ared-btn--outline">Open saved records</Link></div></div> : <>
      <div className="pc-bar">
        <Select compact name="order" label="Order collections" value={order} onChange={(v) => changeOrder(v as Order)} options={[{ value: "latest", label: "Latest" }, { value: "name", label: "Name A to Z" }, { value: "group", label: "Group by name" }]} />
        <SizeControl value={size} onChange={setSize} />
      </div>
      {status && <p role="status">{status}</p>}
      {creating && <form className="pc-create" onSubmit={create}>
        <div className="pc-create__copy"><h2>Name your collection</h2><p>Give it a theme you will recognise later, such as a place, a people or a question you are following. You can rename it any time.</p></div>
        <label className="rg-sr" htmlFor="pc-new">Collection name</label>
        <input id="pc-new" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} autoFocus placeholder="For example: Asante textiles" />
        <div className="pc-create__row"><span>{title.length}/120</span><button type="button" className="pc-create__cancel" onClick={() => setCreating(false)}>Cancel</button><button className="pc-create__go" disabled={!title.trim() || status === "Creating collection…"}>Create collection</button></div>
      </form>}
      {sections.map((s, i) => (
        <section key={s.key || "all"}>
          {s.key && <h3 className="pc-group">{s.key}</h3>}
          <div className="account-collections" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${MIN[size]}px, 1fr))` }}>
            {i === 0 && <button type="button" className="account-collection" style={{ border: 0, background: "transparent", textAlign: "left", cursor: "pointer" }} onClick={() => setCreating(true)}><span className="account-cover">+</span><strong>New collection</strong><small>Group related knowledge</small></button>}
            {s.items.map((l) => (
              <div className="pc-item" key={l.id}>
                <Link className="account-collection" href={`/collections/${l.id}`}><span className="account-cover" style={l.cover ? { backgroundImage: `url("${l.cover.replace(/"/g, "%22")}")`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" } : undefined}>{l.title.slice(0, 1)}</span>{renaming === l.id ? null : <><strong>{l.title}</strong><small>{l.count} {l.count === 1 ? "record" : "records"}</small></>}</Link>
                {renaming === l.id && <form className="pc-rename" onSubmit={(e) => rename(l.id, e)}><label className="rg-sr" htmlFor={`r-${l.id}`}>Collection name</label><input id={`r-${l.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={120} required autoFocus /><button className="ared-btn ared-btn--primary ared-btn--sm">Save</button><button type="button" className="ared-btn ared-btn--outline ared-btn--sm" onClick={() => setRenaming(null)}>Cancel</button></form>}
                {renaming !== l.id && (deleting === l.id
                  ? <div className="pc-menu" style={{ opacity: 1 }}><button type="button" onClick={() => remove(l.id)}>Delete</button><button type="button" onClick={() => setDeleting(null)}>Keep</button></div>
                  : <div className="pc-menu"><button type="button" onClick={() => { setRenaming(l.id); setDraft(l.title); }}>Rename</button><button type="button" onClick={() => setDeleting(l.id)}>Delete</button></div>)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>}
  </>;
}
