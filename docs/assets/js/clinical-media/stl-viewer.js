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
   if(faces>MAX_TRIANGLES&&84+faces*50===bytes.length)
    fail('El STL tiene más de 450,000 triángulos. Reduce la malla para visualizarla.');
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
  if(!host||!mesh||!(mesh.positions instanceof Float32Array)||!mesh.triangles)fail('La malla STL no es válida.');
  host.replaceChildren();
  const wrapper=document.createElement('section');wrapper.className='ssl-stl-premium';
  const header=document.createElement('header');header.className='ssl-stl-premium-header';
  const meta=document.createElement('div');meta.className='ssl-stl-premium-meta';
  const eyebrow=document.createElement('span');eyebrow.textContent='MODELO DENTAL 3D · ARCHIVO STL';
  const title=document.createElement('h3');title.textContent=name;
  const detail=document.createElement('p');
  detail.textContent=mesh.triangles.toLocaleString('es-MX')+' triángulos · '+mesh.format+
    ' · dimensiones originales '+mesh.bounds.lengths.map(x=>Number(x.toFixed(2))).join(' × ');
  meta.append(eyebrow,title,detail);
  const tag=document.createElement('span');tag.className='ssl-stl-label';tag.textContent='Visor exploratorio 3D';
  header.append(meta,tag);
  const toolbar=document.createElement('div');toolbar.className='ssl-stl-premium-toolbar';
  toolbar.innerHTML=
    '<label>Material<select data-stl-setting="material">'+
      '<option value="ivory">Marfil dental</option><option value="lilac">Lavanda clínica</option>'+
      '<option value="mint">Menta pastel</option><option value="blue">Azul hielo</option>'+
      '<option value="rose">Rosa porcelana</option><option value="graphite">Grafito</option></select></label>'+
    '<label>Ambiente<select data-stl-setting="background">'+
      '<option value="navy">Azul noche</option><option value="pearl">Blanco perla</option>'+
      '<option value="lavender">Lila tenue</option><option value="slate">Gris clínica</option></select></label>'+
    '<label>Luz <input data-stl-setting="light" type="range" min="65" max="180" value="115" aria-label="Intensidad de luz"></label>'+
    '<label class="ssl-stl-toggle"><input data-stl-setting="smooth" type="checkbox" checked> Suavizar</label>'+
    '<label class="ssl-stl-toggle"><input data-stl-setting="wire" type="checkbox"> Malla</label>'+
    '<label class="ssl-stl-toggle"><input data-stl-setting="transparent" type="checkbox"> Translúcido</label>';
  const viewbar=document.createElement('div');viewbar.className='ssl-stl-premium-views';
  viewbar.innerHTML='<span>ENFOQUE</span>'+
    '<button type="button" data-stl-view="front">Frontal</button>'+
    '<button type="button" data-stl-view="back">Posterior</button>'+
    '<button type="button" data-stl-view="top">Oclusal</button>'+
    '<button type="button" data-stl-view="bottom">Inferior</button>'+
    '<button type="button" data-stl-view="left">Izquierda</button>'+
    '<button type="button" data-stl-view="right">Derecha</button>'+
    '<button type="button" data-stl-view="reset">Restablecer vista</button>'+
    '<button type="button" data-stl-view="center-model">Centrar modelo</button>'+
    '<button type="button" data-stl-view="zoom-in">＋</button>'+
    '<button type="button" data-stl-view="zoom-out">−</button>'+
    '<button type="button" data-stl-view="image">Capturar PNG</button>';
  const navigation=document.createElement('div');navigation.className='ssl-stl-premium-navigation';
  navigation.innerHTML='<div class="ssl-stl-navigation-modes" role="group" aria-label="Modo de navegación del modelo dental">'+
    '<button type="button" data-stl-mode="rotate" aria-pressed="true">Girar 3D</button>'+
    '<button type="button" data-stl-mode="pan" aria-pressed="false">Mover modelo</button>'+
    '<button type="button" data-stl-mode="center" aria-pressed="false">Centrar un punto</button></div>'+
    '<div class="ssl-stl-navigation-arrows" role="group" aria-label="Desplazar el modelo">'+
    '<button type="button" data-stl-pan="left" aria-label="Mover modelo a la izquierda">←</button>'+
    '<button type="button" data-stl-pan="up" aria-label="Mover modelo hacia arriba">↑</button>'+
    '<button type="button" data-stl-pan="down" aria-label="Mover modelo hacia abajo">↓</button>'+
    '<button type="button" data-stl-pan="right" aria-label="Mover modelo a la derecha">→</button></div>';
  const stage=document.createElement('div');stage.className='ssl-stl-premium-stage';stage.dataset.environment='navy';
  const canvas=document.createElement('canvas');canvas.className='ssl-stl-premium-canvas';canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Modelo STL dental. Arrastra para girar, elige Mover modelo para desplazarlo o Centrar un punto y toca el lugar que quieres centrar.');
  const hint=document.createElement('p');hint.className='ssl-stl-premium-hint';
  hint.textContent='Arrastra para girar · Mayús + arrastrar para mover · rueda para acercar';
  stage.append(canvas,hint);
  const footer=document.createElement('p');footer.className='ssl-stl-premium-disclaimer';
  footer.textContent='Las orientaciones siguen los ejes del archivo original. Visor de consulta; no certificado para diagnóstico, análisis de oclusión o mediciones clínicas.';
  wrapper.append(header,toolbar,viewbar,navigation,stage,footer);host.append(wrapper);

  const gl=canvas.getContext('webgl',{antialias:true,alpha:true,preserveDrawingBuffer:true})
    ||canvas.getContext('experimental-webgl',{antialias:true,alpha:true,preserveDrawingBuffer:true});
  if(!gl){
   const error=document.createElement('p');error.className='ssl-stl-premium-error';
   error.textContent='El navegador no admite WebGL. Descarga el STL original para abrirlo en un visor compatible.';
   canvas.replaceWith(error);
   return {dispose(){host.replaceChildren()}};
  }
  const compile=(type,src)=>{
   const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
   if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))fail('No se pudo preparar el visor STL: '+gl.getShaderInfoLog(sh));
   return sh;
  };
  function program(vertex,fragment){
   const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
   const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
   gl.deleteShader(vs);gl.deleteShader(fs);
   if(!gl.getProgramParameter(p,gl.LINK_STATUS))fail('No se pudo iniciar el programa gráfico 3D.');
   return p;
  }
  const vertex='attribute vec3 aPosition;attribute vec3 aNormal;uniform mat3 uRotation;uniform vec2 uScreen;uniform vec2 uPan;uniform float uZoom;varying vec3 vNormal;varying vec3 vPosition;void main(){vec3 q=uRotation*aPosition;vPosition=q;vNormal=normalize(uRotation*aNormal);gl_Position=vec4(q.x*uScreen.x*uZoom+uPan.x,q.y*uScreen.y*uZoom+uPan.y,-q.z*.65,1.0);}';
  const fragment='precision mediump float;varying vec3 vNormal;varying vec3 vPosition;uniform vec3 uColor;uniform float uLight;uniform float uAlpha;uniform float uGloss;void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 key=normalize(vec3(.44,.66,1.0));vec3 fill=normalize(vec3(-.65,.24,.6));float a=max(dot(n,key),0.0);float b=max(dot(n,fill),0.0);float rim=pow(1.0-abs(dot(n,vec3(0.,0.,1.))),2.0);vec3 h=normalize(key+vec3(0.,0.,1.));float spec=pow(max(dot(n,h),0.0),uGloss);vec3 c=uColor*(.42+.61*a+.22*b)+vec3(.45,.40,.5)*spec*.39+uColor*rim*.15;c*=uLight;c=c/(c+vec3(.28));c=pow(c,vec3(.85));gl_FragColor=vec4(c,uAlpha);}';
  const edgeVertex='attribute vec3 aPosition;uniform mat3 uRotation;uniform vec2 uScreen;uniform vec2 uPan;uniform float uZoom;void main(){vec3 q=uRotation*aPosition;gl_Position=vec4(q.x*uScreen.x*uZoom+uPan.x,q.y*uScreen.y*uZoom+uPan.y,-q.z*.65,1.0);}';
  const edgeFragment='precision mediump float;void main(){gl_FragColor=vec4(.33,.30,.41,.25);}';
  const meshProgram=program(vertex,fragment),wireProgram=program(edgeVertex,edgeFragment);
  const positions=gl.createBuffer(),facetNormals=gl.createBuffer(),smoothNormals=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,positions);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,facetNormals);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);
  let smoothingReady=false,wireBuffer=null,wireCount=0,disposed=false;
  function makeSmoothNormals(){
   if(smoothingReady)return;
   // Mantener superficies redondeadas como gingiva, sin aumentar la cantidad de triángulos.
   const table=new Map(),p=mesh.positions,n=mesh.normals;
   for(let i=0;i<p.length;i+=3){
    const key=p[i].toFixed(4)+','+p[i+1].toFixed(4)+','+p[i+2].toFixed(4);
    const existing=table.get(key)||[0,0,0];
    existing[0]+=n[i];existing[1]+=n[i+1];existing[2]+=n[i+2];
    table.set(key,existing);
   }
   const output=new Float32Array(n.length);
   for(let i=0;i<p.length;i+=3){
    const sum=table.get(p[i].toFixed(4)+','+p[i+1].toFixed(4)+','+p[i+2].toFixed(4));
    const length=Math.hypot(...sum)||1;
    output[i]=sum[0]/length;output[i+1]=sum[1]/length;output[i+2]=sum[2]/length;
   }
   gl.bindBuffer(gl.ARRAY_BUFFER,smoothNormals);gl.bufferData(gl.ARRAY_BUFFER,output,gl.STATIC_DRAW);
   smoothingReady=true;
  }
  function makeWireframe(){
   if(wireBuffer)return;
   const every=Math.max(1,Math.ceil(mesh.triangles/24000)),p=mesh.positions,points=[];
   for(let tri=0;tri<mesh.triangles;tri+=every){
    const offset=tri*9;
    for(const [a,b] of [[0,3],[3,6],[6,0]]){
     points.push(p[offset+a],p[offset+a+1],p[offset+a+2],
       p[offset+b],p[offset+b+1],p[offset+b+2]);
    }
   }
   wireCount=points.length/3;wireBuffer=gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER,wireBuffer);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
  }
  const palette={
   ivory:[.94,.88,.75],lilac:[.64,.49,.78],mint:[.53,.83,.73],
   blue:[.56,.76,.91],rose:[.9,.65,.71],graphite:[.40,.46,.55]
  };
  let material='ivory',environment='navy',light=1.15,showWire=false,
      smooth=true,alpha=1,yaw=.28,pitch=-.4,zoom=1,panX=0,panY=0,drag=null,frame=null,interactionMode='rotate';
  const pointers=new Map();
  const attr=(program,name)=>gl.getAttribLocation(program,name);
  const uniform=(program,name)=>gl.getUniformLocation(program,name);
  const rotate=()=>{
   const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
   return new Float32Array([cy,-sp*sy,cp*sy,0,cp,sp,-sy,-sp*cy,cp*cy]);
  };
  function draw(){
   frame=null;if(disposed)return;
   const rect=stage.getBoundingClientRect(),scale=Math.min(window.devicePixelRatio||1,1.8);
   const width=Math.max(1,Math.round(rect.width*scale)),height=Math.max(1,Math.round(rect.height*scale));
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
   gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);
   gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
   gl.useProgram(meshProgram);
   const ratio=Math.min(1,width/height),inverse=Math.min(1,height/width);
   const screen=new Float32Array([ratio,inverse]);
   gl.uniformMatrix3fv(uniform(meshProgram,'uRotation'),false,rotate());
   gl.uniform2fv(uniform(meshProgram,'uScreen'),screen);
   gl.uniform2fv(uniform(meshProgram,'uPan'),new Float32Array([panX,panY]));
   gl.uniform1f(uniform(meshProgram,'uZoom'),zoom);
   gl.uniform3fv(uniform(meshProgram,'uColor'),new Float32Array(palette[material]));
   gl.uniform1f(uniform(meshProgram,'uLight'),light);
   gl.uniform1f(uniform(meshProgram,'uAlpha'),alpha);
   gl.uniform1f(uniform(meshProgram,'uGloss'),material==='graphite'?30:55);
   gl.bindBuffer(gl.ARRAY_BUFFER,positions);
   const ap=attr(meshProgram,'aPosition');
   gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,0,0);
   if(smooth&&!smoothingReady)makeSmoothNormals();
   gl.bindBuffer(gl.ARRAY_BUFFER,smooth?smoothNormals:facetNormals);
   const an=attr(meshProgram,'aNormal');
   gl.enableVertexAttribArray(an);gl.vertexAttribPointer(an,3,gl.FLOAT,false,0,0);
   if(alpha<1){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)}
   gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);
   gl.drawArrays(gl.TRIANGLES,0,mesh.triangles*3);
   gl.disable(gl.POLYGON_OFFSET_FILL);gl.disable(gl.BLEND);
   if(showWire){
    makeWireframe();gl.useProgram(wireProgram);
    gl.uniformMatrix3fv(uniform(wireProgram,'uRotation'),false,rotate());
    gl.uniform2fv(uniform(wireProgram,'uScreen'),screen);
    gl.uniform2fv(uniform(wireProgram,'uPan'),new Float32Array([panX,panY]));
    gl.uniform1f(uniform(wireProgram,'uZoom'),zoom);
    gl.bindBuffer(gl.ARRAY_BUFFER,wireBuffer);
    const wirePos=attr(wireProgram,'aPosition');
    gl.enableVertexAttribArray(wirePos);gl.vertexAttribPointer(wirePos,3,gl.FLOAT,false,0,0);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.LINES,0,wireCount);gl.disable(gl.BLEND);
   }
  }
  const repaint=()=>{if(!disposed&&frame===null)frame=requestAnimationFrame(draw)};
  function reset(){yaw=.28;pitch=-.4;zoom=1;panX=0;panY=0;repaint()}
  canvas.addEventListener('pointerdown',event=>{
   drag=[event.clientX,event.clientY,event.pointerId];
   canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
   if(!drag||event.pointerId!==drag[2])return;
   yaw+=(event.clientX-drag[0])*.009;
   pitch=Math.max(-1.57,Math.min(1.57,pitch+(event.clientY-drag[1])*.009));
   drag=[event.clientX,event.clientY,event.pointerId];repaint();
  });
  canvas.addEventListener('pointerup',()=>{drag=null});
  canvas.addEventListener('pointercancel',()=>{drag=null});
  canvas.addEventListener('dblclick',reset);
  canvas.addEventListener('wheel',event=>{
   event.preventDefault();zoom=Math.max(.35,Math.min(3,zoom*(event.deltaY<0?1.1:.9)));repaint();
  },{passive:false});
  canvas.addEventListener('keydown',event=>{
   if(event.key==='ArrowLeft')yaw-=.12;
   else if(event.key==='ArrowRight')yaw+=.12;
   else if(event.key==='ArrowUp')pitch-=.12;
   else if(event.key==='ArrowDown')pitch+=.12;
   else if(event.key==='+'||event.key==='=')zoom=Math.min(3,zoom*1.12);
   else if(event.key==='-')zoom=Math.max(.35,zoom/1.12);
   else return;
   event.preventDefault();repaint();
  });
  toolbar.addEventListener('input',event=>{
   const target=event.target,setting=target?.dataset.stlSetting;
   if(setting==='material')material=target.value;
   else if(setting==='background'){environment=target.value;stage.dataset.environment=environment}
   else if(setting==='light')light=Number(target.value)/100;
   else if(setting==='smooth')smooth=target.checked;
   else if(setting==='wire')showWire=target.checked;
   else if(setting==='transparent')alpha=target.checked?.60:1;
   repaint();
  });
  toolbar.addEventListener('change',event=>{
   if(event.target.dataset.stlSetting==='material')material=event.target.value;
   if(event.target.dataset.stlSetting==='background'){
    environment=event.target.value;stage.dataset.environment=environment;
   }
   repaint();
  });
  viewbar.addEventListener('click',event=>{
   const key=event.target.closest('[data-stl-view]')?.dataset.stlView;
   if(!key)return;
   if(key==='front'){yaw=0;pitch=0}
   else if(key==='back'){yaw=Math.PI;pitch=0}
   else if(key==='top'){yaw=0;pitch=-Math.PI/2}
   else if(key==='bottom'){yaw=0;pitch=Math.PI/2}
   else if(key==='left'){yaw=-Math.PI/2;pitch=0}
   else if(key==='right'){yaw=Math.PI/2;pitch=0}
   else if(key==='zoom-in')zoom=Math.min(3,zoom*1.2);
   else if(key==='zoom-out')zoom=Math.max(.35,zoom/1.2);
   else if(key==='reset')reset();
   else if(key==='center-model')centerModel();
   else if(key==='image'){
    repaint();
    requestAnimationFrame(()=>{
     canvas.toBlob(blob=>{
      if(!blob)return;
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='vista-stl-odontologica.png';document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
     },'image/png');
    });
   }
   repaint();
  });
  let resize=null;
  if(typeof ResizeObserver==='function'){resize=new ResizeObserver(repaint);resize.observe(stage)}
  repaint();
  return {dispose(){
   disposed=true;
   if(frame!==null)cancelAnimationFrame(frame);
   resize?.disconnect();
   gl.deleteBuffer(positions);gl.deleteBuffer(facetNormals);gl.deleteBuffer(smoothNormals);
   if(wireBuffer)gl.deleteBuffer(wireBuffer);
   gl.deleteProgram(meshProgram);gl.deleteProgram(wireProgram);
   host.replaceChildren();
  }};
 }
 return {parse,readSTL,openStudy,mount,extSTL,MAX_BYTES,MAX_TRIANGLES};
});
