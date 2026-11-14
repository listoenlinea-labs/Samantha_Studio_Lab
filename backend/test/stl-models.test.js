'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {sniff,validateFile,MAX_ADVANCED}=require('../src/services/clinical-file-validation');
const stl=require('../../docs/assets/js/clinical-media/stl-viewer');

function binarySTL(){
 const b=Buffer.alloc(134);b.write('solid binary STL sample',0,'ascii');
 b.writeUInt32LE(1,80);
 const pts=[[0,0,0],[1,0,0],[0,1,0]];
 pts.forEach((v,i)=>v.forEach((n,j)=>b.writeFloatLE(n,96+i*12+j*4)));
 return b;
}
const asciiSTL=Buffer.from(
 'solid model\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid model\n'
);
test('STL binario puede empezar por solid sin confundirse con STL ASCII',()=>{
 const b=binarySTL(),mesh=stl.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
 assert.equal(mesh.triangles,1);
 assert.equal(mesh.format,'binario');
 assert.equal(mesh.positions.length,9);
 assert.equal(sniff(b),'model/stl');
 assert.equal(validateFile({buffer:b,filename:'arcada.stl',category:'RADIOGRAFIA'}).mime,'model/stl');
});
test('STL ASCII válido se detecta y visualiza localmente',()=>{
 const b=asciiSTL,mesh=stl.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
 assert.equal(mesh.triangles,1);
 assert.equal(mesh.format,'ASCII');
 assert.equal(sniff(b),'model/stl');
 assert.equal(validateFile({buffer:b,filename:'modelo.stl',category:'RADIOGRAFIA'}).size,b.length);
});
test('No se admiten STL en la sección PDF ni con extensión falsa',()=>{
 const b=binarySTL();
 assert.throws(()=>validateFile({buffer:b,filename:'modelo.pdf',category:'PDF'}),{status:400});
 assert.throws(()=>validateFile({buffer:b,filename:'modelo.exe',category:'RADIOGRAFIA'}),{status:400});
});
test('STL corruptos o con puntos no finitos se rechazan',()=>{
 const b=binarySTL();b.writeFloatLE(Infinity,96);
 assert.throws(()=>stl.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)),/no válidas/);
 const fake=Buffer.from('solid not really STL');
 assert.equal(sniff(fake),null);
 assert.throws(()=>stl.parse(fake.buffer.slice(fake.byteOffset,fake.byteOffset+fake.byteLength)));
});
test('No guardar STL mayores al límite de MySQL',()=>{
 const count=Math.ceil((MAX_ADVANCED-84)/50)+1;
 const b=Buffer.alloc(84+count*50);b.writeUInt32LE(count,80);
 assert.equal(sniff(b),'model/stl');
 assert.throws(()=>validateFile({buffer:b,filename:'large.stl',category:'RADIOGRAFIA'}),{status:413});
});
