'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../../docs/assets/js/patient-request-errors.js'),'utf8');
const window={};
vm.runInNewContext(src,{window});
const errors=window.SamanthaRequestErrors;
test('el error 503 conserva una referencia sin imprimir datos SQL',()=>{
 const response={status:503,headers:{get:()=> 'ABCDEF123456'}};
 const error=errors.errorFrom(response,{codigo:'DATABASE_SCHEMA',mensaje:'La base de datos requiere revisión.'});
 assert.match(error.message,/ABCDEF123456/);
 assert.equal(error.status,503);
 assert.equal(error.code,'DATABASE_SCHEMA');
});
test('descarga PDF auténtica se acepta',async()=>{
 const response=new Response(new Blob(['%PDF-1.7'],{type:'application/pdf'}),{
  status:200,headers:{'Content-Type':'application/pdf'}
 });
 const blob=await errors.expectBlob(response,['application/pdf']);
 assert.equal(blob.size,8);
});
test('HTML 200 de proxy no se acepta como PDF',async()=>{
 const response=new Response('<!doctype html><title>Error 503</title>',{
  status:200,headers:{'Content-Type':'text/html'}
 });
 await assert.rejects(errors.expectBlob(response,['application/pdf']),/formato inesperado/);
});
test('respuesta vacía no se acepta como documento',async()=>{
 const response=new Response('',{status:200,headers:{'Content-Type':'application/pdf'}});
 await assert.rejects(errors.expectBlob(response,['application/pdf']),/vacío/);
});
