'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const errorHandler=require('../src/middleware/error-handler');
function request(){
 return {method:'PATCH',path:'/api/pacientes/42/resumen',route:{path:'/:id/resumen'},requestId:'TEST123456'};
}
function response(){
 return {statusCode:200,body:null,headersSent:false,getHeader(name){return name==='X-Request-ID'?'TEST123456':null},
  status(code){this.statusCode=code;return this},json(data){this.body=data;return this}};
}
async function check(error,status,code){
 const res=response();let nextCalled=false;
 errorHandler(error,request(),res,()=>{nextCalled=true});
 assert.equal(nextCalled,false);
 assert.equal(res.statusCode,status);
 assert.equal(res.body.codigo,code);
 assert.equal(res.body.requestId,'TEST123456');
 assert.equal(JSON.stringify(res.body).includes('SELECT'),false);
 assert.equal(JSON.stringify(res.body).includes('datoClinicoSecreto'),false);
}
test('MySQL sin conexión responde 503 y referencia sin secretos',async()=>{
 await check(Object.assign(new Error('SELECT * FROM datos datoClinicoSecreto'),{code:'ECONNREFUSED'}),503,'DATABASE_CONNECTION');
});
test('columna desconocida responde con orientación de migración',async()=>{
 await check(Object.assign(new Error('SELECT * FROM pacientes datoClinicoSecreto'),{code:'ER_BAD_FIELD_ERROR'}),503,'DATABASE_SCHEMA');
});
test('exceso de tamaño de imagen devuelve 413',async()=>{
 await check(Object.assign(new Error('demasiado grande'),{code:'ER_NET_PACKET_TOO_LARGE'}),413,'DATABASE_PACKET_LIMIT');
});
test('fallo interno no expone datos médicos o SQL',async()=>{
 await check(new Error('datoClinicoSecreto SELECT * FROM pacientes'),500,'INTERNAL_ERROR');
});
test('deadlock deja claro que hay que comprobar el estado antes de repetir',async()=>{
 const res=response();errorHandler(Object.assign(new Error('deadlock'),{code:'ER_LOCK_DEADLOCK'}),request(),res,()=>{});
 assert.equal(res.statusCode,503);
 assert.match(res.body.mensaje,/Verifica si se guardó/);
});
