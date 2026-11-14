/* Visor local 2D DICOM Part10 sin cargas a servidores externos.
   Alcance: MONOCHROME1/2, transfer syntax sin compresión, 8/16 bits y multiframe.
   NO validado como dispositivo diagnóstico; para estudios comprimidos/CBCT usar PACS. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.YerenaDicomViewer=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ERROR='No se puede previsualizar este DICOM. Descárgalo y ábrelo en un visor DICOM/PACS compatible.';
 const SYNTAXES={
 '1.2.840.10008.1.2':'Implícita Little Endian (sin compresión)',
 '1.2.840.10008.1.2.1':'Explícita Little Endian (sin compresión)',
 '1.2.840.10008.1.2.2':'Explícita Big Endian',
 '1.2.840.10008.1.2.1.99':'Deflated Explicit VR',
 '1.2.840.10008.1.2.5':'RLE sin pérdidas',
 '1.2.840.10008.1.2.4.50':'JPEG Baseline (8 bits)',
 '1.2.840.10008.1.2.4.51':'JPEG Extended (12 bits)',
 '1.2.840.10008.1.2.4.57':'JPEG Lossless',
 '1.2.840.10008.1.2.4.70':'JPEG Lossless (SV1)',
 '1.2.840.10008.1.2.4.80':'JPEG-LS Lossless',
 '1.2.840.10008.1.2.4.81':'JPEG-LS Near-Lossless',
 '1.2.840.10008.1.2.4.90':'JPEG 2000 Lossless',
 '1.2.840.10008.1.2.4.91':'JPEG 2000'
 };
 const SUPPORTED=new Set(['1.2.840.10008.1.2','1.2.840.10008.1.2.1','1.2.840.10008.1.2.5','1.2.840.10008.1.2.4.50','1.2.840.10008.1.2.4.57','1.2.840.10008.1.2.4.70']);
 function describeSyntax(uid){return {uid,label:SYNTAXES[uid]||'Sintaxis de transferencia no identificada',supported:SUPPORTED.has(uid)}}

 const asText=(bytes,start,length)=>new TextDecoder('ascii').decode(bytes.subarray(start,start+length)).trim().replace(/\0/g,'');
 const longVR=new Set(['OB','OD','OF','OL','OV','OW','SQ','UC','UN','UR','UT','SV','UV']);
 function element(view,bytes,position,explicit){
  if(position+8>bytes.length)throw Error('DICOM truncado.');
  const group=view.getUint16(position,true),part=view.getUint16(position+2,true);
  if(group===0xfffe)return {tag:'fffe'+part.toString(16).padStart(4,'0'),length:view.getUint32(position+4,true),start:position+8};
  if(!explicit)return {tag:group.toString(16).padStart(4,'0')+part.toString(16).padStart(4,'0'),length:view.getUint32(position+4,true),start:position+8};
  const vr=asText(bytes,position+4,2),long=longVR.has(vr);
  const start=position+(long?12:8);
  if(start>bytes.length)throw Error('Encabezado DICOM incompleto.');
  return {tag:group.toString(16).padStart(4,'0')+part.toString(16).padStart(4,'0'),
   length:long?view.getUint32(position+8,true):view.getUint16(position+6,true),start};
 }
// Lee exclusivamente las etiquetas no sensibles de la cabecera meta (grupo 0002).
 function inspect(buffer){
  const bytes=new Uint8Array(buffer);
  if(bytes.length<140||asText(bytes,128,4)!=='DICM')throw Error('Archivo DICOM Part 10 sin firma DICM válida.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let pos=132,syntax='1.2.840.10008.1.2.1';
  while(pos+8<=bytes.length&&view.getUint16(pos,true)===2){
   const e=element(view,bytes,pos,true);
   if(e.length===0xffffffff||e.start+e.length>bytes.length)throw Error('Cabecera DICOM incompleta.');
   if(e.tag==='00020010')syntax=asText(bytes,e.start,e.length);
   pos=e.start+e.length;
  }
  return describeSyntax(syntax);
 }
 function encapsulated(bytes,start){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),fragments=[];
  let pos=start,bot=false;
  while(pos+8<=bytes.length){
   const group=view.getUint16(pos,true),elem=view.getUint16(pos+2,true),length=view.getUint32(pos+4,true);
   pos+=8;
   if(group!==0xfffe)throw Error('Secuencia de píxeles DICOM encapsulados inválida.');
   if(elem===0xe0dd)break;
   if(elem!==0xe000||length===0xffffffff||pos+length>bytes.length)throw Error('Fragmento DICOM incompleto.');
   if(bot)fragments.push(bytes.subarray(pos,pos+length));
   bot=true;pos+=length;
  }
  if(!bot||!fragments.length)throw Error('DICOM sin fragmentos de imagen.');
  const total=fragments.reduce((n,f)=>n+f.length,0);
  if(total>20*1024*1024)throw Error('Fotograma comprimido supera los 20 MB.');
  const joined=new Uint8Array(total);let offset=0;
  for(const frag of fragments){joined.set(frag,offset);offset+=frag.length}
  return joined;
 }
 function packbits(segment,size){
  const output=new Uint8Array(size);let source=0,target=0;
  while(source<segment.length&&target<size){
   const n=(segment[source++]<<24)>>24;
   if(n>=0){const length=n+1;if(source+length>segment.length||target+length>size)throw Error('Datos RLE corruptos.');output.set(segment.subarray(source,source+length),target);source+=length;target+=length}
   else if(n>=-127){const count=1-n;if(source>=segment.length||target+count>size)throw Error('Datos RLE corruptos.');output.fill(segment[source++],target,target+count);target+=count}
  }
  if(target!==size)throw Error('La imagen RLE está incompleta.');
  return output;
 }
 function rleBytes(data,size,bits){
  if(data.length<64)throw Error('Encabezado RLE incompleto.');
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength),count=view.getUint32(0,true),required=bits/8;
  if(count!==required)throw Error('RLE con número de segmentos incompatible.');
  const segments=[];
  for(let i=0;i<count;i++){
   const start=view.getUint32(4+4*i,true),end=i+1<count?view.getUint32(8+4*i,true):data.length;
   if(start<64||end>data.length||end<=start)throw Error('Segmentos RLE inválidos.');
   segments.push(packbits(data.subarray(start,end),size));
  }
  const out=new Uint8Array(size*required);
  for(let i=0;i<size;i++){
   if(required===1)out[i]=segments[0][i];
   else {out[2*i]=segments[1][i];out[2*i+1]=segments[0][i]}
  }
  return out;
 }

 function skipUndefined(view,bytes,position,explicit){
  let steps=0;
  while(position+8<=bytes.length&&steps++<120000){
   const item=element(view,bytes,position,explicit);
   if(item.tag==='fffee0dd'||item.tag==='fffee00d')return item.start;
   if(item.length===0xffffffff){position=skipUndefined(view,bytes,item.start,explicit);continue}
   position=item.start+item.length;
   if(position>bytes.length)break;
  }
  throw Error('Secuencia DICOM incompleta.');
 }
 function parse(buffer){
  const bytes=new Uint8Array(buffer);
  if(bytes.length<256||asText(bytes,128,4)!=='DICM')throw Error('DICOM Part10 inválido: falta identificador DICM.');
  const view=new DataView(buffer),tags=new Map();let position=132,explicit=true,syntax='1.2.840.10008.1.2.1',dataset=false,steps=0,encapsulatedPixel=null;
  while(position+8<=bytes.length&&steps++<150000){
   const group=view.getUint16(position,true);
   if(!dataset&&group!==2){dataset=true;
    if(!SUPPORTED.has(syntax)){const codec=describeSyntax(syntax);throw Error('Formato '+codec.label+' (UID '+codec.uid+'). Este tipo de compresión no está instalado en el visor. Descarga el original y ábrelo con un PACS compatible.');}
    explicit=syntax!=='1.2.840.10008.1.2';
   }
   const item=element(view,bytes,position,explicit);
   if(item.length===0xffffffff){
    if(item.tag==='7fe00010'){
     if(!['1.2.840.10008.1.2.5','1.2.840.10008.1.2.4.50','1.2.840.10008.1.2.4.57','1.2.840.10008.1.2.4.70'].includes(syntax))throw Error('Píxeles encapsulados no admitidos para '+describeSyntax(syntax).label);
     encapsulatedPixel=item.start;tags.set(item.tag,item);break;
    }
    position=skipUndefined(view,bytes,item.start,explicit);continue;
   }
   if(item.start+item.length>bytes.length)throw Error('DICOM truncado.');
   if(item.tag==='00020010')syntax=asText(bytes,item.start,item.length);
   if(item.tag[0]==='0'||item.tag==='7fe00010')tags.set(item.tag,item);
   position=item.start+item.length;
   if(item.tag==='7fe00010')break;
  }
  function get(tag){return tags.get(tag)}
  function uint(tag,defaultValue){
   const x=get(tag);return x&&x.length>=2?view.getUint16(x.start,true):defaultValue;
  }
  function txt(tag,defaultValue=''){const x=get(tag);return x?asText(bytes,x.start,Math.min(120,x.length)):defaultValue}
  const rows=uint('00280010',0),cols=uint('00280011',0),bits=uint('00280100',0),
   stored=uint('00280101',bits),high=uint('00280102',stored-1),signed=uint('00280103',0);
  const spp=uint('00280002',1),photo=txt('00280004').toUpperCase(),pixel=get('7fe00010');
  const frames=Math.max(1,Number.parseInt(txt('00280008','1'),10)||1);
  if(!pixel||!rows||!cols||rows*cols>16000000||frames>300||!['MONOCHROME1','MONOCHROME2'].includes(photo)||spp!==1||![8,16].includes(bits)||stored<1||stored>bits||high>=bits||high+1<stored){
   throw Error(ERROR+' Solo admite radiografías monocromáticas 2D de 8/16 bits sin compresión.');
  }
  const frameBytes=rows*cols*bits/8;
  if(encapsulatedPixel===null&&frameBytes*frames>pixel.length)throw Error('Datos de píxeles DICOM incompletos.');
  if(encapsulatedPixel!==null&&frames!==1)throw Error('DICOM comprimido con varios fotogramas: utiliza un visor PACS.');
  if(encapsulatedPixel===null&&['1.2.840.10008.1.2.5','1.2.840.10008.1.2.4.50','1.2.840.10008.1.2.4.57','1.2.840.10008.1.2.4.70'].includes(syntax))throw Error('Faltan fragmentos de píxeles comprimidos.');
  if(syntax==='1.2.840.10008.1.2.4.50'&&bits!==8)throw Error('JPEG Baseline sólo admite 8 bits aquí.');
  let compressedPixels=null;
  if(syntax==='1.2.840.10008.1.2.5')compressedPixels=rleBytes(encapsulated(bytes,encapsulatedPixel),rows*cols,bits);
  const parseNum=(v,fallback)=>{const n=Number.parseFloat(String(v).split('\\')[0]);return Number.isFinite(n)?n:fallback};
  const slope=parseNum(txt('00281053','1'),1),intercept=parseNum(txt('00281052','0'),0);
  const mask=2**stored-1,sign=2**(stored-1),base=2**stored,shift=high+1-stored;
  function pixels(frame){
   if(frame<0||frame>=frames)throw Error('Fotograma fuera de rango.');
   const values=new Float32Array(rows*cols);
   const start=pixel.start+frame*frameBytes;let low=Infinity,highValue=-Infinity;
   for(let i=0;i<values.length;i++){
    let n=compressedPixels?(bits===8?compressedPixels[i]:compressedPixels[2*i]|(compressedPixels[2*i+1]<<8)):(bits===8?bytes[start+i]:view.getUint16(start+i*2,true));
    n=(n>>shift)&mask;
    if(signed&&n>=sign)n-=base;
    const value=n*slope+intercept;values[i]=value;
    if(value<low)low=value;if(value>highValue)highValue=value;
   }
   return {values,min:low,max:highValue};
  }
  const jpegLossless=syntax==='1.2.840.10008.1.2.4.57'||syntax==='1.2.840.10008.1.2.4.70';
  const first=syntax==='1.2.840.10008.1.2.4.50'||jpegLossless?{min:0,max:2**stored-1}:pixels(0);
  const center=parseNum(txt('00281050'),(first.min+first.max)/2);
  const width=Math.max(1,parseNum(txt('00281051'),first.max-first.min||1));
  const prepareJPEG=syntax==='1.2.840.10008.1.2.4.50'?async()=>{
   if(typeof createImageBitmap!=='function'||typeof document==='undefined')throw Error('El navegador no cuenta con un decodificador JPEG compatible.');
   let bitmap;
   try{
    const jpeg=encapsulated(bytes,encapsulatedPixel);
    bitmap=await createImageBitmap(new Blob([jpeg],{type:'image/jpeg'}));
    if(bitmap.width!==cols||bitmap.height!==rows)throw Error('Las dimensiones JPEG no coinciden con el DICOM.');
    const canvas=document.createElement('canvas');canvas.width=cols;canvas.height=rows;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas no disponible.');
    ctx.drawImage(bitmap,0,0);
    const image=ctx.getImageData(0,0,cols,rows).data;compressedPixels=new Uint8Array(rows*cols);
    for(let i=0;i<compressedPixels.length;i++)compressedPixels[i]=Math.round((image[i*4]*299+image[i*4+1]*587+image[i*4+2]*114)/1000);
   }catch(err){throw Error('JPEG Baseline no pudo abrirse: '+err.message)}finally{bitmap?.close?.()}
  }:null;
  const ds=v=>v.split('\\').map(Number);
  const metadata={
   seriesUID:txt('0020000e'),
   studyUID:txt('0020000d'),
   frameOfReferenceUID:txt('00200052'),
   sopUID:txt('00080018'),
   modality:txt('00080060'),
   pixelSpacing:ds(txt('00280030')),
   position:ds(txt('00200032')),
   orientation:ds(txt('00200037')),
   sliceThickness:Number(txt('00180050'))||null
  };
  const result={rows,cols,frames,bits,photo,center,width,metadata,syntax:describeSyntax(syntax),patientsPrivate:true,pixels,prepare:null};
  if(jpegLossless){
   result.prepare=async()=>{
    const jpeg=encapsulated(bytes,encapsulatedPixel);
    if(jpeg[0]!==0xff||jpeg[1]!==0xd8)throw Error('El fragmento JPEG Lossless no contiene una imagen válida.');
    try{
     // Módulo de código abierto MIT incluido dentro del sistema, SIN conexión a servidores externos.
     const {Decoder}=await import('./vendor/jpeg-lossless.min.js');
     const samples=new Decoder().decode(jpeg.buffer,jpeg.byteOffset,jpeg.byteLength,bits/8);
     if(!(samples instanceof Uint16Array||samples instanceof Uint8Array)||samples.length!==rows*cols)throw Error('Dimensiones o tipo de píxeles inesperados en JPEG Lossless.');
     compressedPixels=new Uint8Array(samples.buffer,samples.byteOffset,samples.byteLength);
     const actual=pixels(0);
     if(!tags.has('00281050'))result.center=(actual.min+actual.max)/2;
     if(!tags.has('00281051'))result.width=Math.max(1,actual.max-actual.min);
    }catch(err){throw Error('No se pudo decodificar JPEG Lossless '+syntax+': '+err.message)}
   };
  }else result.prepare=prepareJPEG;
  return result;
 }
 async function mount(buffer,host){
  const dicom=parse(buffer);
  if(dicom.prepare)await dicom.prepare();
  let frame=0,zoom=1,panX=0,panY=0,invert=dicom.photo==='MONOCHROME1';
  let width=dicom.width,center=dicom.center;
  host.replaceChildren();host.classList.add('dicom-workspace');
  const controls=document.createElement('div');controls.className='dicom-toolbar';controls.setAttribute('role','toolbar');controls.setAttribute('aria-label','Herramientas de la radiografía');
  const buttons=[['minus','Alejar'],['plus','Acercar'],['window-down','Menos contraste'],['window-up','Más contraste'],['brightness-down','Oscurecer'],['brightness-up','Aclarar'],['invert','Invertir colores'],['previous','Fotograma anterior'],['next','Fotograma siguiente'],['reset','Restablecer']];
  for(const [action,label] of buttons){
   const button=document.createElement('button');button.type='button';button.dataset.dicom=action;
   button.className='dicom-control';button.textContent=label;button.setAttribute('aria-label',label);
   controls.append(button);
  }
  const stage=document.createElement('div');stage.className='dicom-stage';
  const canvas=document.createElement('canvas');canvas.width=dicom.cols;canvas.height=dicom.rows;canvas.setAttribute('aria-label','Radiografía DICOM de '+dicom.cols+' por '+dicom.rows+' píxeles');
  const info=document.createElement('div');info.className='dicom-info';stage.append(canvas,info);host.append(controls,stage);
  const ctx=canvas.getContext('2d',{willReadFrequently:false});
  if(!ctx)throw Error('Este navegador no permite dibujar la radiografía.');
  function transform(){canvas.style.transform='translate('+panX+'px,'+panY+'px) scale('+zoom+')'}
  function draw(){
   const {values}=dicom.pixels(frame),image=ctx.createImageData(dicom.cols,dicom.rows);
   const lower=center-width/2;
   for(let i=0,j=0;i<values.length;i++,j+=4){
    let value=Math.max(0,Math.min(255,Math.round((values[i]-lower)*255/width)));
    if(invert)value=255-value;
    image.data[j]=value;image.data[j+1]=value;image.data[j+2]=value;image.data[j+3]=255;
   }
   ctx.putImageData(image,0,0);
   info.textContent=dicom.cols+' × '+dicom.rows+' px · Fotograma '+(frame+1)+'/'+dicom.frames+' · W '+Math.round(width)+' / L '+Math.round(center)+' · Zoom '+Math.round(zoom*100)+'%';
   transform();
  }
  controls.addEventListener('click',event=>{
   const action=event.target.closest('button')?.dataset.dicom;
   if(!action)return;
   if(action==='plus')zoom=Math.min(8,Math.round((zoom+0.25)*100)/100);
   if(action==='minus')zoom=Math.max(0.25,Math.round((zoom-0.25)*100)/100);
   if(action==='window-up')width=Math.max(1,width*0.8);
   if(action==='window-down')width=Math.max(1,width*1.25);
   if(action==='brightness-up')center-=width*0.1;
   if(action==='brightness-down')center+=width*0.1;
   if(action==='invert')invert=!invert;
   if(action==='next')frame=Math.min(dicom.frames-1,frame+1);
   if(action==='previous')frame=Math.max(0,frame-1);
   if(action==='reset'){frame=0;zoom=1;panX=panY=0;width=dicom.width;center=dicom.center;invert=dicom.photo==='MONOCHROME1'}
   draw();
  });
  let last=null;
  stage.addEventListener('pointerdown',event=>{if(event.target!==canvas)return;last={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId)});
  canvas.addEventListener('pointermove',event=>{if(!last)return;panX+=event.clientX-last.x;panY+=event.clientY-last.y;last={x:event.clientX,y:event.clientY};transform()});
  canvas.addEventListener('pointerup',()=>{last=null});
  canvas.addEventListener('pointercancel',()=>{last=null});
  stage.addEventListener('wheel',event=>{event.preventDefault();zoom=Math.min(8,Math.max(.25,zoom+(event.deltaY>0?-.1:.1)));draw()},{passive:false});
  draw();
  return {dicom,reset(){frame=0;zoom=1;panX=panY=0;draw()}};
 }
 return {parse,mount,inspect,describeSyntax,rleBytes};
});
