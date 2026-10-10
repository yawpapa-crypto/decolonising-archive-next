import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('lib/home/cached-image.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const context={exports:{},URL};vm.runInNewContext(code,context);
const cached=context.exports.cachedImageSrc;
test('archive images use the server cache and preserve the upstream URL',()=>{
 const source='https://www.artic.edu/iiif/2/example/full/480,/0/default.jpg';
 const url=new URL(cached(source),'http://localhost');
 assert.equal(url.pathname,'/api/archive-image');assert.equal(url.searchParams.get('url'),source);
});
test('local, Unsplash, and unknown URLs bypass the archive image cache',()=>{
 for(const src of ['/images/fallback/weaver.jpg','https://images.unsplash.com/example?ixid=abc','https://unknown.example/image.jpg','http://www.artic.edu/image','https://user:secret@www.artic.edu/iiif/image'])assert.equal(cached(src),src);
});
