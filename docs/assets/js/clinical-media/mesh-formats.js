/* Visor de mallas intraorales OBJ/PLY: parseo local, sin bibliotecas externas ni red.
 * Produce la misma estructura de triángulos que SamanthaSTLViewer.mount. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SamanthaDentalMesh=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_SIZE=40*1024*1024,MAX_TRIANGLES=300000,MAX_VERTICES=350000;
 const fail=message=>{throw Error(message)};
 const normal=(a,b,c)=>{
  const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2]];
  const length=Math.hypot(...n)||1;return n.map(x=>x/length);
 };
 function buildMesh(vertices,faces,format){
  if(!vertices.length||!faces.length)fail('El modelo 3D no contiene superficies trianguladas.');
  const positions=[],normals=[];
  for(const face of faces){
   if(face.length<3||face.length>32)fail('El archivo contiene una cara no admitida.');
   for(let j=1;j+1<face.length;j++){
    const tri=[face[0],face[j],face[j+1]].map(index=>{
     const point=vertices[index];
     if(!point)fail('El modelo 3D referencia un vértice inexistente.');
     return point;
    });
    const n=normal(...tri);
    for(const p of tri){positions.push(...p);normals.push(...n)}
    if(positions.length/9>MAX_TRIANGLES)fail('La malla supera 300,000 triángulos; reduce su resolución.');
   }
  }
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<positions.length;i+=3)for(let k=0;k<3;k++){
   min[k]=Math.min(min[k],positions[i+k]);max[k]=Math.max(max[k],positions[i+k]);
  }
  const lengths=max.map((n,i)=>n-min[i]),maximum=Math.max(...lengths);
  if(!(maximum>1e-10))fail('Modelo sin dimensiones tridimensionales válidas.');
  const center=min.map((n,i)=>(n+max[i])/2),scale=1.25/maximum;
  for(let i=0;i<positions.length;i+=3)for(let k=0;k<3;k++){
   positions[i+k]=(positions[i+k]-center[k])*scale;
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),
   triangles:positions.length/9,format,bounds:{min,max,lengths},isMedicalCertified:false};
 }
 function parseOBJ(buffer){
  if(buffer.byteLength>18*1024*1024)fail('OBJ demasiado grande para visualizar. Reduce la malla.');
  const source=new TextDecoder('utf-8',{fatal:false}).decode(buffer);
  const vertices=[],faces=[];
  for(const line of source.split(/\r?\n/)){
   const value=line.trim();if(!value||value.startsWith('#'))continue;
   if(/^v\s/.test(value)){
    const parts=value.split(/\s+/).slice(1,4).map(Number);
    if(parts.length!==3||!parts.every(Number.isFinite))fail('El OBJ contiene coordenadas inválidas.');
    vertices.push(parts);
    if(vertices.length>MAX_VERTICES)fail('Demasiados vértices OBJ.');
   }else if(/^f\s/.test(value)){
    const tokens=value.split(/\s+/).slice(1);
    if(tokens.length<3||tokens.length>32)fail('El OBJ tiene una cara con cantidad de vértices no admitida.');
    faces.push(tokens.map(token=>{
     const match=token.match(/^(-?\d+)(?:\/\d*)?(?:\/-?\d+)?$/);
     if(!match)fail('Cara OBJ inválida.');
     const i=Number(match[1]);
     const index=i>0?i-1:vertices.length+i;
     if(index<0||index>=vertices.length)fail('Cara OBJ con índice fuera del modelo.');
     return index;
    }));
    if(faces.length>MAX_TRIANGLES)fail('Demasiadas caras OBJ.');
   }
  }
  return buildMesh(vertices,faces,'OBJ');
 }
 const types={
  char:['getInt8',1],int8:['getInt8',1],uchar:['getUint8',1],uint8:['getUint8',1],
  short:['getInt16',2],int16:['getInt16',2],ushort:['getUint16',2],uint16:['getUint16',2],
  int:['getInt32',4],int32:['getInt32',4],uint:['getUint32',4],uint32:['getUint32',4],
  float:['getFloat32',4],float32:['getFloat32',4],double:['getFloat64',8],float64:['getFloat64',8]
 };
 function parsePLY(buffer){
  const raw=new Uint8Array(buffer),max=Math.min(raw.length,65536);
  let end=-1;
  for(let i=0;i<max-11;i++){
   if(raw[i]===101&&raw[i+1]===110&&raw[i+2]===100&&raw[i+3]===95&&raw[i+4]===104&&
      raw[i+5]===101&&raw[i+6]===97&&raw[i+7]===100&&raw[i+8]===101&&raw[i+9]===114){
    if(raw[i+10]===10){end=i+11;break}
    if(raw[i+10]===13&&raw[i+11]===10){end=i+12;break}
   }
  }
  if(end<0)fail('El archivo PLY no contiene encabezado completo.');
  const header=new TextDecoder().decode(raw.subarray(0,end)).split(/\r?\n/);
  if(header[0]!=='ply')fail('Encabezado PLY inválido.');
  const formatLine=header.find(line=>line.startsWith('format '))||'';
  const mode=formatLine.split(/\s+/)[1];
  if(!['ascii','binary_little_endian'].includes(mode))fail('PLY big-endian no compatible: exporta PLY ASCII o binario little-endian.');
  const elements=[],props=[];let active=null;
  for(const line of header){
   const parts=line.trim().split(/\s+/);
   if(parts[0]==='element'){
    active={name:parts[1],count:Number(parts[2]),properties:[]};elements.push(active);
    if(!Number.isSafeInteger(active.count)||active.count<0)fail('Conteo PLY inválido.');
   }else if(parts[0]==='property'&&active){
    if(parts[1]==='list')active.properties.push({name:parts[4],list:true,countType:parts[2],itemType:parts[3]});
    else active.properties.push({name:parts[2],type:parts[1],list:false});
   }
  }
  const vertexInfo=elements.find(x=>x.name==='vertex'),faceInfo=elements.find(x=>x.name==='face');
  if(!vertexInfo||!faceInfo||vertexInfo.count>MAX_VERTICES||faceInfo.count>MAX_TRIANGLES)
   fail('El PLY no contiene una malla compatible o supera los límites de tamaño.');
  const vertices=[],faces=[];
  const save=(element,values)=>{
   if(element.name==='vertex'){
    const point=['x','y','z'].map(k=>Number(values[k]));
    if(!point.every(Number.isFinite))fail('Coordenadas PLY inválidas.');
    vertices.push(point);
   }else if(element.name==='face'){
    const list=values.vertex_indices||values.vertex_index;
    if(!Array.isArray(list)||list.length<3||list.length>32)fail('Cara PLY inválida.');
    faces.push(list.map(i=>Number(i)));
   }
  };
  if(mode==='ascii'){
   const text=new TextDecoder().decode(raw.subarray(end)),lines=text.split(/\r?\n/);
   let offset=0;
   for(const element of elements)for(let k=0;k<element.count;k++){
    const tokens=(lines[offset++]||'').trim().split(/\s+/);let i=0,values={};
    for(const prop of element.properties){
     if(prop.list){
      const count=Number(tokens[i++]);
      if(!Number.isSafeInteger(count)||count<0||count>10000)fail('Lista PLY inválida.');
      values[prop.name]=tokens.slice(i,i+count).map(Number);i+=count;
     }else values[prop.name]=Number(tokens[i++]);
    }
    save(element,values);
   }
  }else{
   const dv=new DataView(buffer),cursor={offset:end};
   const number=type=>{
    const record=types[type];if(!record)fail('Tipo numérico PLY no compatible: '+type);
    if(cursor.offset+record[1]>dv.byteLength)fail('Archivo PLY incompleto.');
    const value=dv[record[0]](cursor.offset,true);cursor.offset+=record[1];return value;
   };
   for(const element of elements)for(let k=0;k<element.count;k++){
    const values={};
    for(const prop of element.properties){
     if(prop.list){
      const count=number(prop.countType);
      if(!Number.isSafeInteger(count)||count<0||count>10000)fail('Lista PLY inválida.');
      const valuesList=[];for(let j=0;j<count;j++)valuesList.push(number(prop.itemType));
      values[prop.name]=valuesList;
     }else values[prop.name]=number(prop.type);
    }
    save(element,values);
   }
  }
  return buildMesh(vertices,faces,'PLY '+(mode==='ascii'?'ASCII':'binario'));
 }
 async function open(file){
  if(!file||file.size>MAX_SIZE)fail('Archivo demasiado grande: máximo 40 MB para visualización local.');
  const extension=(file.name||'').split('.').pop().toLowerCase();
  if(!['obj','ply'].includes(extension))fail('Selecciona un modelo OBJ o PLY.');
  const buffer=await file.arrayBuffer();
  const mesh=extension==='obj'?parseOBJ(buffer):parsePLY(buffer);
  return {mesh,source:file.name};
 }
 return {open,parseOBJ,parsePLY,MAX_SIZE};
});
