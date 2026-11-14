/* Secure, browser-local CBCT ZIP/DICOM import. No data is transmitted by this module.
   ZIP entries are treated as bytes, never written to disk or interpreted as paths. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.YerenaCBCTArchive=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_FILES=400,MIN_FILES=12,MAX_ENTRY=14*1024*1024,MAX_TOTAL=256*1024*1024,MAX_ZIP=256*1024*1024,MAX_ARCHIVE_ENTRIES=1200;
 const crcTable=Array.from({length:256},(_,i)=>{let n=i;for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0});
 function crc32(buffer){const data=new Uint8Array(buffer);let c=0xffffffff;for(let i=0;i<data.length;i++)c=crcTable[(c^data[i])&255]^(c>>>8);return (c^0xffffffff)>>>0}
 const isDicom=name=>/\.(dcm|dicom|ima)$/i.test(String(name||''));
 const isZip=name=>/\.zip$/i.test(String(name||''));
 const readableBytes=bytes=>(bytes/(1024*1024)).toFixed(1)+' MB';
 function safeName(name){
  const parts=String(name||'').split(/[\\/]/);
  if(parts.some(p=>p==='..'||p.includes('\0')))throw Error('El ZIP contiene una ruta inválida.');
  const base=parts[parts.length-1];
  if(!base||base.length>180||/[\x00-\x1f\x7f]/.test(base))throw Error('Hay un nombre de archivo DICOM inválido.');
  return base;
 }
 function validDicom(bytes,label){
  const b=new Uint8Array(bytes);
  if(b.byteLength<256||String.fromCharCode(...b.subarray(128,132))!=='DICM')
   throw Error('El archivo '+label+' no es un DICOM Part 10 válido.');
 }
 function validateSelection(selection){
  const files=Array.from(selection||[]);
  if(!files.length)throw Error('Selecciona un ZIP o una serie de cortes DICOM.');
  if(files.length===1&&isZip(files[0].name))return {mode:'zip',files};
  if(files.some(f=>isZip(f.name)))throw Error('Selecciona un solo ZIP, o varios archivos DICOM, pero no ambos a la vez.');
  if(files.length<MIN_FILES||files.length>MAX_FILES)throw Error('La serie debe incluir entre 12 y 400 archivos DICOM; selecciona la carpeta completa o un ZIP.');
  if(files.some(f=>!isDicom(f.name)))throw Error('La selección contiene un archivo que no es DICOM.');
  const total=files.reduce((sum,f)=>sum+f.size,0);
  if(files.some(f=>f.size<256||f.size>MAX_ENTRY)||total>MAX_TOTAL)
   throw Error('Los archivos superan el límite: 14 MB por DICOM y 256 MB por serie.');
  return {mode:'dicom',files};
 }
 function checkSignature(bytes){
  const u=new Uint8Array(bytes);
  return u.length>=4&&u[0]===0x50&&u[1]===0x4b&&((u[2]===3&&u[3]===4)||(u[2]===5&&u[3]===6)||(u[2]===7&&u[3]===8));
 }
 async function fromZip(file,{onProgress,zipLib}={}){
  if(!file||!isZip(file.name))throw Error('Selecciona un archivo .zip.');
  if(file.size<22||file.size>MAX_ZIP)throw Error('ZIP demasiado grande. Tamaño máximo: 256 MB.');
  const zipBytes=await file.arrayBuffer();
  if(!checkSignature(zipBytes))throw Error('El archivo seleccionado no es un ZIP válido.');
  const JSZip=zipLib||(typeof window!=='undefined'?window.JSZip:null);
  if(!JSZip?.loadAsync)throw Error('El lector ZIP no se cargó. Actualiza la página e inténtalo nuevamente.');
  let zip;
  // Do not allow JSZip to inflate the *entire* archive before checking declared sizes.
  try{zip=await JSZip.loadAsync(zipBytes,{checkCRC32:false})}
  catch{throw Error('El ZIP está dañado, protegido con contraseña o utiliza una compresión no compatible.')}
  const entries=Object.values(zip.files);
  if(entries.length>MAX_ARCHIVE_ENTRIES)throw Error('El ZIP contiene demasiadas entradas; máximo 1200.');
  const data=entries.filter(e=>!e.dir&&!/\/(?:__MACOSX|\.git)\//i.test('/'+e.name));
  const dicoms=[];
  for(const entry of data){
   const original=entry.unsafeOriginalName||entry.name;
   if(!isDicom(original))continue; // Ignore readme, screenshots and operating-system metadata.
   const name=safeName(original);
   const size=entry._data?.uncompressedSize;
   if(!Number.isSafeInteger(size)||size<256||size>MAX_ENTRY)
    throw Error('El DICOM '+name+' excede el límite de 14 MB o tiene tamaño inválido.');
   dicoms.push({entry,name,size});
  }
  if(dicoms.length<MIN_FILES||dicoms.length>MAX_FILES)
   throw Error('El ZIP debe contener entre 12 y 400 cortes DICOM; encontramos '+dicoms.length+'.');
  const sizeTotal=dicoms.reduce((n,f)=>n+f.size,0);
  if(sizeTotal>MAX_TOTAL)throw Error('Los DICOM descomprimidos superan 256 MB. Usa un PACS.');
  const records=[];
  let extracted=0;
  for(let i=0;i<dicoms.length;i++){
   const item=dicoms[i];
   onProgress?.(i,dicoms.length,'Extrayendo ZIP');
   const data=await item.entry.async('arraybuffer');
   extracted+=data.byteLength;
   if(data.byteLength!==item.size||data.byteLength>MAX_ENTRY||extracted>MAX_TOTAL)
    throw Error('Se detectó un archivo demasiado grande o un tamaño ZIP inconsistente.');
   validDicom(data,item.name);
   if(Number.isInteger(item.entry._data?.crc32)&&crc32(data)!==(item.entry._data.crc32>>>0))
    throw Error('El ZIP tiene un corte DICOM corrupto (CRC): '+item.name);
   records.push({name:item.name,buffer:data,size:data.byteLength,
    // Build only when persisting to MySQL, never upload the ZIP to the server.
    file:typeof File==='function'?new File([data],item.name,{type:'application/dicom'}):{name:item.name,size:data.byteLength,arrayBuffer:async()=>data}});
   if(i%4===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  onProgress?.(dicoms.length,dicoms.length,'ZIP listo');
  return {records,kind:'zip',archiveName:file.name,compressedBytes:file.size,totalBytes:extracted};
 }
 async function fromFiles(selection,{onProgress,zipLib}={}){
  const chosen=validateSelection(selection);
  if(chosen.mode==='zip')return fromZip(chosen.files[0],{onProgress,zipLib});
  const records=[];let total=0;
  for(let i=0;i<chosen.files.length;i++){
   const file=chosen.files[i];
   onProgress?.(i,chosen.files.length,'Leyendo DICOM');
   const buffer=await file.arrayBuffer();
   total+=buffer.byteLength;
   if(total>MAX_TOTAL)throw Error('Serie demasiado grande para procesarla en el navegador.');
   validDicom(buffer,file.name);
   records.push({name:safeName(file.name),buffer,size:buffer.byteLength,file});
   if(i%4===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  onProgress?.(records.length,records.length,'DICOM listos');
  return {records,kind:'dicom',totalBytes:total};
 }
 return {MIN_FILES,MAX_FILES,MAX_ENTRY,MAX_TOTAL,isDicom,isZip,readableBytes,validateSelection,fromZip,fromFiles};
});
