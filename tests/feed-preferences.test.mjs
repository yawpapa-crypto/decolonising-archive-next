import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source=fs.readFileSync("lib/home/for-you.ts","utf8");
const fragment=source.slice(source.indexOf("export function buildInterests"),source.indexOf("interface MemberSignals"));
const compiled=ts.transpileModule(fragment,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{},tokens:s=>(s||"").toLowerCase().split(/\s+/).filter(Boolean)};
vm.runInNewContext(compiled,context);
test("chosen preferences keep their profile origin even when collection signals outweigh them",()=>{
 const result=context.exports.buildInterests(["textiles"],[{title:"textiles",weight:20,origin:"collection"}]);
 assert.equal(result[0].term,"textiles"); assert.equal(result[0].origin,"profile"); assert.equal(result[0].weight,25);
});
