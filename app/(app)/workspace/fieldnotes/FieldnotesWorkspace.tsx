"use client";
import { useCallback, useEffect, useState } from "react";
type Encounter = { id: string; title: string; contextual_note: string; project_id: string; revision: string; started_at: string };
type Media = {id:string; encounter_id:string; media_type:string; has_remote:boolean};
type Project = { id: string; title: string; access: { canWrite: boolean } };
type Collection = { id: string; title: string; encounter_ids: string[] };
async function api<T>(action: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/fieldnotes/${action}`, { ...init, headers: { "Content-Type": "application/json" }, cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || result.message || "Request failed");
  return result as T;
}
function Preview({media}:{media:Media | undefined}) {
  const [url,setUrl]=useState<string | null>(null);
  useEffect(()=>{ if (!media?.has_remote) return; let active=true; void api<{url:string}>(`media-url?id=${encodeURIComponent(media.id)}`).then(r=>{if(active)setUrl(r.url);}).catch(()=>{}); return ()=>{active=false;}; },[media?.id,media?.has_remote]);
  if (!media) return null;
  if (!url) return <p>{media.has_remote ? "Preview unavailable" : "Media kept on the capturing device"}</p>;
  return media.media_type === "photo" ? <img src={url} alt="" loading="lazy" style={{width:"100%",maxHeight:300,objectFit:"cover",borderRadius:12}}/> : <p>{media.media_type} · Cloud media available</p>;
}
export default function FieldnotesWorkspace() {
  const [media, setMedia] = useState<Media[]>([]);
  const [limit,setLimit]=useState(40);
  const [query,setQuery]=useState("");
  const [notes, setNotes] = useState<Encounter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selected, setSelected] = useState<Encounter | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      const index = await api<{ encounters: Encounter[]; projects: Project[]; media: Media[]; features: { collections: boolean } }>("field-index");
      setNotes(index.encounters); setMedia(index.media); setProjects(index.projects);
      if (index.features.collections) { const c = await api<{ collections: Collection[] }>("fieldnote-collections"); setCollections(c.collections); }
    } catch(e) { setError(e instanceof Error ? e.message : "Could not load fieldnotes"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const mutate = async (work: () => Promise<void>) => {
    setBusy(true); setError(""); setStatus("");
    try { await work(); } catch(e) { setError(e instanceof Error ? e.message : "Changes were not confirmed"); } finally { setBusy(false); }
  };
  return <section aria-label="Private fieldnotes">
    <button type="button" onClick={() => void load()} disabled={busy || loading}>Refresh from Fieldnotes</button>
    {loading ? <p role="status">Loading your research…</p> : null}
    {error ? <p role="alert">{error}</p> : null}{status ? <p role="status">{status}</p> : null}
    <label style={{display:"block",marginTop:20}}>Search fieldnotes<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setLimit(40);}} style={{padding:12, marginLeft:12}} /></label>
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:16, marginTop:24}}>
      {notes.filter(n=>`${n.title} ${n.contextual_note}`.toLowerCase().includes(query.toLowerCase())).slice(0,limit).map(n => <button key={n.id} type="button" style={{textAlign:"left", padding:24, border:"1px solid #8884", borderRadius:20, color:"inherit", background:"transparent"}} onClick={() => { setSelected(n); setTitle(n.title || ""); setBody(n.contextual_note || ""); setError(""); }}><Preview media={media.find(m=>m.encounter_id===n.id && m.media_type==="photo")} /><strong>{n.title || "Untitled fieldnote"}</strong><p>{projects.find(p=>p.id===n.project_id)?.title}</p><p>{n.contextual_note?.slice(0,160)}</p></button>)}
    </div>
    {notes.length > limit ? <button type="button" onClick={()=>setLimit(n=>n+40)}>Show more fieldnotes</button> : null}
    {!loading && !error && !notes.length ? <p>Fieldnotes you capture in the app appear here after the server confirms synchronisation.</p> : null}
    {selected ? <section style={{marginTop:32}} aria-label="Edit fieldnote"><h2>{selected.title || "Fieldnote"}</h2>
      <form onSubmit={e=>{e.preventDefault(); if (busy) return; void mutate(async()=>{ const result = await api<{encounter:Encounter}>(`encounter?id=${encodeURIComponent(selected.id)}`, {method:"PATCH", body:JSON.stringify({ title, contextualNote:body, expectedRevision:selected.revision })}); setSelected(result.encounter); setNotes(ns=>ns.map(n=>n.id===selected.id?result.encounter:n)); setStatus("Saved to the shared research service. Refresh Fieldnotes to see the update."); });}}>
        <label style={{display:"block"}}>Title<input style={{display:"block", width:"100%", padding:12, margin:"8px 0 20px"}} value={title} onChange={e=>setTitle(e.target.value)} maxLength={240} readOnly={!projects.find(p=>p.id===selected.project_id)?.access.canWrite}/></label>
        <label style={{display:"block"}}>Description<textarea style={{display:"block", width:"100%", padding:12, margin:"8px 0 20px"}} rows={6} value={body} onChange={e=>setBody(e.target.value)} readOnly={!projects.find(p=>p.id===selected.project_id)?.access.canWrite}/></label>
        <button type="submit" disabled={busy || !projects.find(p=>p.id===selected.project_id)?.access.canWrite || !selected.revision}>{busy?"Saving…":"Save changes"}</button>
        <button type="button" onClick={()=>setSelected(null)} disabled={busy}>Close</button>
      </form><h3>Save to a collection</h3>
      {collections.map(c=><button key={c.id} type="button" disabled={busy || c.encounter_ids.includes(selected.id)} onClick={()=>void mutate(async()=>{await api(`fieldnote-collection?id=${encodeURIComponent(c.id)}`, {method:"POST", body:JSON.stringify({ encounterId:selected.id, present:true })}); setCollections(cs=>cs.map(x=>x.id===c.id?{...x,encounter_ids:[...x.encounter_ids,selected.id]}:x)); setStatus(`Saved to ${c.title}`);})}>{c.title}{c.encounter_ids.includes(selected.id)?" ✓":""}</button>)}
    </section> : null}
  </section>;
}
