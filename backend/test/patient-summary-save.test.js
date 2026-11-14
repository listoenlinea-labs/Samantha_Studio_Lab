'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../src/routes/pacientes-clinicos.routes.js'),'utf8');

function createHandler(connection){
 const registered=new Map();
 const router={};
 for(const method of ['get','post','put','patch','delete']){
  router[method]=(url,fn)=>{registered.set(method+' '+url,fn);return router};
 }
 const pool={getConnection:async()=>connection,query:async()=>[[]]};
 const exports={};
 const fakeRequire=name=>{
  if(name==='express')return {Router:()=>router};
  if(name==='crypto')return require('node:crypto');
  if(name==='../config/database')return pool;
  throw Error('Dependencia inesperada: '+name);
 };
 vm.runInNewContext(source,{module:{exports},require:fakeRequire,Buffer,setTimeout,Date,URL},{filename:'pacientes-clinicos.routes.js'});
 const handler=registered.get('patch /:id/resumen');
 assert.equal(typeof handler,'function');
 return handler;
}
function setup({existing=true,failAudit=false}={}){
 const calls=[],events=[];
 const connection={
  async beginTransaction(){events.push('begin')},
  async commit(){events.push('commit')},
  async rollback(){events.push('rollback')},
  release(){events.push('release')},
  async query(sql,args){
   calls.push({sql,args});
   if(sql.includes('FROM pacientes WHERE id_paciente'))return [[{id_paciente:42}]];
   if(sql.includes('FROM historias_clinicas')&&sql.includes('FOR UPDATE')){
    return [[{motivo_consulta:'Consulta previa',antecedentes_medicos:'Dato previo'}]];
   }
   if(sql.includes('FROM expedientes_paciente')&&sql.includes('FOR UPDATE'))return [existing?[{id_paciente:42}]:[]];
   if(sql.includes('INSERT INTO historias_clinicas'))return [{insertId:101}];
   if(sql.includes('INSERT INTO auditoria')&&failAudit)throw Object.assign(Error('Fallo en auditoría'),{code:'ER_DATA_TOO_LONG'});
   return [{affectedRows:1,insertId:1}];
  }
 };
 const response={statusCode:200,body:null,status(code){this.statusCode=code;return this},json(value){this.body=value;return this}};
 return {calls,events,connection,response,handler:createHandler(connection)};
}
test('guardar alergias conserva la historia clínica versionada y usa auditoría compatible',async()=>{
 const t=setup();let error=null;
 await t.handler({params:{id:'42'},body:{alergias:'Dato sintético'}},t.response,e=>{error=e});
 assert.equal(error,null);
 assert.equal(t.response.statusCode,200);
 assert.equal(t.response.body.ok,true);
 assert.deepEqual(t.events,['begin','commit','release']);
 assert.ok(t.calls.some(c=>c.sql.includes('INSERT INTO historias_clinicas')));
 const audit=t.calls.find(c=>c.sql.includes('INSERT INTO auditoria'));
 assert.match(audit.sql,/ACTUALIZAR'/);
 assert.equal(JSON.parse(audit.args[1]).apartado,'RESUMEN_CLINICO');
});
test('nota general existente se guarda en el expediente correcto',async()=>{
 const t=setup();let error=null;
 await t.handler({params:{id:'42'},body:{notaGeneral:'Dato de prueba'}},t.response,e=>{error=e});
 assert.equal(error,null);assert.equal(t.response.body.ok,true);
 assert.ok(t.calls.some(c=>c.sql.includes('UPDATE expedientes_paciente')&&c.args[1]===42));
 assert.equal(t.calls.some(c=>c.sql.includes('INSERT INTO historias_clinicas')),false);
});
test('nota general sin expediente crea el registro privado del mismo paciente',async()=>{
 const t=setup({existing:false});let error=null;
 await t.handler({params:{id:'42'},body:{notaGeneral:'Dato de prueba'}},t.response,e=>{error=e});
 assert.equal(error,null);
 const insert=t.calls.find(c=>c.sql.includes('INSERT INTO expedientes_paciente'));
 assert.ok(insert);
 assert.equal(insert.args[0],42);
 assert.equal(t.events.includes('commit'),true);
});
test('fallo SQL revierte y no confirma un guardado parcialmente realizado',async()=>{
 const t=setup({failAudit:true});let nextError=null;
 await t.handler({params:{id:'42'},body:{alergias:'Dato sintético'}},t.response,e=>{nextError=e});
 assert.equal(nextError.code,'ER_DATA_TOO_LONG');
 assert.deepEqual(t.events,['begin','rollback','release']);
 assert.equal(t.response.body,null);
});
