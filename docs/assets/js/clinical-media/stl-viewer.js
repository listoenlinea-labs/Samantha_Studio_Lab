/* Visor STL 3D local para Samantha. STL es una malla, no un volumen DICOM.
 * Renderizado exploratorio; sin diagnóstico, medidas ni planificación clínica. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SamanthaSTLViewer=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_BYTES=40*1024*1024,MAX_TRIANGLES=450000;
 function fail(message){throw Error(message)}
 const finite=(...v)=>v.every(Number.isFinite);
 const normal=(a,b,c)=>{
  const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const l=Math.hypot(...n);return l>1e-10?n.map(x=>x/l):[0,0,1];
 };
 function parse(buffer){
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<25||buffer.byteLength>MAX_BYTES)
   fail('El STL está vacío o supera el máximo de 40 MB para visualización local.');
  const bytes=new Uint8Array(buffer),dv=new DataView(buffer);
  let triangles=[],normals=[],format='ASCII',count=0;
  // El encabezado de un STL binario también puede comenzar por "solid".
  if(bytes.length>=84){
   const faces=dv.getUint32(80,true);
   if(faces>0&&faces<=MAX_TRIANGLES&&84+faces*50===bytes.length){
    format='binario';count=faces;
    for(let k=0;k<faces;k++){
     const offset=84+50*k,points=[],faceNormal=[dv.getFloat32(offset,true),dv.getFloat32(offset+4,true),dv.getFloat32(offset+8,true)];
     for(let j=0;j<3;j++){
      const i=offset+12+j*12;
      const v=[dv.getFloat32(i,true),dv.getFloat32(i+4,true),dv.getFloat32(i+8,true)];
      if(!finite(...v))fail('STL contiene coordenadas no válidas.');
      points.push(v);triangles.push(...v);
     }
     const n=finite(...faceNormal)&&Math.hypot(...faceNormal)>1e-10?
       faceNormal.map(x=>x/Math.hypot(...faceNormal)):normal(...points);
     for(let j=0;j<3;j++)normals.push(...n);
    }
   }
  }
  if(!count){
   if(buffer.byteLength>18*1024*1024)fail('STL ASCII demasiado grande para el visor. Convierte a STL binario.');
   const text=new TextDecoder('utf-8',{fatal:false}).decode(bytes);
   if(!/^\s*solid(?:\s|$)/i.test(text)||!/\bfacet\s+normal\b/i.test(text)||
     !/\bendfacet\b/i.test(text))fail('El archivo no es un STL binario o ASCII válido.');
   const lines=text.split(/\r?\n/);
   let facet=null,facePoints=[],finished=0;
   const vertex=/^\s*vertex\s+(\S+)\s+(\S+)\s+(\S+)\s*$/i;
   for(const line of lines){
    if(/^\s*facet\s+normal\b/i.test(line)){
     if(facet)fail('STL ASCII contiene facetas anidadas.');
     facet=true;facePoints=[];
    }else if(facet&&vertex.test(line)){
     const m=line.match(vertex),p=m.slice(1).map(Number);
     if(!finite(...p)||facePoints.length>=3)fail('El STL ASCII contiene vértices inválidos.');
     facePoints.push(p);
    }else if(/^\s*endfacet\b/i.test(line)){
     if(!facet||facePoints.length!==3)fail('El STL ASCII tiene una faceta incompleta.');
     triangles.push(...facePoints[0],...facePoints[1],...facePoints[2]);
     const n=normal(...facePoints);normals.push(...n,...n,...n);
     if(++finished>MAX_TRIANGLES)fail('La malla STL supera el límite de 450,000 triángulos.');
     facet=false;
    }
   }
   if(facet||finished<1||!/\bendsolid\b/i.test(text))fail('El STL ASCII está incompleto.');
   count=finished;
  }
  if(count>MAX_TRIANGLES)fail('El STL supera 450,000 triángulos.');
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<triangles.length;i+=3)for(let axis=0;axis<3;axis++){
   min[axis]=Math.min(min[axis],triangles[i+axis]);max[axis]=Math.max(max[axis],triangles[i+axis]);
  }
  const lengths=max.map((x,i)=>x-min[i]);
  const largest=Math.max(...lengths);
  if(!(largest>1e-10))fail('La malla STL no tiene dimensiones válidas.');
  const center=max.map((x,i)=>(x+min[i])/2),factor=1.25/largest;
  for(let i=0;i<triangles.length;i+=3)for(let axis=0;axis<3;axis++)triangles[i+axis]=(triangles[i+axis]-center[axis])*factor;
  return {positions:new Float32Array(triangles),normals:new Float32Array(normals),triangles:count,format,bounds:{min,max,lengths},isMedicalCertified:false};
 }
 const extSTL=name=>/\.stl$/i.test(String(name||''));
 const extZIP=name=>/\.zip$/i.test(String(name||''));
 async function readSTL(file){
  if(!file||!extSTL(file.name))fail('Selecciona un archivo .stl.');
  if(file.size>MAX_BYTES)fail('STL mayor a 40 MB: abre una versión reducida o usa un visor especializado.');
  return parse(await file.arrayBuffer());
 }
 async function openStudy(file,{zipLib}={}){
  if(extSTL(file?.name))return {mesh:await readSTL(file),source:file.name};
  if(!extZIP(file?.name))return null;
  const JSZip=zipLib||(typeof window!=='undefined'?window.JSZip:null);
  if(!JSZip?.loadAsync)fail('No se cargó el lector ZIP.');
  if(file.size>256*1024*1024)fail('ZIP supera el límite de consulta local (256 MB).');
  const zip=await JSZip.loadAsync(await file.arrayBuffer(),{checkCRC32:false});
  const entries=Object.values(zip.files).filter(e=>!e.dir&&!/(^|\/)__MACOSX\//.test(e.name));
  const dicom=entries.filter(e=>/\.(dcm|dicom|ima)$/i.test(e.name));
  if(dicom.length)return null; // Los ZIP DICOM siempre van al visor CBCT.
  const stls=entries.filter(e=>extSTL(e.name));
  if(!stls.length)return null;
  if(stls.length!==1)fail('El ZIP contiene varios modelos STL. Extrae el modelo que quieras visualizar.');
  const entry=stls[0],size=entry._data?.uncompressedSize;
  if(!Number.isSafeInteger(size)||size<25||size>MAX_BYTES)fail('STL comprimido con tamaño inválido o mayor a 40 MB.');
  const data=await entry.async('arraybuffer');
  if(data.byteLength!==size)fail('El ZIP contiene un STL inconsistente.');
  return {mesh:parse(data),source:entry.name};
 }
 function mount(host,mesh,{name='Modelo STL'}={}){
  if(!host||!mesh||!(mesh.positions instanceof Float32Array)||!mesh.triangles)fail('Malla STL no válida.');
  host.replaceChildren();
  const wrap=document.createElement('section');wrap.className='ssl-stl-viewer';
  const title=document.createElement('div');title.className='ssl-stl-meta';
  const heading=document.createElement('strong');heading.textContent=name;title.append(heading);
  const detail=document.createElement('small');
  detail.textContent=mesh.triangles.toLocaleString('es-MX')+' triángulos · '+mesh.format+
   ' · dimensiones '+mesh.bounds.lengths.map(n=>Number(n.toFixed(2))).join(' × ')+' (unidades STL sin calibrar)';
  title.append(detail);
  const canvas=document.createElement('canvas');canvas.className='ssl-stl-canvas';
  canvas.setAttribute('aria-label','Modelo STL 3D giratorio. Arrastra para rotar, usa el zoom para acercar.');
  const controls=document.createElement('div');controls.className='ssl-stl-tools';
  const btn=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);controls.append(b);return b};
  const hint=document.createElement('p');hint.className='ssl-media-note';
  hint.textContent='Modelo superficial STL en 3D: gira arrastrando, amplía con la rueda o los botones. No contiene cortes radiográficos ni permite vistas CBCT 2D o panorámicas.';
  wrap.append(title,canvas,controls,hint);host.append(wrap);
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:false})||canvas.getContext('experimental-webgl');
  if(!gl){const msg=document.createElement('p');msg.textContent='WebGL no está disponible en este navegador; puedes descargar el STL original.';canvas.replaceWith(msg);return {dispose(){host.replaceChildren()}}}
  const shader=(type,source)=>{const obj=gl.createShader(type);gl.shaderSource(obj,source);gl.compileShader(obj);
   if(!gl.getShaderParameter(obj,gl.COMPILE_STATUS))fail('WebGL STL: '+gl.getShaderInfoLog(obj));return obj};
  const vert=shader(gl.VERTEX_SHADER,
   'attribute vec3 aPos;attribute vec3 aNormal;uniform mat3 uRotate;uniform float uZoom;uniform float uAspect;varying vec3 vNormal;void main(){vec3 p=uRotate*aPos;gl_Position=vec4(p.x*uZoom*uAspect,p.y*uZoom,p.z*0.65,1.0);vNormal=normalize(uRotate*aNormal);}');
  const frag=shader(gl.FRAGMENT_SHADER,
   'precision mediump float;varying vec3 vNormal;void main(){vec3 n=normalize(vNormal);float light=max(.15,dot(n,normalize(vec3(.4,.7,1.))));vec3 c=mix(vec3(.42,.34,.63),vec3(.79,.71,.9),light);gl_FragColor=vec4(c,1.0);}');
  const program=gl.createProgram();gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))fail('No pudo iniciarse el visor STL WebGL.');
  gl.deleteShader(vert);gl.deleteShader(frag);
  const pos=gl.createBuffer(),nor=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,pos);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,nor);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);
  const ap=gl.getAttribLocation(program,'aPos'),an=gl.getAttribLocation(program,'aNormal');
  const rotate=gl.getUniformLocation(program,'uRotate'),zoomUniform=gl.getUniformLocation(program,'uZoom'),aspect=gl.getUniformLocation(program,'uAspect');
  let yaw=.45,pitch=-.4,zoom=1,disposed=false,drag=null;
  const redraw=()=>{
   if(disposed)return;
   const box=canvas.getBoundingClientRect(),scale=Math.min(window.devicePixelRatio||1,1.75);
   canvas.width=Math.max(100,Math.floor(box.width*scale));canvas.height=Math.max(100,Math.floor(box.height*scale));
   gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.07,.105,.14,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
   gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,pos);gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,0,0);
   gl.bindBuffer(gl.ARRAY_BUFFER,nor);gl.enableVertexAttribArray(an);gl.vertexAttribPointer(an,3,gl.FLOAT,false,0,0);
   const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
   gl.uniformMatrix3fv(rotate,false,new Float32Array([cy,-sp*sy,cp*sy,0,cp,sp,-sy,-sp*cy,cp*cy]));
   gl.uniform1f(zoomUniform,zoom);gl.uniform1f(aspect,Math.min(1,canvas.height/canvas.width));
   gl.drawArrays(gl.TRIANGLES,0,mesh.triangles*3);
  };
  canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture?.(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;
   yaw+=(e.clientX-drag[0])*.01;pitch=Math.max(-1.55,Math.min(1.55,pitch+(e.clientY-drag[1])*.01));
   drag=[e.clientX,e.clientY];redraw()});
  canvas.addEventListener('pointerup',()=>drag=null);
  canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.5,Math.min(3,zoom*(e.deltaY<0?1.1:.9)));redraw()},{passive:false});
  btn('− Alejar',()=>{zoom=Math.max(.5,zoom/1.2);redraw()});
  btn('+ Acercar',()=>{zoom=Math.min(3,zoom*1.2);redraw()});
  btn('↻ Restablecer',()=>{yaw=.45;pitch=-.4;zoom=1;redraw()});
  let resize;
  if(typeof ResizeObserver==='function'){resize=new ResizeObserver(redraw);resize.observe(canvas)}
  redraw();
  return {dispose(){disposed=true;resize?.disconnect();gl.deleteBuffer(pos);gl.deleteBuffer(nor);gl.deleteProgram(program);host.replaceChildren()}};
 }
 return {parse,readSTL,openStudy,mount,extSTL,MAX_BYTES,MAX_TRIANGLES};
});
