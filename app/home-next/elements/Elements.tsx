"use client";
import LineLoader from "@/app/home-next/ui/LineLoader";
import { useEffect, useMemo, useState } from "react";
import RecordGrid, { SizeControl, toTile, useGridSize, type SavedRow, type Tile } from "../RecordGrid";

export default function Elements() {
  const [rows, setRows] = useState<SavedRow[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [size, setSize] = useGridSize();
  useEffect(() => {
    fetch("/api/for-you/elements").then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "x"); setRows(d.items as SavedRow[]); }).catch(() => setErr("Saved records could not load. Refresh to try again."));
  }, []);
  const tiles = useMemo(() => (rows ?? []).map(toTile).filter((t) => !q.trim() || `${t.title} ${t.meta}`.toLowerCase().includes(q.trim().toLowerCase())), [rows, q]);
  async function remove(t: Tile) {
    const prev = rows;
    setRows((v) => (v ?? []).filter((r) => r.record_id !== t.id));
    const res = await fetch("/api/for-you/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, unsave: true }) }).catch(() => null);
    if (!res || !res.ok) { setRows(prev); setErr("That record could not be removed. Try again."); }
  }
  return (
    <>
      <header className="rg-head"><div><h1>Saved records</h1><p>{rows ? `${rows.length} saved ${rows.length === 1 ? "record" : "records"}` : <LineLoader inline size={18} label="Loading" />}</p></div>
        <div className="rg-tools"><input type="search" aria-label="Filter saved records" placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} /><SizeControl value={size} onChange={setSize} /></div></header>
      {err && <p role="alert" className="rg-err">{err}</p>}
      {rows && rows.length === 0 && !err && <p className="rg-empty">Nothing saved yet. Press Save on any record in For You or Explore and it will appear here.</p>}
      <RecordGrid tiles={tiles} size={size} onRemove={remove} removeLabel="Unsave" />
    </>
  );
}
