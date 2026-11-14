/* Archivos del expediente: UI adaptada del flujo de Dra. Yerena Riso.
   El visor DICOM/CBCT es de consulta, no un dispositivo de diagnóstico. */
(function(){
 'use strict';
 let current=null,selection=[],objectUrls=[],viewer=null,modeToken=0,controller=null;
 const $=id=>document.getElementById(id);
 const escape=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bytes=x=>(Number(x||0)/1024/1024).toFixed(1)+' MB';
 const category=()=>current?.mode==='radiographs'?'RADIOGRAFIA':'PDF';
 const apiUrl=()=>current.apiBase.replace(/\/$/,'')+'/pacientes/'+current.patientId+'/archivos';
 function message(s,err=false){
  const el=$('sslMediaMessage');if(el){el.textContent=s;el.classList.toggle('error',err);el.hidden=false}
  current?.notify?.(s,err);
 }
 function dispose(){
  modeToken++;selection=[];
  if(viewer){viewer.dispose?.();viewer=null}
  objectUrls.forEach(url=>URL.revokeObjectURL(url));objectUrls=[];
 }
 function url(blob){const u=URL.createObjectURL(blob);objectUrls.push(u);return u}
 async function jsonRequest(path,options={}){
  const res=await fetch(path,{...options,credentials:'same-origin',cache:'no-store'});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data.ok===false)throw Error(data.mensaje||'No se pudo consultar el expediente ('+res.status+').');
  return data;
 }
 async function blobRequest(fileId){
  const res=await fetch(apiUrl()+'/'+fileId,{credentials:'same-origin',cache:'no-store'});
  if(!res.ok){
   const data=await res.json().catch(()=>({}));
   throw Error(data.mensaje||'No se pudo abrir el estudio ('+res.status+').');
  }
  return res.blob();
 }
 async function uploadFile(file,description,cat,progress){
  const query=new URLSearchParams({categoria:cat,nombre:file.name,descripcion:description||''});
  const res=await fetch(apiUrl()+'?'+query,{
   method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},
   body:file,cache:'no-store',credentials:'same-origin'
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data.ok===false)throw Error(data.mensaje||'No se pudo guardar el archivo ('+res.status+').');
  progress?.();
  return data;
 }
 function controlsHtml(){
  return typeof window.YerenaRadiographControls?.toolbarMarkup==='function'
   ?window.YerenaRadiographControls.toolbarMarkup():'';
 }
 function formHtml(mode){
  const radio=mode==='radiographs';
  const inputAccept=radio?'.dcm,.dicom,.ima,.pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff,.bmp,application/dicom':'application/pdf,.pdf';
  return '<section class="ssl-media-card"><h3>'+(radio?'Agregar radiografía 2D':'Agregar documento PDF')+'</h3>'+
  '<form id="sslMediaUpload" class="ssl-media-form"><label>Seleccionar archivo<input id="sslMediaFile" type="file" accept="'+inputAccept+'" required></label>'+
  '<label>Descripción (opcional)<input id="sslMediaDescription" maxlength="500" placeholder="Tipo de estudio, fecha o anotación"></label>'+
  '<button class="ssl-media-primary" type="submit">Guardar en expediente</button></form>'+
  '<p class="ssl-media-note">Guardado privado en MySQL · PDF e imágenes hasta 5 MB'+(radio?'; DICOM Part 10 hasta 14 MB.':' · Solo PDF.')+'</p></section>';
 }
 function cbctHtml(){
  return '<section class="ssl-media-card ssl-media-cbct" id="sslCbctPanel"><h3>Tomografías CBCT · 2D / 3D / Panorámica</h3>'+
   '<p>Selecciona un archivo ZIP o una serie de 12 a 400 cortes DICOM del mismo estudio. La visualización se procesa en tu navegador.</p>'+
   '<div class="ssl-cbct-controls"><label>ZIP o cortes DICOM<input id="sslCbctFiles" type="file" accept=".zip,.dcm,.dicom,.ima" multiple></label>'+
   '<label>Carpeta CBCT<input id="sslCbctFolder" type="file" webkitdirectory multiple></label></div>'+
   '<div id="sslCbctSelected" aria-live="polite">Todavía no has seleccionado un estudio.</div>'+
   '<div class="ssl-cbct-actions"><button id="sslCbctPreview" type="button" class="ssl-media-secondary" disabled>Visualizar estudio</button>'+
   '<button id="sslCbctPersist" type="button" class="ssl-media-primary" disabled>Guardar serie en MySQL</button></div>'+
   '<p class="ssl-media-note">El ZIP puede consultarse localmente hasta 256 MB. Para guardarlo en MySQL, máximo 14 MB. Las series de cortes se guardan individualmente si cumplen las validaciones.</p></section>';
 }
 function mainHtml(mode){
  const radio=mode==='radiographs';
  return '<div class="ssl-media-root"><div id="sslMediaMessage" role="status" class="ssl-media-message" hidden></div>'+
   '<div class="ssl-media-columns">'+formHtml(mode)+
   '<section class="ssl-media-card"><h3>'+(radio?'Radiografías y tomografías del paciente':'Archivos PDF del paciente')+
   '</h3><div id="sslMediaList" aria-live="polite">Cargando archivos…</div></section></div>'+
   (radio?cbctHtml():'')+
   '<section class="ssl-media-card ssl-media-viewer-card"><h3>'+(radio?'Visor de radiografías y tomografías':'Vista previa del documento')+
   '</h3><div id="sslMediaViewer" class="ssl-media-viewer"><div class="ssl-media-placeholder">Selecciona un archivo guardado para consultarlo.</div></div>'+
   (radio?'<p class="ssl-media-note">Visor para consulta y orientación, no certificado para diagnóstico. No convierte radiografías 2D en tomografías 3D. Los códecs DICOM no compatibles requieren PACS.</p>':'')+'</section></div>';
 }
 function listRows(items,cat){
  if(!items.length)return '<p class="ssl-media-empty">Todavía no hay archivos en este apartado.</p>';
  return '<div class="ssl-media-list">'+items.map(item=>{
   const mime=item.tipoMime||'',id=Number(item.idArchivo),isZip=mime==='application/zip',isDicom=mime==='application/dicom';
   const action=isZip?'Ver tomografía':isDicom?'Ver DICOM':mime.startsWith('image/')?'Ver imagen':mime==='application/pdf'?'Ver PDF':'Descargar';
   return '<article class="ssl-media-entry" data-file-id="'+id+'"><div><strong>'+escape(item.nombre)+'</strong>'+
    '<small>'+escape(item.descripcion||'Sin descripción')+' · '+bytes(item.bytes)+' · '+escape(new Date(item.creadoAt).toLocaleDateString('es-MX'))+'</small></div>'+
    '<div class="ssl-media-entry-actions"><button type="button" data-media-view="'+id+'">'+action+'</button>'+
    '<button type="button" data-media-download="'+id+'" data-name="'+escape(item.nombre)+'">Descargar</button>'+
    (current.canDelete?'<button type="button" class="ssl-media-delete" data-media-delete="'+id+'">Eliminar</button>':'')+'</div></article>';
  }).join('')+'</div>';
 }
 async function refresh(){
  const t=modeToken,cat=category(),container=$('sslMediaList');
  if(!container)return;
  container.textContent='Consultando archivos…';
  try{
   const data=await jsonRequest(apiUrl()+'?'+new URLSearchParams({categoria:cat}));
   if(t!==modeToken)return;
   current.items=data.items||[];current.canDelete=!!data.canDelete;
   container.innerHTML=listRows(current.items,cat);
  }catch(e){if(t===modeToken)container.textContent=e.message}
 }
 async function viewFile(id){
  const item=current.items.find(i=>Number(i.idArchivo)===id);
  if(!item)throw Error('Archivo no disponible. Actualiza el listado.');
  const blob=await blobRequest(id),host=$('sslMediaViewer');
  if(!host)return;
  if(viewer){viewer.dispose?.();viewer=null}
  const mime=item.tipoMime;
  if(mime==='application/zip'){
   const file=new File([blob],item.nombre,{type:mime});
   await openVolume([file],item.nombre);
   return;
  }
  host.replaceChildren();
  if(mime==='application/dicom'){
   const heading=document.createElement('p');heading.className='ssl-media-note';heading.textContent='DICOM 2D: '+item.nombre;
   const container=document.createElement('div');container.className='ssl-media-dicom-host';host.append(heading,container);
   const data=await blob.arrayBuffer();
   try{
    const info=window.YerenaDicomViewer.inspect(data);
    viewer=await window.YerenaDicomViewer.mount(data,container);
    const note=document.createElement('p');note.className='ssl-media-note';note.textContent='Transfer Syntax: '+info.label+' · '+info.uid;
    host.append(note);
   }catch(e){container.textContent=e.message+' Descarga el estudio para abrirlo en un PACS compatible.';throw e}
   return;
  }
  if(mime==='application/pdf'){
   const frame=document.createElement('iframe');frame.title='Documento PDF privado';frame.loading='lazy';
   frame.className='ssl-media-pdf';frame.src=url(blob);host.append(frame);return;
  }
  if(mime.startsWith('image/')&&mime!=='image/tiff'&&mime!=='image/bmp'){
   controller=window.YerenaRadiographControls.create();
   const wrap=document.createElement('div');wrap.className='ssl-media-image-canvas';
   const img=document.createElement('img');img.src=url(blob);img.alt='Estudio radiográfico del paciente';
   wrap.append(img);wrap.insertAdjacentHTML('beforeend',controlsHtml());host.append(wrap);
   wrap.querySelectorAll('[data-image]').forEach(button=>button.addEventListener('click',()=>{
    if(controller.change(button.dataset.image))img.style.transform=controller.cssTransform();
   }));
   return;
  }
  const a=document.createElement('a');a.textContent='Abrir descarga original';a.href=url(blob);a.download=item.nombre;host.append(a);
 }
 async function downloadFile(id,name){
  const blob=await blobRequest(id),link=document.createElement('a');
  const object=url(blob);link.href=object;link.download=name||'archivo-clinico';document.body.append(link);link.click();link.remove();
 }
 function setSelection(files){
  selection=Array.from(files||[]);
  const status=$('sslCbctSelected');
  if(status)status.textContent=selection.length===1?selection[0].name:
   selection.length?selection.length+' archivos seleccionados':'Todavía no has seleccionado un estudio.';
  const valid=selection.length>0;
  if($('sslCbctPreview'))$('sslCbctPreview').disabled=!valid;
  if($('sslCbctPersist'))$('sslCbctPersist').disabled=!valid;
 }
 async function volumeFromFiles(files){
  if(!window.YerenaCBCTArchive||!window.YerenaVolume||!window.YerenaCBCTViewer)
   throw Error('El visor CBCT no está disponible. Actualiza la página.');
  const loaded=await window.YerenaCBCTArchive.fromFiles(files,{
   onProgress:(n,total,label)=>{const el=$('sslCbctSelected');if(el)el.textContent=label+' · '+n+'/'+total}
  });
  const volume=await window.YerenaVolume.fromFiles(loaded.records,(n,total,label)=>{
   const el=$('sslCbctSelected');if(el)el.textContent=label+' · '+n+'/'+total;
  });
  return {volume,loaded};
 }
 async function openVolume(files,label){
  const {volume}=await volumeFromFiles(files);
  const host=$('sslMediaViewer');
  if(!host)return;
  if(viewer){viewer.dispose?.();viewer=null}
  host.replaceChildren();
  viewer=window.YerenaCBCTViewer.mount(host,volume,{name:label||'Estudio CBCT'});
  host.scrollIntoView({behavior:'smooth',block:'start'});
 }
 async function persistSeries(){
  if(!selection.length)throw Error('Selecciona un estudio.');
  const {volume,loaded}=await volumeFromFiles(selection);
  const zip=loaded.kind==='zip';
  const unit=zip?selection:[...loaded.records.map(r=>r.file)];
  const max=zip?1:unit.length;
  if(zip&&selection[0].size>14*1024*1024)throw Error('ZIP mayor a 14 MB: puedes verlo localmente, pero no guardarlo completo en MySQL.');
  if(!confirm('¿Guardar '+max+' archivo(s) de la serie CBCT en el expediente de este paciente?'))return;
  const uid=loaded.records[0]?window.YerenaDicomViewer.parse(loaded.records[0].buffer).metadata?.seriesUID:'';
  if(!uid)throw Error('Falta identificador SeriesInstanceUID; no se puede guardar una serie sin identificación.');
  for(let i=0;i<unit.length;i++){
   const desc='CBCT:'+uid;
   const src=unit[i];
   await uploadFile(src,desc,'RADIOGRAFIA',()=>{const e=$('sslCbctSelected');if(e)e.textContent='Guardado '+(i+1)+' de '+max;});
  }
  message('Serie guardada en el expediente del paciente.');
  await refresh();
 }
 function bindEvents(){
  const fileForm=$('sslMediaUpload');
  fileForm.addEventListener('submit',async e=>{
   e.preventDefault();
   const file=$('sslMediaFile').files?.[0],button=fileForm.querySelector('button[type=submit]');
   if(!file)return message('Selecciona un archivo.',true);
   button.disabled=true;
   try{
    await uploadFile(file,$('sslMediaDescription').value.trim(),category());
    fileForm.reset();message('Archivo guardado en el expediente.');
    await refresh();
   }catch(err){message(err.message,true)}finally{button.disabled=false}
  });
  $('sslMediaList').addEventListener('click',async e=>{
   const view=e.target.closest('[data-media-view]'),down=e.target.closest('[data-media-download]'),del=e.target.closest('[data-media-delete]');
   const button=view||down||del;if(!button)return;button.disabled=true;
   try{
    if(view)await viewFile(Number(view.dataset.mediaView));
    else if(down)await downloadFile(Number(down.dataset.mediaDownload),down.dataset.name);
    else if(del){
     if(!confirm('¿Eliminar definitivamente este archivo del expediente? No se puede deshacer.'))return;
     await jsonRequest(apiUrl()+'/'+del.dataset.mediaDelete,{method:'DELETE'});
     message('Archivo eliminado.');await refresh();
    }
   }catch(err){message(err.message,true)}finally{button.disabled=false}
  });
  if(category()!=='RADIOGRAFIA')return;
  $('sslCbctFiles').addEventListener('change',e=>setSelection(e.target.files));
  $('sslCbctFolder').addEventListener('change',e=>setSelection(Array.from(e.target.files).filter(f=>/\.(dcm|dicom|ima)$/i.test(f.name))));
  $('sslCbctPreview').addEventListener('click',async e=>{
   e.currentTarget.disabled=true;try{await openVolume(selection,'CBCT local')}catch(err){message(err.message,true)}
   finally{e.currentTarget.disabled=false}
  });
  $('sslCbctPersist').addEventListener('click',async e=>{
   e.currentTarget.disabled=true;try{await persistSeries()}catch(err){message(err.message,true)}
   finally{e.currentTarget.disabled=false}
  });
 }
 async function render(config){
  dispose();
  current={...config,items:[]};
  const element=$('phView');if(!element)return;
  element.innerHTML=mainHtml(config.mode);
  bindEvents();
  await refresh();
 }
 window.SamanthaClinicalMedia={render,dispose};
})();
