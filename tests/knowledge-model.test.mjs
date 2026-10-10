import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(file){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,require,Map,Set,encodeURIComponent});return module.exports;}
const {graphFromRecords,connectedRecords}=load('lib/knowledge/model.ts');const {cleanEdition}=load('lib/knowledge/edition.ts');
const record=(id,overrides={})=>({id,title:id,sourceName:'',sourceUrl:'',region:[],period:[],knowledgeAreas:[],tags:[],published:true,...overrides});
test('shared maker/period produce explicit reasons; missing values never create similarities',()=>{const graph=graphFromRecords([record('a',{creator:'Ama',period:['1960s']}),record('b',{creator:'Ama',period:['1960s']}),record('c')]);const links=connectedRecords(graph,'a');assert.equal(links.length,1);assert.ok(links[0].reasons.includes('Shared person: Ama'));assert.ok(links[0].reasons.includes('Shared period: 1960s'));assert.equal(connectedRecords(graph,'c').length,0);});
test('draft records and private curator labels cannot leak into a public graph',()=>{const graph=graphFromRecords([record('public'),record('draft',{published:false})],[{id:'list',title:'Public title',userId:'hidden',recordIds:['draft','public']}]);assert.ok(!graph.nodes.some(n=>n.id==='record:draft'||n.id==='user:hidden'));assert.ok(graph.edges.every(e=>graph.nodes.some(n=>n.id===e.to)&&graph.nodes.some(n=>n.id===e.from)));});
test('reviewed relationships retain evidence and work in both directions',()=>{const graph=graphFromRecords([record('a'),record('b')],[],[{from:'record:a',to:'record:b',relation:'influenced_by',basis:'curatorial',evidence:'https://museum.example/object'}]);assert.equal(connectedRecords(graph,'a')[0].id,'b');assert.equal(connectedRecords(graph,'b')[0].id,'a');assert.equal(connectedRecords(graph,'a')[0].evidence[0],'https://museum.example/object');});
test('collection writing drops annotations and connections to non-member records',()=>{const clean=cleanEdition({introduction:' hello ',sections:[{title:'Lesson',recordIds:['a','private','a']}],annotations:{a:'Note',private:'Secret'},relationships:[{from:'a',to:'private',note:'Bad'},{from:'a',to:'b',note:'Good'}]},['a','b']);assert.equal(clean.introduction,'hello');assert.deepEqual([...clean.sections[0].recordIds],['a']);assert.equal(clean.annotations.private,undefined);assert.equal(clean.relationships.length,1);});

const {isPublicAddress}=load('lib/knowledge/url-health.ts');
test('URL checker refuses private, loopback, multicast and IPv6 internal addresses',()=>{for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','224.1.1.1'])assert.equal(isPublicAddress(ip),false,ip);assert.equal(isPublicAddress('8.8.8.8'),true);});
