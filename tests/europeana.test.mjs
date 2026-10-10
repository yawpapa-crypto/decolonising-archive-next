import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const load = async (path) => import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const {normaliseEuropeana,searchEuropeana}=await load('lib/home/europeana-normalize.ts');
const {takeFresh}=await load('lib/home/discover-shared.ts');
const raw={id:'/123/photo_1',title:['Accra market'],dcCreator:['Actual photographer'],year:['1959'],dcDescription:['Actual description'],edmPreview:['https://api.europeana.eu/thumbnail/v2/url.json?uri=https%3A%2F%2Fmuseum.example%2Fone.jpg&type=IMAGE'],edmIsShownBy:['https://museum.example/one.jpg'],edmIsShownAt:['https://museum.example/record/one'],guid:'https://www.europeana.eu/item/123/photo_1?utm_campaign=private-key',dataProvider:['Actual museum'],provider:['Actual aggregator'],country:['Germany'],rights:['http://rightsstatements.org/vocab/InC/1.0/'],dcSubjectLangAware:{en:['Ghana','Photography']}};
test('metadata maps without treating aggregator country as object location or copyright as open',()=>{
 const i=normaliseEuropeana(raw);assert.equal(i.source,'Europeana');assert.equal(i.authors,'Actual photographer');assert.equal(i.year,'1959');assert.deepEqual(i.institution,['Actual museum']);assert.deepEqual(i.country,['Germany']);assert.equal(i.oa,false);assert.deepEqual(i.rights,raw.rights);assert.equal(i.imageRole,'preview');assert.equal(i.originalImage,raw.edmIsShownBy[0]);assert.equal(i.href.includes('private-key'),false);assert.deepEqual(i.subjects,['Ghana','Photography']);
});
test('missing metadata stays missing; only explicitly recognised licences are open',()=>{
 const i=normaliseEuropeana({id:raw.id,title:raw.title,edmPreview:raw.edmPreview});assert.equal(i.authors,undefined);assert.equal(i.rights,undefined);assert.equal(i.licence,undefined);assert.equal(i.oa,undefined);assert.equal(normaliseEuropeana({...raw,year:undefined,edmTimespanLabelLangAware:{zxx:["1959"]}}).year,"1959");
 assert.equal(normaliseEuropeana({...raw,rights:['https://creativecommons.org/licenses/by/4.0/']}).oa,true);
 assert.equal(normaliseEuropeana({...raw,rights:['https://creativecommons.org/licenses/by-nc/4.0/']}).oa,false);
});
test('missing/invalid visuals, malformed records, opt-out and known placeholders are excluded',()=>{
 for(const r of [null,[],{}, {...raw,edmPreview:[]},{...raw,edmPreview:['javascript:alert(1)']},{...raw,edmPreview:['https://museum.example/no-image.jpg']},{...raw,previewNoDistribute:true}]) assert.equal(normaliseEuropeana(r),null);
});
test('literal query, pagination and bounded rows; key uses server header, no theme/geography rewrite',async()=>{
 let calls=0;const fetcher=async(url,options)=>{calls++;assert.equal(url.searchParams.get('query'),'Palestinian architecture');assert.equal(url.searchParams.get('theme'),null);assert.equal(url.searchParams.get('start'),'6');assert.equal(url.searchParams.get('rows'),'5');assert.equal(url.searchParams.get('media'),'true');assert.equal(url.searchParams.has('wskey'),false);assert.equal(options.headers['X-Api-Key'],'test-key');return {ok:true,json:async()=>({success:true,items:[raw]})};};
 assert.equal((await searchEuropeana('Palestinian architecture',2,5,'test-key',fetcher)).length,1);assert.equal(calls,1);
});
test('zero results, rate limits, failures, timeout and malformed JSON fail independently',async()=>{
 const failures=[async()=>({ok:true,json:async()=>({success:true,items:[]})}),async()=>({ok:false,status:429}),async()=>{throw new DOMException('Timed out','AbortError')},async()=>({ok:true,json:async()=>{throw new Error('Invalid JSON')}}),async()=>({ok:true,json:async()=>({items:{wrong:'shape'}})})];
 for(const fetcher of failures){const settled=await Promise.allSettled([searchEuropeana('Ghana',1,5,'test',fetcher),Promise.resolve([{id:'existing-provider'}])]);assert.deepEqual(settled[0].value,[]);assert.equal(settled[1].value[0].id,'existing-provider');}
});
test('archival dedupe retains distinct same-title objects but merges canonical records and media',()=>{
 const one=normaliseEuropeana(raw),two=normaliseEuropeana({...raw,id:'/123/photo_2',edmPreview:['https://museum.example/two.jpg'],edmIsShownBy:['https://museum.example/two.jpg'],edmIsShownAt:['https://museum.example/record/two'],guid:'https://www.europeana.eu/item/123/photo_2'});let seen=new Set();assert.ok(takeFresh(one,seen));assert.ok(takeFresh(two,seen));assert.equal(takeFresh({...one,id:'different-id'},seen),false);
 seen=new Set();assert.ok(takeFresh(one,seen));assert.equal(takeFresh({id:'loc-one',kind:'image',title:'Alternate title',image:'https://museum.example/one.jpg',href:'https://museum.example/other'},seen),false);
 seen=new Set();assert.ok(takeFresh({id:'commons-thumbnail',kind:'image',title:'File',image:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/File.jpg/400px-File.jpg'},seen));assert.equal(takeFresh({id:'europeana-image',kind:'image',title:'Different metadata',image:'https://upload.wikimedia.org/wikipedia/commons/a/ab/File.jpg'},seen),false);
 seen=new Set();assert.ok(takeFresh({id:'book-one',title:'Same book',kind:'book'},seen));assert.equal(takeFresh({id:'book-two',title:'Same book',kind:'book'},seen),false);
});

test('numbered Commons design exports share a series identity without merging unrelated objects',()=>{
 const seen=new Set();
 const item={id:'wc-1',source:'Wikimedia Commons',kind:'image',title:'Decolonising knowledge - design 03'};
 assert.ok(takeFresh(item,seen));
 assert.equal(takeFresh({...item,id:'wc-2',title:'Decolonising knowledge - design 24'},seen),false);
 assert.ok(takeFresh({...item,id:'wc-3',title:'Gold weight'},seen));
});
