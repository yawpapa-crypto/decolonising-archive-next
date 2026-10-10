import Link from "next/link";
import AccountShell from "@/app/home-next/AccountShell";
import { publicKnowledgeGraph } from "@/lib/knowledge/server";
export const dynamic="force-dynamic";
export const metadata={title:"Connections in the archive | ARED",description:"Explore documented makers, sources, periods, concepts and public curatorial connections."};
export default async function Page({searchParams}:{searchParams:Promise<{node?:string}>}){
 const graph=await publicKnowledgeGraph();const {node}=await searchParams;const selected=graph.nodes.find(n=>n.id===node);const ids=new Set(graph.edges.filter(e=>e.to===node||e.from===node).flatMap(e=>[e.from,e.to]));const shown=selected?graph.nodes.filter(n=>ids.has(n.id)&&n.id!==selected.id):graph.nodes.filter(n=>n.kind!=="record").slice(0,100);
 return <AccountShell><main className="account-page"><p>Documented connections</p><h1>{selected?.label??"Follow a thread through the archive."}</h1><p>Connections describe catalogue metadata and reviewed curatorial claims. A shared label does not prove influence or a historical relationship.</p><p>{graph.nodes.length.toLocaleString()} entities · {graph.edges.length.toLocaleString()} relationships</p><nav aria-label="Knowledge connections" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:20,marginTop:32}}>{shown.map(n=><Link key={n.id} href={n.url} style={{padding:20,border:"1px solid #ddd",borderRadius:16}}><small>{n.kind}</small><h2 style={{fontSize:20}}>{n.label}</h2></Link>)}</nav>{selected&&<Link href="/knowledge-graph">All connections</Link>}</main></AccountShell>;
}
