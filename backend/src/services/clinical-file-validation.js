'use strict';
const MAX_STANDARD=5*1024*1024,MAX_ADVANCED=14*1024*1024;
function bad(message,status=400){return Object.assign(new Error(message),{status})}
function publicName(value){
 const name=String(value||'').trim().split(/[\\/]/).pop();
 if(!name||name.length>180||/[\x00-\x1f\x7f]/.test(name)||name==='.'||name==='..')throw bad('Nombre de archivo inválido.');
 return name;
}
function sniff(buffer){
 if(!Buffer.isBuffer(buffer)||!buffer.length)return null;
 if(buffer.subarray(0,5).toString('ascii')==='%PDF-')return 'application/pdf';
 if(buffer.length>132&&buffer.subarray(128,132).toString('ascii')==='DICM')return 'application/dicom';
 // El STL binario usa 80 bytes de cabecera + uint32LE de triángulos + 50 bytes por cara.
 // No confiar en el texto "solid": algunos STL binarios también empiezan así.
 if(buffer.length>=134){
  const faces=buffer.readUInt32LE(80);
  if(faces>0&&84+faces*50===buffer.length)return 'model/stl';
 }
 const prefix=buffer.toString('utf8',0,Math.min(2048,buffer.length));
 const suffix=buffer.toString('utf8',Math.max(0,buffer.length-512));
 if(/^\s*solid(?:\s|$)/i.test(prefix)&&/\bfacet\s+normal\b/i.test(prefix)&&
    /\bvertex\b/i.test(prefix)&&/\bendsolid\b/i.test(suffix))return 'model/stl';
 if(buffer.length>4&&buffer[0]===0x50&&buffer[1]===0x4b&&
   ((buffer[2]===3&&buffer[3]===4)||(buffer[2]===5&&buffer[3]===6)||(buffer[2]===7&&buffer[3]===8)))return 'application/zip';
 if(buffer.length>3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff)return 'image/jpeg';
 if(buffer.length>8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(buffer.length>12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'image/webp';
 if(buffer.length>4&&(buffer.subarray(0,4).equals(Buffer.from([73,73,42,0]))||buffer.subarray(0,4).equals(Buffer.from([77,77,0,42]))))return 'image/tiff';
 if(buffer.length>2&&buffer.toString('ascii',0,2)==='BM')return 'image/bmp';
 return null;
}
const allowedImages=new Set(['image/jpeg','image/png','image/webp','image/tiff','image/bmp']);
function validateFile({buffer,filename,category}){
 const nombre=publicName(filename);
 if(!['PDF','RADIOGRAFIA'].includes(category))throw bad('Categoría de archivo no permitida.');
 const mime=sniff(buffer);
 const allowed=category==='PDF'?mime==='application/pdf':mime==='application/dicom'||mime==='application/zip'||mime==='model/stl'||allowedImages.has(mime)||mime==='application/pdf';
 if(!allowed)throw bad('Formato inválido: solo PDF, DICOM Part 10, STL, ZIP CBCT e imágenes radiográficas permitidas.');
 const max=['application/zip','application/dicom','model/stl'].includes(mime)?MAX_ADVANCED:MAX_STANDARD;
 if(buffer.byteLength>max)throw bad('Archivo demasiado grande (máximo '+max/(1024*1024)+' MB).',413);
 if(mime==='application/dicom'&&!/\.(dcm|dicom|ima)$/i.test(nombre))throw bad('DICOM requiere extensión .dcm, .dicom o .ima.');
 if(mime==='application/zip'&&!/\.zip$/i.test(nombre))throw bad('ZIP requiere extensión .zip.');
 if(mime==='model/stl'&&!/\.stl$/i.test(nombre))throw bad('El modelo STL debe tener extensión .stl.');
 if(category==='PDF'&&!/\.pdf$/i.test(nombre))throw bad('PDF requiere extensión .pdf.');
 return {nombre,mime,max,size:buffer.byteLength};
}
module.exports={publicName,sniff,validateFile,MAX_STANDARD,MAX_ADVANCED};
