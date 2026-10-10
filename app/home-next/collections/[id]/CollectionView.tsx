"use client";
import LineLoader from "@/app/home-next/ui/LineLoader";
import EditionEditor from "@/components/knowledge/EditionEditor";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RecordGrid, { SizeControl, toTile, useGridSize, type SavedRow, type Tile } from "../../RecordGrid";

export default function CollectionView({ id }: { id: string }) {
  const router = useRouter();
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<SavedRow[] | null>(null);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const [description,setDescription] = useState("");
  const [draftDescription,setDraftDescription] = useState("");
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [size, setSize] = useGridSize();
  const url = `/api/for-you/collections/${encodeURIComponent(id)}`;

  useEffect(() => {
    fetch(url).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "x"); setTitle(d.list.title); setPublished(d.list.is_public); setDescription(d.list.description || ""); setRows(d.items as SavedRow[]); }).catch((e: Error) => setErr(e.message === "Collection not found." ? "This collection no longer exists." : "The collection could not load. Refresh to try again."));
  }, [url]);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft, description: draftDescription }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) { setTitle(d.title); setDescription(draftDescription); setEditing(false); setErr(""); } else setErr(d.error || "Could not rename the collection.");
  }
  async function publish() {
    if (!published && !window.confirm("Publish this collection? Its title, description, curatorial writing and verified public records will be visible to everyone. Private notes remain private.")) return;
    setPublishing(true);
    const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_public: !published }) }).catch(() => null);
    if (r?.ok) setPublished(v => !v); else setErr("Could not change publication status.");
    setPublishing(false);
  }
  async function del() {
    const r = await fetch(url, { method: "DELETE" }).catch(() => null);
    if (r?.ok) router.push("/profile"); else { setErr("Could not delete the collection."); setConfirm(false); }
  }
  async function take(t: Tile) {
    const prev = rows;
    setRows((v) => (v ?? []).filter((r) => r.record_id !== t.id));
    const r = await fetch(`${url}?record=${encodeURIComponent(t.id)}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) { setRows(prev); setErr("That record could not be removed."); }
  }

  if (err && !rows) return <><p role="alert" className="rg-err">{err}</p><Link href="/profile" className="ared-btn ared-btn--outline">Back to collections</Link></>;
  return (
    <>
      <p className="rg-crumb"><Link href="/profile">Collections</Link></p>
      <header className="rg-head">
        <div>
          {editing ? (
            <form onSubmit={rename} className="rg-edit"><label className="rg-sr" htmlFor="ct">Collection name</label><input id="ct" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={120} required autoFocus /><label>Curatorial context<textarea value={draftDescription} onChange={e=>setDraftDescription(e.target.value)} maxLength={2000} placeholder="What connects these records?" /></label><button className="ared-btn ared-btn--primary ared-btn--sm">Save</button><button type="button" className="ared-btn ared-btn--outline ared-btn--sm" onClick={() => setEditing(false)}>Cancel</button></form>
          ) : <><h1>{title || "…"}</h1>{description && <p>{description}</p>}</>}
          <p>{rows ? `${rows.length} ${rows.length === 1 ? "record" : "records"}` : <LineLoader inline size={18} label="Loading" />}</p>
        </div>
        <div className="rg-tools">
          <button className="ared-btn ared-btn--outline ared-btn--sm" disabled={publishing} onClick={() => void publish()}>{published ? "Make private" : "Publish collection"}</button>
          {published && <Link href={`/curated-collections/${id}`}>View public collection ↗</Link>}
          <button type="button" className="ared-btn ared-btn--outline ared-btn--sm" onClick={() => { setDraft(title); setDraftDescription(description); setEditing(true); }}>Rename</button>
          {confirm ? <><button type="button" className="ared-btn ared-btn--primary ared-btn--sm" onClick={del}>Delete for good</button><button type="button" className="ared-btn ared-btn--outline ared-btn--sm" onClick={() => setConfirm(false)}>Keep</button></> : <button type="button" className="ared-btn ared-btn--outline ared-btn--sm" onClick={() => setConfirm(true)}>Delete</button>}
          <SizeControl value={size} onChange={setSize} />
        </div>
      </header>
      {confirm && <p className="rg-note">Deleting removes the collection only. Its records stay in Saved records.</p>}
      {err && <p role="alert" className="rg-err">{err}</p>}
      {rows && rows.length === 0 && <p className="rg-empty">This collection is empty. Choose Add to collection on any record in For You.</p>}
      {rows && <EditionEditor id={id} records={rows.map(r=>({id:r.record_id,title:r.record_title??r.record_id}))} />}
      <RecordGrid tiles={(rows ?? []).map(toTile)} size={size} onRemove={take} removeLabel="Remove" />
    </>
  );
}
