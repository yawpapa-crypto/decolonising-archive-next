import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('lib/home/europeana-normalize.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {searchEuropeana}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const key=process.env.EUROPEANA_API_KEY || fs.readFileSync('.env.local','utf8').match(/^EUROPEANA_API_KEY=(.+)$/m)?.[1]?.trim();assert.ok(key);
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const queries=['Ghana','Accra','graphic design Ghana','Ghana poster','Ghana independence','Kwame Nkrumah','Gold Coast','Highlife','African print','African typography'];
const results=[];
for(const query of queries){
 const upstream=await searchEuropeana(query,1,4,key);
 const response=await fetch(base+'/api/explore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:query,page:1,seen:[]}),signal:AbortSignal.timeout(90000)});assert.equal(response.status,200);
 const pool=await response.json();const euro=pool.items.filter(i=>i.source==='Europeana');const other=pool.items.filter(i=>i.source!=='Europeana');
 for(const item of euro){assert.ok(item.image);assert.ok(item.recordId);assert.ok(item.href.startsWith('https://www.europeana.eu/'));assert.ok(!JSON.stringify(item).includes(key));assert.equal(item.imageRole,'preview');}
 // Search can legitimately have no matching Europeana objects, without fabricated fill.
 if(upstream.length)assert.ok(euro.length,'Europeana candidates missing from shared search for '+query);
 let image=null;if(euro.length){const r=await fetch(base+'/api/archive-image?url='+encodeURIComponent(euro[0].image),{signal:AbortSignal.timeout(20000)});image={status:r.status,type:r.headers.get('content-type'),bytes:(await r.arrayBuffer()).byteLength};}
 const row={query,upstream:upstream.length,europeana:euro.length,others:other.length,sources:[...new Set(pool.items.map(i=>i.source))],rights:euro.filter(i=>i.rights?.length).length,institutions:euro.filter(i=>i.institution?.length).length,image};results.push(row);console.log(JSON.stringify(row));
}
fs.mkdirSync('artifacts/europeana',{recursive:true});fs.writeFileSync('artifacts/europeana/live-results.json',JSON.stringify(results,null,2));
const imagePool=await(await fetch(base+'/api/discover?type=images&q=Ghana')).json();assert.ok(imagePool.items.some(i=>i.source==='Europeana'));console.log('PASS shared discover image pool');
const searchPage=async(page,seen=[])=>{const r=await fetch(base+'/api/explore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:'Accra',page,seen}),signal:AbortSignal.timeout(90000)});assert.equal(r.status,200);return(await r.json()).items;};
const first=await searchPage(1);const second=await searchPage(2,first.map(i=>i.id));const firstIds=new Set(first.filter(i=>i.source==='Europeana').map(i=>i.id));const next=second.filter(i=>i.source==='Europeana');assert.ok(firstIds.size&&next.length);assert.ok(next.every(i=>!firstIds.has(i.id)));console.log('PASS Europeana pagination: distinct records on page two');
