import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync('src/lib/security/validate.ts','utf8');
const fragment=source.slice(source.indexOf('export function safeNextPath'),source.indexOf('export function normalizeSearchQuery'));
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fragment,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
test('redirects reject browser-normalized external paths and control characters',()=>{
 for(const input of ['//evil.example','/\\evil.example','https://evil.example','/\nevil.example']) assert.equal(context.exports.safeNextPath(input),'/workspace');
 assert.equal(context.exports.safeNextPath('/home-next/for-you?q=craft'),'/home-next/for-you?q=craft');
});
