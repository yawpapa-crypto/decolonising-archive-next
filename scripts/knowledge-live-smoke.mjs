import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').flatMap(line=>{const m=line.match(/^([A-Z0-9_]+)=(.*)$/);return m?[[m[1],m[2].trim().replace(/^['"]|['"]$/g,'')]]:[]}));
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const base='http://localhost:3000',fixtures=[],checks=[];let passed=false;
async function member(){const email=`ared-knowledge-qa-${randomUUID()}@example.invalid`,password=randomUUID()+'Qa!9';const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(error,null);fixtures.push(data.user.id);const jar=new Map();const auth=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(v=>jar.set(v.name,v.value))}});assert.equal((await auth.auth.signInWithPassword({email,password})).error,null);return {id:data.user.id,db:createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{global:{headers:{Authorization:`Bearer ${(await auth.auth.getSession()).data.session.access_token}`}},auth:{persistSession:false}}),request:async(route,method='GET',body)=>{const r=await fetch(base+route,{method,headers:{Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),Origin:base,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json().catch(()=>null)};}};}
// Remove only this script's orphaned disposable fixtures, if an earlier run failed cleanup.
const previous=await admin.auth.admin.listUsers({page:1,perPage:1000});
for(const user of previous.data.users.filter(u=>/^ared-knowledge-qa-.*@example.invalid$/.test(u.email??'')))assert.equal((await admin.auth.admin.deleteUser(user.id)).error,null);
try{
 const a=await member(),b=await member();const catalogue=JSON.parse(fs.readFileSync('data/catalogue/catalogue-records.json','utf8'));const ids=catalogue.filter(r=>r.publicVisibility&&!r.communityAuthorityRequired).slice(0,2).map(r=>r.id);assert.equal(ids.length,2);
 const made=await a.request('/api/for-you/collections','POST',{title:'Disposable knowledge QA'});assert.equal(made.status,200);const id=made.data.list.id;
 for(const record of ids)assert.equal((await a.request('/api/for-you/save','POST',{id:record,title:'QA record',source:'QA',type:'record',listId:id})).status,200);
 const document={introduction:'A teaching introduction',rationale:'Why these two belong together',prompts:'What do you notice?',sections:[{title:'A visual conversation',recordIds:ids}],annotations:{[ids[0]]:'Curatorial annotation'},relationships:[{from:ids[0],to:ids[1],note:'A proposed teaching comparison'}]};
 const firstWrite=await a.request(`/api/knowledge/collections/${id}`,'PUT',{revision:0,document});assert.equal(firstWrite.status,200,JSON.stringify(firstWrite.data));checks.push('owner saves introduction, sections, annotation, prompts and relationships');
 assert.equal((await a.request(`/api/knowledge/collections/${id}`,'PUT',{revision:0,document})).status,409);checks.push('stale revision cannot overwrite collection writing');
 assert.equal((await b.request(`/api/knowledge/collections/${id}`,'PUT',{revision:1,document})).status,404);assert.equal((await b.request(`/api/knowledge/collections/${id}`)).data.edition,null);checks.push('another member cannot read or edit private collection writing');
 const publicBefore=await fetch(base+`/curated-collections/${id}`);assert.equal(publicBefore.status,404);
 assert.equal((await a.request(`/api/for-you/collections/${id}`,'PATCH',{is_public:true})).status,200);
 const publicPage=await fetch(base+`/curated-collections/${id}`);assert.equal(publicPage.status,200);assert.ok((await publicPage.text()).includes(document.introduction));checks.push('public teaching page renders writing only after publication');
 const branch=await b.request(`/api/knowledge/collections/${id}`,'POST');assert.equal(branch.status,201);const copied=await b.request(`/api/for-you/collections/${branch.data.id}`);assert.equal(copied.data.list.is_public,false);assert.equal(copied.data.items.length,2);assert.equal(copied.data.items[0].record_title,'QA record');assert.equal((await b.request(`/api/knowledge/collections/${branch.data.id}`)).data.edition.document.introduction,document.introduction);checks.push('atomic teaching copy preserves memberships/writing and starts private');
 const proposal=await a.request('/api/knowledge/proposals','POST',{kind:'relationship',title:'Disposable QA connection',detail:'Test evidence for a reviewed relationship',record_id:ids[0],related_record_id:ids[1],relationship:'related_to',evidence_url:'https://www.clevelandart.org/'});assert.equal(proposal.status,201);const proposalId=proposal.data.proposal.id;assert.equal(proposal.data.proposal.status,'pending');
 assert.equal((await b.db.from('knowledge_proposals').select('id').eq('id',proposalId)).data.length,0);
 assert.equal((await a.db.from('knowledge_proposals').update({status:'accepted'}).eq('id',proposalId).select('id')).data.length,0);
 assert.equal((await a.db.from('knowledge_proposal_revisions').select('id').eq('proposal_id',proposalId)).data.length,1);checks.push('proposals start pending, retain revision history and cannot be self-approved or read by another member');
 assert.equal((await admin.from('knowledge_proposals').update({status:'accepted',reviewer_note:'Disposable test evidence accepted'}).eq('id',proposalId)).error,null);
 assert.equal((await admin.rpc('graph_public_relationships')).data.some(p=>p.record_id===ids[0]&&p.related_record_id===ids[1]),true);checks.push('accepted relationship enters public projection without private proposer identity');
 for(const format of ['ris','bibtex'])assert.equal((await fetch(base+`/api/knowledge/collections/${id}?export=${format}`)).status,200);
 for(const style of ['apa','chicago','mla']){const r=await fetch(base+`/api/records/${ids[0]}/citation?style=${style}`);assert.equal(r.status,200);assert.ok((await r.json()).formatted.includes('/records/'));}checks.push('public research-list exports and citation styles use stable record URLs');
 assert.equal((await b.request('/api/knowledge/health','POST',{})).status,403);checks.push('member cannot run privileged quality checks');
 passed=true;
}finally{for(const id of fixtures)assert.equal((await admin.auth.admin.deleteUser(id)).error,null);fs.mkdirSync('artifacts/knowledge',{recursive:true});fs.writeFileSync('artifacts/knowledge/live-smoke.json',JSON.stringify({at:new Date().toISOString(),passed,checks,fixturesRemoved:fixtures.length},null,2));console.log(JSON.stringify({passed,checks,fixturesRemoved:fixtures.length}));}
