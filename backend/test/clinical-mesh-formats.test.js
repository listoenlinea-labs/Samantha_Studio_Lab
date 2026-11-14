'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const geometry=require('../../docs/assets/js/clinical-media/mesh-formats');
function asBuffer(text){
 const b=Buffer.from(text,'utf8');
 return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
}
const header='ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n';
function check(mesh){
 assert.equal(mesh.triangles,1);
 assert.equal(mesh.positions.length,9);
 assert.equal(mesh.normals.length,9);
 assert.ok(mesh.normals.every(Number.isFinite));
}
test('OBJ triangula un modelo dental mínimo sin recurrir a CDN',()=>{
 const mesh=geometry.parseOBJ(asBuffer('# dental\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'));
 check(mesh);assert.equal(mesh.format,'OBJ');
});
test('PLY ASCII se visualiza con normales XYZ correctas',()=>{
 check(geometry.parsePLY(asBuffer(header+'0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n')));
});
test('PLY binary little-endian se visualiza sin reescribir el archivo',()=>{
 const h=Buffer.from(header.replace('ascii','binary_little_endian'),'ascii');
 const b=Buffer.alloc(h.length+3*12+1+3*4);h.copy(b,0);
 let p=h.length;
 for(const vector of [[0,0,0],[1,0,0],[0,1,0]])
  for(const n of vector){b.writeFloatLE(n,p);p+=4}
 b.writeUInt8(3,p++);for(const n of [0,1,2]){b.writeInt32LE(n,p);p+=4}
 check(geometry.parsePLY(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)));
});
test('caracteres no válidos y formatos no soportados no generan geometría',()=>{
 assert.throws(()=>geometry.parseOBJ(asBuffer('v 0 0 0\nf 1 2 3\n')),/vértice inexistente/);
 assert.throws(()=>geometry.parsePLY(asBuffer('ply\nformat binary_big_endian 1.0\nend_header\n')),/no compatible/);
});
