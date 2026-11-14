/* CBCT geometry/volume assembly, private browser-only. No inferred 3D from a single image.
   Research/consultation only; not certified for clinical planning. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.YerenaVolume=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_SLICES=400,MIN_SLICES=12,MAX_VOXELS=160*160*224,MAX_RAW=256*1024*1024;
 const good=a=>Array.isArray(a)&&a.length>0&&a.every(Number.isFinite);
 const sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 function geometry(slice){
  const m=slice.metadata||{};
  if(!m.seriesUID||!m.frameOfReferenceUID||!good(m.position)||m.position.length!==3||
     !good(m.orientation)||m.orientation.length!==6||!good(m.pixelSpacing)||m.pixelSpacing.length!==2||
     m.pixelSpacing.some(x=>x<=0)||slice.frames!==1)
   throw Error('Esta imagen no tiene orientación, posición, espaciado y UID de serie suficientes para reconstrucción CBCT. Se mantiene como 2D.');
  const row=m.orientation.slice(0,3),col=m.orientation.slice(3,6),normal=cross(row,col);
  if(Math.abs(dot(row,row)-1)>.02||Math.abs(dot(col,col)-1)>.02||
     Math.abs(dot(row,col))>.02||Math.abs(dot(normal,normal)-1)>.02)
   throw Error('La orientación de los cortes DICOM es inválida o no es ortogonal.');
  return {slice,row,col,normal,z:dot(m.position,normal)};
 }
 function validateSeries(slices){
  if(slices.length<MIN_SLICES)throw Error('Se requieren al menos '+MIN_SLICES+' cortes DICOM de una misma serie con geometría espacial; una radiografía 2D no genera volumen.');
  if(slices.length>MAX_SLICES)throw Error('La serie supera el límite de '+MAX_SLICES+' cortes del visor web.');
  const ordered=slices.map(geometry),first=ordered[0],base=first.slice;
  for(const f of ordered){
   const other=f.slice;
   if(other.metadata.seriesUID!==base.metadata.seriesUID||other.metadata.frameOfReferenceUID!==base.metadata.frameOfReferenceUID||
      other.cols!==base.cols||other.rows!==base.rows||
      other.metadata.pixelSpacing.some((x,i)=>Math.abs(x-base.metadata.pixelSpacing[i])>.002)||
      f.normal.some((x,i)=>Math.abs(x-first.normal[i])>.01)||
      f.row.some((x,i)=>Math.abs(x-first.row[i])>.01)||
      f.col.some((x,i)=>Math.abs(x-first.col[i])>.01))
    throw Error('Los archivos no pertenecen a una misma serie CBCT uniforme. Selecciona una sola serie con el mismo SeriesInstanceUID y espaciado.');
  }
  ordered.sort((a,b)=>a.z-b.z);
  const dz=ordered.slice(1).map((f,i)=>f.z-ordered[i].z);
  if(dz.some(x=>x<1e-4))throw Error('Hay cortes duplicados o posiciones espaciales coincidentes.');
  const median=[...dz].sort((a,b)=>a-b)[Math.floor(dz.length/2)];
  if(dz.some(x=>Math.abs(x-median)>Math.max(.08,median*.18)))
   throw Error('La serie tiene cortes faltantes o espaciado Z irregular; no se interpolarán datos para reconstruir una imagen 3D.');
  return {ordered,spacing:[base.metadata.pixelSpacing[1],base.metadata.pixelSpacing[0],median],
   seriesUID:base.metadata.seriesUID,sourceSize:[base.cols,base.rows,ordered.length],
   orientation:base.metadata.orientation,modality:base.metadata.modality};
 }
 async function fromFiles(files,onProgress){
  if(!Array.isArray(files)||files.length<MIN_SLICES||files.length>MAX_SLICES)throw Error('Selecciona entre 12 y 400 cortes DICOM de la misma serie.');
  let total=0;const slices=[];
  for(let i=0;i<files.length;i++){
   const f=files[i],buffer=f.buffer;
   if(!(buffer instanceof ArrayBuffer))throw Error('Se esperaba un archivo DICOM binario válido.');
   total+=buffer.byteLength;
   if(total>MAX_RAW)throw Error('El estudio supera 256 MB. Utiliza una estación PACS o una serie de menor resolución.');
   const parsed=(typeof window!=='undefined'?window.YerenaDicomViewer:require('./dicom-viewer')).parse(buffer);
   if(parsed.prepare)await parsed.prepare();
   slices.push(parsed);
   if(onProgress)onProgress(i+1,files.length,'Leyendo geometría de los cortes');
   await Promise.resolve();
  }
  return assemble(slices,onProgress);
 }
 function assemble(slices,onProgress){
  const s=validateSeries(slices),[w,h,d]=s.sourceSize;
  if(w*h*d>150000000)throw Error('Volumen demasiado grande para procesamiento seguro en el navegador.');
  const scale=Math.min(1,160/w,160/h,224/d);
  // Axes downsample uniformly to preserve anatomy proportions.
  const nx=Math.max(2,Math.floor(w*scale)),ny=Math.max(2,Math.floor(h*scale)),nz=Math.max(2,Math.floor(d*scale));
  if(nx*ny*nz>MAX_VOXELS)throw Error('Memoria de volumen excedida.');
  const raw=new Float32Array(nx*ny*nz),sample=[];
  for(let z=0;z<nz;z++){
   const f=s.ordered[Math.min(d-1,Math.floor((z+.5)*d/nz))].slice.pixels(0).values;
   for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const ox=Math.min(w-1,Math.floor((x+.5)*w/nx)),oy=Math.min(h-1,Math.floor((y+.5)*h/ny));
    const value=f[oy*w+ox];raw[z*nx*ny+y*nx+x]=value;
   }
   if(onProgress)onProgress(z+1,nz,'Construyendo volumen');
  }
  const stride=Math.max(1,Math.floor(raw.length/150000));
  for(let i=0;i<raw.length;i+=stride)if(Number.isFinite(raw[i]))sample.push(raw[i]);
  if(!sample.length)throw Error('DICOM sin intensidades válidas.');
  sample.sort((a,b)=>a-b);
  const p1=sample[Math.floor(sample.length*.01)],p99=sample[Math.floor(sample.length*.99)];
  if(!(p99>p1))throw Error('La serie no contiene contraste suficiente para reconstrucción volumétrica.');
  const densities=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)densities[i]=Math.max(0,Math.min(255,Math.round((raw[i]-p1)*255/(p99-p1))));
  return {nx,ny,nz,data:densities,spacing:[s.spacing[0]*w/nx,s.spacing[1]*h/ny,s.spacing[2]*d/nz],
   sourceSize:s.sourceSize,seriesUID:s.seriesUID,modality:s.modality,percentiles:[p1,p99],
   units:'intensidad relativa; no HU verificados',isMedicalCertified:false};
 }
 function sample(volume,x,y,z){
  const nx=volume.nx,ny=volume.ny,nz=volume.nz;
  const i=Math.max(0,Math.min(nx-1,Math.round(x*(nx-1)))),
   j=Math.max(0,Math.min(ny-1,Math.round(y*(ny-1)))),
   k=Math.max(0,Math.min(nz-1,Math.round(z*(nz-1))));
  return volume.data[k*nx*ny+j*nx+i];
 }
 function sliceImage(v,axis,index,level=127,window=255){
  const width=axis==='sagittal'?v.ny:v.nx, height=axis==='axial'?v.ny:v.nz,values=new Uint8ClampedArray(width*height*4);
  const frac=Math.max(0,Math.min(1,index));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const coord=axis==='axial'?[x/(width-1),y/(height-1),frac]:
    axis==='sagittal'?[frac,x/(width-1),1-y/(height-1)]:
     [x/(width-1),frac,1-y/(height-1)];
   const n=sample(v,...coord),color=Math.max(0,Math.min(255,Math.round((n-(level-window/2))*255/Math.max(1,window))));
   const offset=(y*width+x)*4;values[offset]=values[offset+1]=values[offset+2]=color;values[offset+3]=255;
  }
  return {width,height,values};
 }
 // Unwrap a manually adjusted arch from an axial plane into a curved panoramic projection.
 // The output is approximate for research only; NOT a calibrated dental scan.
 function panoramic(v,points,thickness=1){
  if(!Array.isArray(points)||points.length<3||points.length>16||
     points.some(p=>!Array.isArray(p)||p.length!==2||p.some(q=>!Number.isFinite(q)||q<0||q>1)))
   throw Error('Marca al menos tres puntos válidos sobre la arcada dental.');
  const chain=[];let length=0;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=(b[0]-a[0])*v.nx,dy=(b[1]-a[1])*v.ny,dist=Math.hypot(dx,dy);
   if(dist<1)continue;
   const n=Math.max(2,Math.ceil(dist*1.5));
   for(let j=0;j<n;j++){const t=j/n;chain.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);length++}
  }
  chain.push(points[points.length-1]);
  if(chain.length<4)throw Error('La curva dental es demasiado corta.');
  const width=Math.min(800,chain.length),height=v.nz;
  const image=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const idx=Math.floor(x*(chain.length-1)/Math.max(1,width-1)),p=chain[idx];
   const prev=chain[Math.max(0,idx-1)],next=chain[Math.min(chain.length-1,idx+1)];
   const dx=(next[0]-prev[0])*v.nx,dy=(next[1]-prev[1])*v.ny,norm=Math.max(.001,Math.hypot(dx,dy));
   let value=0;
   for(let a=-thickness;a<=thickness;a++){
    const u=p[0]-(dy/norm)*a/v.nx, w=p[1]+(dx/norm)*a/v.ny;
    value=Math.max(value,sample(v,u,w,1-y/Math.max(1,height-1)));
   }
   const offset=(y*width+x)*4;
   image[offset]=image[offset+1]=image[offset+2]=value;image[offset+3]=255;
  }
  return {width,height,values:image};
 }
 return {MIN_SLICES,MAX_SLICES,validateSeries,assemble,fromFiles,sample,sliceImage,panoramic};
});
