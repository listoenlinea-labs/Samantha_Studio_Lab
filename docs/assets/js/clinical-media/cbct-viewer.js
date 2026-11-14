/* CBCT three-mode viewer. Research/educational use only; never infer 3D from a 2D image.
   All DICOM pixels remain local to the browser. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.YerenaCBCTViewer=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const $=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e};
 const button=(text,handler)=>{const b=$('button','cbct-btn',text);b.type='button';b.addEventListener('click',handler);return b};
 const link=(parent,...children)=>{parent.append(...children);return parent};
 const preset=[[.11,.45],[.18,.69],[.31,.82],[.49,.86],[.68,.82],[.83,.69],[.9,.45]];
 function paint(canvas,image){
  canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('El dispositivo no soporta Canvas 2D.');
  const pixels=ctx.createImageData(image.width,image.height);pixels.data.set(image.values);ctx.putImageData(pixels,0,0);
 }
 function createGL(canvas,v){
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:false});
  if(!gl)throw Error('El dispositivo no admite WebGL2: usa las vistas 2D y panorámica.');
  const max=gl.getParameter(gl.MAX_3D_TEXTURE_SIZE);
  if(v.nx>max||v.ny>max||v.nz>max)throw Error('El volumen excede el límite de texturas 3D de la tarjeta gráfica.');
  const vs=`#version 300 es
  precision highp float;
  out vec2 uv;
  void main(){
   vec2 p=vec2((gl_VertexID==1)?3.:-1.,(gl_VertexID==2)?3.:-1.);
   uv=p*.5+.5;
   gl_Position=vec4(p,0.,1.);
  }`;
  const fs=`#version 300 es
  precision highp float;
  precision highp sampler3D;
  in vec2 uv;out vec4 outputColor;
  uniform sampler3D vox;
  uniform mat3 rotation;
  uniform vec3 aspect;
  uniform float threshold,opacity,sliceX,sliceY,sliceZ;
  uniform bool showPlanes;
  vec2 hit(vec3 o,vec3 d,vec3 b){
   vec3 ta=(-b-o)/d,tb=(b-o)/d;
   vec3 lower=min(ta,tb),upper=max(ta,tb);
   return vec2(max(max(lower.x,lower.y),lower.z),min(min(upper.x,upper.y),upper.z));
  }
  void main(){
   vec2 xy=(uv-.5)*2.;
   vec3 ro=transpose(rotation)*vec3(0.,0.,2.25);
   vec3 rd=normalize(transpose(rotation)*vec3(xy.x,xy.y,-2.4));
   vec2 range=hit(ro,rd,aspect*.5);
   if(range.x>range.y||range.y<0.){outputColor=vec4(.025,.038,.05,1.);return;}
   float t=max(0.,range.x),stepLength=(range.y-t)/232.;
   vec3 color=vec3(0.);float alpha=0.;
   for(int i=0;i<232;i++){
    vec3 pos=ro+rd*(t+stepLength*float(i));
    vec3 coord=pos/aspect+.5;
    float d=texture(vox,coord).r;
    float w=smoothstep(threshold,min(1.,threshold+.18),d);
    bool ax=showPlanes&&abs(coord.z-sliceZ)<.006;
    bool sag=showPlanes&&abs(coord.x-sliceX)<.006;
    bool cor=showPlanes&&abs(coord.y-sliceY)<.006;
    bool plane=ax||sag||cor;
    float a=(w*(.012+opacity*.065))+(plane?.025*d:0.);
    vec3 surface=mix(vec3(.74,.80,.84),vec3(1.),w);
    if(plane)surface=mix(surface,ax?vec3(.37,.66,1.):sag?vec3(1.,.68,.32):vec3(.39,1.,.71),.45);
    color+=(1.-alpha)*a*surface;
    alpha+=(1.-alpha)*a;
    if(alpha>.985)break;
   }
   outputColor=vec4(mix(vec3(.025,.038,.05),color,max(.2,alpha)),1.);
  }`;
  function shader(kind,source){const sh=gl.createShader(kind);gl.shaderSource(sh,source);gl.compileShader(sh);
   if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('WebGL: '+gl.getShaderInfoLog(sh));
   return sh}
  const program=gl.createProgram();const vert=shader(gl.VERTEX_SHADER,vs),frag=shader(gl.FRAGMENT_SHADER,fs);
  gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('No pudo compilarse el visor volumétrico: '+gl.getProgramInfoLog(program));
  gl.deleteShader(vert);gl.deleteShader(frag);
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_3D,texture);
  gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_R,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
  gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,v.nx,v.ny,v.nz,0,gl.RED,gl.UNSIGNED_BYTE,v.data);
  const u=n=>gl.getUniformLocation(program,n);
  const aspect=[v.nx*v.spacing[0],v.ny*v.spacing[1],v.nz*v.spacing[2]],unit=Math.max(...aspect);
  const uniforms={vox:u('vox'),rotation:u('rotation'),aspect:u('aspect'),threshold:u('threshold'),
   opacity:u('opacity'),sliceX:u('sliceX'),sliceY:u('sliceY'),sliceZ:u('sliceZ'),showPlanes:u('showPlanes')};
  let removed=false;
  function draw({yaw,pitch,threshold,opacity,planes,x,y,z}){
   if(removed)return;
   const rect=canvas.getBoundingClientRect(),scale=Math.min(1.5,window.devicePixelRatio||1);
   canvas.width=Math.min(960,Math.max(320,Math.floor(rect.width*scale)));
   canvas.height=Math.min(880,Math.max(260,Math.floor(rect.height*scale)));
   gl.viewport(0,0,canvas.width,canvas.height);
   const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);
   const rotation=[cy,-sx*sy,cx*sy,0,cx,sx,-sy,-sx*cy,cx*cy];
   gl.useProgram(program);gl.bindVertexArray(vao);gl.uniform1i(uniforms.vox,0);
   gl.uniformMatrix3fv(uniforms.rotation,false,rotation);
   gl.uniform3f(uniforms.aspect,aspect[0]/unit,aspect[1]/unit,aspect[2]/unit);
   gl.uniform1f(uniforms.threshold,threshold);
   gl.uniform1f(uniforms.opacity,opacity);
   gl.uniform1f(uniforms.sliceX,x);
   gl.uniform1f(uniforms.sliceY,y);
   gl.uniform1f(uniforms.sliceZ,z);
   gl.uniform1i(uniforms.showPlanes,planes?1:0);
   gl.drawArrays(gl.TRIANGLES,0,3);
  }
  return {draw,dispose(){removed=true;gl.deleteTexture(texture);gl.deleteProgram(program);gl.deleteVertexArray(vao)}};
 }
 function mount(host,v,{name='Serie CBCT'}={}){
  if(!v||!(v.data instanceof Uint8Array)||v.nz<12)throw Error('Solo se aceptan volúmenes reconstruidos a partir de una serie CBCT válida.');
  host.replaceChildren();
  const shell=$('div','cbct-shell'),head=$('div','cbct-header');
  link(head,$('div','cbct-heading',name),$('span','cbct-pill','SERIE 3D VERIFICADA'));
  const details=$('div','cbct-details',v.sourceSize.join(' × ')+' cortes/píxeles de origen · Espaciado '+v.spacing.map(x=>x.toFixed(2)).join(' / ')+' mm · '+(v.modality||'DICOM'));
  const tabs=$('div','cbct-tabs'),main=$('div','cbct-main'),disclaimer=$('p','cbct-disclaimer',
   'Visualizador volumétrico exploratorio, NO certificado para diagnóstico, implantología ni medidas clínicas. No se envían imágenes a servidores externos.');
  shell.append(head,details,tabs,main,disclaimer);host.append(shell);
  let view='2d',yaw=.65,pitch=-.33,threshold=.56,opacity=.58,planes=true,z=.5,x=.5,y=.5,level=127,windowWidth=255,thickness=2,arch=preset.map(p=>[...p]),engine=null,disposed=false;
  const modes=[['2d','2D View'],['3d','3D View'],['pan','Panoramic View']];
  for(const [mode,label] of modes){
   const b=button(label,()=>show(mode));b.dataset.mode=mode;tabs.append(b);
  }
  const buildSlider=(label,min,max,step,value,handler)=>{
   const block=$('label','cbct-slider'),caption=$('span','',label),range=$('input');
   range.type='range';range.min=String(min);range.max=String(max);range.step=String(step);
   range.value=String(value);range.addEventListener('input',()=>handler(Number(range.value)));
   block.append(caption,range);return block;
  };
  function show(mode){
   if(disposed)return;
   if(engine){engine.dispose();engine=null}
   view=mode;tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
   main.replaceChildren();
   if(mode==='2d')build2D();else if(mode==='3d')build3D();else buildPan();
  }
  function build2D(){
   const tools=$('div','cbct-tools'),grid=$('div','cbct-mpr-grid');
   const canvases={};
   for(const [axis,label] of [['axial','AXIAL'],['sagittal','SAGITTAL'],['coronal','CORONAL']]){
    const panel=$('div','cbct-mpr-panel'),title=$('strong','',label),canvas=$('canvas','cbct-slice');
    canvases[axis]=canvas;panel.append(title,canvas);grid.append(panel);
    const handle=event=>{
     const r=canvas.getBoundingClientRect(),fx=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),
      fy=Math.max(0,Math.min(1,(event.clientY-r.top)/r.height));
     if(axis==='axial'){x=fx;y=fy}else if(axis==='sagittal'){y=fx;z=1-fy}else{x=fx;z=1-fy}
     show('2d');
    };
    canvas.addEventListener('pointerdown',handle);
   }
   function redraw(){
    for(const [axis,c] of Object.entries(canvases)){
     paint(c,window.YerenaVolume.sliceImage(v,axis,{axial:z,sagittal:x,coronal:y}[axis],level,windowWidth));
     const ctx=c.getContext('2d'),px=axis==='sagittal'?y:x,py=axis==='axial'?y:1-z;
     ctx.lineWidth=1;ctx.strokeStyle='rgba(67,205,255,.85)';ctx.beginPath();
     ctx.moveTo(px*c.width,0);ctx.lineTo(px*c.width,c.height);ctx.stroke();
     ctx.strokeStyle='rgba(255,199,93,.85)';ctx.beginPath();
     ctx.moveTo(0,py*c.height);ctx.lineTo(c.width,py*c.height);ctx.stroke();
    }
   }
   tools.append(buildSlider('Corte axial',0,1,.005,z,n=>{z=n;redraw()}),
    buildSlider('Corte sagital',0,1,.005,x,n=>{x=n;redraw()}),
    buildSlider('Corte coronal',0,1,.005,y,n=>{y=n;redraw()}),
    buildSlider('Nivel',0,255,1,level,n=>{level=n;redraw()}),
    buildSlider('Ventana',1,255,1,windowWidth,n=>{windowWidth=n;redraw()}));
   main.append(grid,tools);redraw();
  }
  function build3D(){
   const pane=$('div','cbct-3d-wrapper'),canvas=$('canvas','cbct-webgl'),tools=$('div','cbct-tools');
   pane.append(canvas);main.append(pane,tools);
   try{engine=createGL(canvas,v)}catch(err){pane.replaceChildren($('p','cbct-error',err.message));return}
   const redraw=()=>engine?.draw({yaw,pitch,threshold,opacity,planes,x,y,z});
   tools.append(buildSlider('Densidad / hueso',0.08,.92,.01,threshold,n=>{threshold=n;redraw()}),
    buildSlider('Opacidad',.05,1,.05,opacity,n=>{opacity=n;redraw()}),
    buildSlider('Plano axial',0,1,.01,z,n=>{z=n;redraw()}),
    buildSlider('Plano sagital',0,1,.01,x,n=>{x=n;redraw()}),
    buildSlider('Plano coronal',0,1,.01,y,n=>{y=n;redraw()}));
   const toggle=$('label','cbct-check');const check=$('input');check.type='checkbox';check.checked=planes;
   check.addEventListener('change',()=>{planes=check.checked;redraw()});toggle.append(check,document.createTextNode('Mostrar plano de corte'));tools.append(toggle);
   let last=null;
   canvas.addEventListener('pointerdown',event=>{last=[event.clientX,event.clientY];canvas.setPointerCapture(event.pointerId)});
   canvas.addEventListener('pointermove',event=>{if(!last)return;yaw+=(event.clientX-last[0])*.008;pitch=Math.max(-1.45,Math.min(1.45,pitch+(event.clientY-last[1])*.008));last=[event.clientX,event.clientY];redraw()});
   canvas.addEventListener('pointerup',()=>{last=null});
   canvas.addEventListener('pointercancel',()=>{last=null});
   const reset=button('Restablecer vista',()=>{yaw=.65;pitch=-.33;redraw()});tools.append(reset);
   redraw();
  }
  function buildPan(){
   const layout=$('div','cbct-pan-grid'),axial=$('div','cbct-pan-panel'),pan=$('div','cbct-pan-panel');
   const canvas=$('canvas','cbct-slice'),panCanvas=$('canvas','cbct-slice');
   axial.append($('strong','','AXIAL · traza la arcada'),canvas);
   pan.append($('strong','','PANORÁMICA CURVA · MPR aproximado'),panCanvas);
   const panError=$('p','cbct-hint');pan.append(panError);
   layout.append(axial,pan);
   const controls=$('div','cbct-tools');
   function drawArch(){
    paint(canvas,window.YerenaVolume.sliceImage(v,'axial',z));
    const ctx=canvas.getContext('2d');ctx.strokeStyle='#37b4ef';ctx.fillStyle='#37b4ef';ctx.lineWidth=2;ctx.beginPath();
    arch.forEach((p,i)=>{const a=p[0]*canvas.width,b=p[1]*canvas.height;i?ctx.lineTo(a,b):ctx.moveTo(a,b)});
    ctx.stroke();for(const p of arch){ctx.beginPath();ctx.arc(p[0]*canvas.width,p[1]*canvas.height,3,0,Math.PI*2);ctx.fill()}
   }
   function redraw(){
    drawArch();
    try{paint(panCanvas,window.YerenaVolume.panoramic(v,arch,thickness));panError.textContent='';panCanvas.hidden=false}
    catch(err){panCanvas.hidden=true;panError.textContent=err.message}
   }
   canvas.addEventListener('pointerdown',event=>{
    const box=canvas.getBoundingClientRect(),point=[Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)),
      Math.max(0,Math.min(1,(event.clientY-box.top)/box.height))];
    // Points are collected from left to right: reset and trace the arch manually if preset is unsuitable.
    if(arch.length>=16)arch=[];arch.push(point);redraw();
   });
   controls.append(buildSlider('Corte axial para trazar',0,1,.01,z,n=>{z=n;redraw()}),
    buildSlider('Espesor máximo (vóxeles)',0,6,1,thickness,n=>{thickness=n;redraw()}),
    button('Restaurar curva de ejemplo',()=>{arch=preset.map(p=>[...p]);redraw()}),
    button('Dibujar curva nueva',()=>{arch=[];redraw()}));
   main.append(layout,controls,$('p','cbct-hint','La curva azul es solo una referencia geométrica. Pulsa “Dibujar curva nueva” y marca la arcada de izquierda a derecha. La panorámica es una reconstrucción exploratoria, no una medición clínica calibrada.'));
   redraw();
  }
  show('2d');
  return {dispose(){disposed=true;engine?.dispose();host.replaceChildren()},setView:show};
 }
 return {mount};
});
