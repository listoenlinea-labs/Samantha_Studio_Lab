'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const volume=require('../../docs/assets/js/clinical-media/dicom-volume');

function syntheticSlices(count=12){
 return Array.from({length:count},(_,z)=>({
  frames:1,cols:8,rows:8,
  metadata:{
   seriesUID:'synthetic-series-01',frameOfReferenceUID:'synthetic-frame-01',
   position:[0,0,z],orientation:[1,0,0,0,1,0],pixelSpacing:[.25,.25],modality:'CT'
  },
  pixels(){return {values:Float32Array.from({length:64},(_,i)=>20+i+z*3)}}
 }));
}
test('el ensamblador CBCT responde después del último corte y notifica fin real',async()=>{
 const labels=[];
 const result=await volume.assembleResponsive(syntheticSlices(12),(n,total,label)=>labels.push({n,total,label}));
 assert.equal(result.nz,12);
 assert.equal(result.nx,8);
 assert.equal(result.ny,8);
 assert.equal(result.data.length,8*8*12);
 assert.ok(labels.some(p=>p.label==='Construyendo volumen'&&p.n===12&&p.total===12));
 assert.ok(labels.some(p=>p.label==='Calculando contraste'));
 assert.ok(labels.some(p=>p.label==='Normalizando intensidades'));
 assert.equal(labels.at(-1).label,'Volumen listo para visualizar');
 assert.equal(result.isMedicalCertified,false);
});
test('no genera volumen de una radiografía 2D individual',async()=>{
 await assert.rejects(volume.assembleResponsive(syntheticSlices(1)),/al menos 12 cortes/);
});
