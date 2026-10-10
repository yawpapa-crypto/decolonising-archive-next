import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync('lib/onboarding/account-state.ts','utf8');
const ctx = { exports: {} };
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx);
const classify = ctx.exports.accountState;
test('legacy missing all new fields remains a returning account',()=>{
 assert.equal(classify({user_metadata:{}},{step:0,completedAt:null}),'returning-legacy');
 assert.equal(classify({},{step:0,completedAt:null}),'returning-legacy');
});
test('explicit signup provenance distinguishes new and resumable accounts',()=>{
 assert.equal(classify({user_metadata:{ared_signup_version:1}},{step:0,completedAt:null}),'new');
 assert.equal(classify({user_metadata:{ared_signup_version:1}},{step:2,completedAt:null}),'partial');
 assert.equal(classify({},{step:4,completedAt:'2026-10-04'}),'returning-complete');
});
test('service worker never stores navigation HTML and purges older versions',async()=>{
 const events={}; const stored=[]; const deleted=[];
 const worker={ self:{addEventListener:(name,fn)=>events[name]=fn,clients:{claim:async()=>{}}},location:{origin:'https://ared.design'},URL,
 caches:{keys:async()=>['ared-v1-pages','ared-v2-assets'],delete:async key=>deleted.push(key),open:async()=>({put:async(...a)=>stored.push(a)}),match:async()=>null},fetch:async()=>({ok:true,clone:()=>({})}) };
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),worker);
 let activation;events.activate({waitUntil:p=>activation=p});await activation;
 assert.deepEqual(deleted,['ared-v1-pages']);
 for(const path of ['/home-next/profile','/home-next/library','/home-next/for-you','/']) {
   let response;events.fetch({request:{method:'GET',mode:'navigate',url:'https://ared.design'+path},respondWith:p=>response=p});await response;
 }
 assert.equal(stored.length,0);
});

function actions(file, overrides = {}) {
 const env = { NEXT_PUBLIC_SUPABASE_URL:'https://auth.example', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-public-key' };
 const context = {exports:{},process:{env},FormData,require(name) {
   if(overrides[name]) return overrides[name];
   if(name==='next/navigation') return {redirect:path=>{throw {redirect:path};}};
   if(name==='next/cache') return {revalidatePath(){}};
   if(name==='@/src/lib/security/validate') return {safeNextPath:(v,f='/home-next/for-you')=>v?.startsWith('/')&&!v.startsWith('//')?v:f};
   if(name==='@/src/lib/auth-hooks') return {updateLastLogin:async()=>{}};
   if(name==='@/lib/newsletter-consent') return {};
   throw Error('Unexpected dependency '+name);
 }};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
 return context.exports;
}
test('incorrect credentials retain exact contextual destination',async()=>{
 const auth=actions('app/(app)/signin/actions.ts',{'@/src/lib/supabase/server':{createClient:async()=>({auth:{signInWithPassword:async()=>({data:{user:null},error:{message:'Invalid login credentials'}})}})}});
 const form=new FormData();form.set('email','member@example.test');form.set('password','test-input');form.set('next','/home-next/explore?record=ARED-GH-00058');
 await assert.rejects(auth.signInWithPassword(form),e=>{
   const result=new URL(e.redirect,'https://ared.design');
   assert.equal(result.searchParams.get('next'),'/home-next/explore?record=ARED-GH-00058');
   assert.match(result.searchParams.get('error'),/email or password is incorrect/);
   return true;
 });
});
test('legacy password sign-in restores destination without profile or onboarding writes',async()=>{
 let logins=0;
 const auth=actions('app/(app)/signin/actions.ts',{'@/src/lib/supabase/server':{createClient:async()=>({auth:{signInWithPassword:async()=>{logins++;return {data:{user:{id:'legacy-id',user_metadata:{}}},error:null};}}})}});
 const form=new FormData();form.set('email','member@example.test');form.set('password','test-input');form.set('next','/home-next/explore?record=ARED-GH-00058');
 await assert.rejects(auth.signInWithPassword(form),e=>e.redirect==='/home-next/explore?record=ARED-GH-00058');assert.equal(logins,1);
});
