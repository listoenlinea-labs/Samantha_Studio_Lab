'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {sniff,validateFile}=require('../src/services/clinical-file-validation');
const file=(data,name,category='RADIOGRAFIA')=>validateFile({
 buffer:Buffer.isBuffer(data)?data:Buffer.from(data),filename:name,category
});
test('PDF sigue en categoría documental y no permite HTML disfrazado',()=>{
 assert.equal(file(Buffer.from('%PDF-1.7\n'), 'consentimiento.pdf','PDF').mime,'application/pdf');
 assert.throws(()=>file('<html>Datos</html>','consentimiento.pdf','PDF'),{status:400});
});
test('GIF, MP4, WebM y audio presentan MIME correcto',()=>{
 assert.equal(file(Buffer.from('GIF89a\x01\x00\x01\x00'),'evolucion.gif').mime,'image/gif');
 const mp4=Buffer.alloc(28);mp4.write('ftyp',4);mp4.write('isom',8);
 assert.equal(file(mp4,'video.mp4').mime,'video/mp4');
 const webm=Buffer.concat([Buffer.from([0x1a,0x45,0xdf,0xa3,0x9f,0x42,0x86,0x81]),Buffer.from('webm-video-data')]);
 assert.equal(file(webm,'video.webm').mime,'video/webm');
 assert.equal(file(Buffer.from('RIFFabcdWAVEdata'),'nota.wav').mime,'audio/wav');
 assert.equal(file(Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00music-data'),'nota.mp3').mime,'audio/mpeg');
});
test('OBJ conserva compatibilidad cuando las caras están después de miles de vértices',()=>{
 const obj=Buffer.from('# dental\n'+Array.from({length:3000},(_,i)=>'v '+i+' 0 0\n').join('')+'f 1 2 3\n');
 assert.equal(sniff(obj),'model/obj');
 assert.equal(file(obj,'arcada.obj').mime,'model/obj');
});
test('PLY ASCII y binario little-endian se identifican por cabecera',()=>{
 const header='ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n';
 const ascii=Buffer.from(header+'0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n');
 const binary=Buffer.from(header.replace('ascii','binary_little_endian')+'binary-data');
 assert.equal(file(ascii,'arcada.ply').mime,'model/ply');
 assert.equal(file(binary,'arcada.ply').mime,'model/ply');
});
test('no aceptar extensiones incoherentes ni archivos de gran tamaño',()=>{
 const mp4=Buffer.alloc(28);mp4.write('ftyp',4);mp4.write('isom',8);
 assert.throws(()=>file(mp4,'archivo.html'),{status:400});
 const big=Buffer.alloc(14*1024*1024+1);big.write('ftyp',4);big.write('isom',8);
 assert.throws(()=>file(big,'video.mp4'),{status:413});
});
