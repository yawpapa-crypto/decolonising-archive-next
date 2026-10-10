"use client";
import { useState } from "react";
export default function BranchCollection({id,signedIn}:{id:string;signedIn:boolean}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function copy(){if(!signedIn){window.location.assign(`/signin?next=${encodeURIComponent(`/curated-collections/${id}`)}`);return;}setBusy(true);try{const response=await fetch(`/api/knowledge/collections/${id}`,{method:"POST"});const data=await response.json();if(!response.ok)throw Error(data.error);window.location.assign(`/home-next/collections/${data.id}`);}catch(e){setError(e instanceof Error?e.message:"Could not copy.");setBusy(false);}}
 return <div style={{margin:"20px 0"}}><button className="ared-btn ared-btn--outline" disabled={busy} onClick={copy}>{busy?"Making your copy…":"Make a private teaching / research copy"}</button>{error&&<p role="alert">{error}</p>}</div>;
}
