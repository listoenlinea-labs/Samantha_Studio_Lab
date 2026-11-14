/* Archivos del expediente: UI adaptada del flujo de Dra. Yerena Riso.
   El visor DICOM/CBCT es de consulta, no un dispositivo de diagnóstico. */
(function(){
 'use strict';
 let current=null,selection=[],objectUrls=[],viewer=null,modeToken=0,controller=null,processing=false;
 const $=id=>document.getElementById(id);
 const escape=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bytes=x=>(Number(x||0)/1024/1024).toFixed(1)+' MB';
 const category=()=>current?.mode==='radiographs'?'RADIOGRAFIA':current?.mode==='media'?'':'PDF';
 const uploadCategory=file=>current?.mode==='media'&&/\.pdf$/i.test(file?.name||'')?'PDF':category()||'RADIOGRAFIA';
 const classify=item=>{
  const mime=String(item.tipoMime||'').toLowerCase(),name=String(item.nombre||'').toLowerCase();
  if(mime==='application/pdf'||/\.pdf$/.test(name))return 'pdf';
  if(mime.startsWith('video/')||/\.(mp4|webm)$/.test(name))return 'video';
  if(mime.startsWith('audio/')||/\.(mp3|wav|ogg)$/.test(name))return 'audio';
  if(mime.startsWith('image/')||/\.(jpg|jpeg|png|webp|gif|tiff|tif|bmp)$/.test(name))return 'image';
  if(mime==='model/stl'||mime==='model/obj'||mime==='model/ply'||/\.(stl|obj|ply)$/.test(name))return '3d';
  if(mime==='application/dicom'||/\.(dcm|dicom|ima)$/.test(name))return 'dicom';
  if(mime==='application/zip'||/\.zip$/.test(name))return 'cbct';
  return 'other';
 };
 const kinds={pdf:'PDF',image:'Fotografía / RX',video:'Video',audio:'Audio', '3d':'Modelo 3D',dicom:'DICOM',cbct:'Tomografía ZIP',other:'Archivo'};
 const supportedPreview=item=>!(/\.(tif|tiff|bmp)$/.test(String(item.nombre||'').toLowerCase()));
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
  const errors=window.SamanthaRequestErrors;
  let res;
  try{res=await fetch(path,{...options,credentials:'same-origin',cache:'no-store'})}
  catch(_){throw errors.networkError()}
  const data=await errors.parseJson(res);
  if(!res.ok||data.ok===false)throw errors.errorFrom(res,data);
  if(!(res.headers.get('Content-Type')||'').toLowerCase().includes('application/json'))
   throw errors.errorFrom({status:502,headers:res.headers},{mensaje:'La API devolvió una página inesperada en lugar de JSON. Comprueba el estado antes de repetir.'});
  return data;
 }
 async function blobRequest(fileId){
  const errors=window.SamanthaRequestErrors;
  let res;
  try{res=await fetch(apiUrl()+'/'+fileId,{credentials:'same-origin',cache:'no-store'})}
  catch(_){throw errors.networkError()}
  return errors.expectBlob(res,['application/pdf','application/dicom','application/zip','model/stl','model/obj','model/ply','video/*','audio/*','application/octet-stream','image/*']);
 }
 async function uploadFile(file,description,cat,progress){
  const errors=window.SamanthaRequestErrors;
  const limit=/\.(stl|obj|ply|dcm|dicom|ima|zip|mp4|webm|mp3|wav|ogg)$/i.test(file.name)?14:5;
  if(file.size>limit*1024*1024)
   throw Error('El archivo pesa '+bytes(file.size)+'; el máximo de almacenamiento para este formato es '+limit+' MB.');
  const query=new URLSearchParams({categoria:cat,nombre:file.name,descripcion:description||''});
  let res;
  try{
   res=await fetch(apiUrl()+'?'+query,{
    method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},
    body:file,cache:'no-store',credentials:'same-origin'
   });
  }catch(_){throw errors.networkError()}
  const data=await errors.parseJson(res);
  if(!res.ok||data.ok!==true||!(res.headers.get('Content-Type')||'').toLowerCase().includes('application/json'))
   throw errors.errorFrom(res,data,'No se recibió confirmación del almacenamiento. Comprueba el expediente antes de repetir la subida.');
  progress?.();
  return data;
 }
 function controlsHtml(){
  return typeof window.YerenaRadiographControls?.toolbarMarkup==='function'
   ?window.YerenaRadiographControls.toolbarMarkup():'';
 }
 function formHtml(mode){
  const radio=mode==='radiographs',all=mode==='media',isMedia=radio||all;
  const inputAccept=all?'.pdf,.jpg,.jpeg,.png,.webp,.gif,.tif,.tiff,.bmp,.mp4,.webm,.mp3,.wav,.ogg,.dcm,.dicom,.ima,.stl,.obj,.ply,.zip':
   radio?'.dcm,.dicom,.ima,.stl,.pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff,.bmp,application/dicom,model/stl':'application/pdf,.pdf';
  return '<section class="ssl-media-card"><h3>'+(all?'Agregar estudio o documento':radio?'Agregar radiografía 2D o modelo STL':'Agregar documento PDF')+'</h3>'+
  '<form id="sslMediaUpload" class="ssl-media-form"><label>Seleccionar archivo<input id="sslMediaFile" type="file" accept="'+inputAccept+'" required></label>'+
  '<label>Descripción (opcional)<input id="sslMediaDescription" maxlength="500" placeholder="Tipo de estudio, fecha o anotación"></label>'+
  (all?'<button type="button" id="sslLocalPreview" class="ssl-media-secondary">Vista previa local, sin guardar</button>':'')+
  '<button class="ssl-media-primary" type="submit">Guardar en expediente</button></form>'+
  '<p class="ssl-media-note">Guardado privado en MySQL · PDF e imágenes hasta 5 MB'+
   (isMedia?'; DICOM, ZIP, modelos 3D, video y audio hasta 14 MB por archivo. Los archivos grandes pueden previsualizarse localmente sin subirlos.':
     ' · Solo PDF.')+'</p>'+
  (all?'<p class="ssl-media-note">Reproducción de MP4/WebM y MP3/WAV/OGG sujeta al códec del navegador. TIFF/BMP: descarga original.</p>':'')+'</section>';
 }
 function cbctHtml(){
  return '<section class="ssl-media-card ssl-media-cbct" id="sslCbctPanel"><h3>Tomografías CBCT y modelos STL 3D</h3>'+
   '<p>Importa un ZIP con 12 a 400 cortes DICOM, una carpeta de cortes o un modelo de superficie STL (ASCII o binario). La malla STL se visualiza en 3D, sin convertirla en cortes CBCT.</p>'+
   '<div class="ssl-cbct-controls"><label>ZIP, DICOM o STL<input id="sslCbctFiles" type="file" accept=".zip,.dcm,.dicom,.ima,.stl,model/stl" multiple></label>'+
   '<label>Carpeta CBCT<input id="sslCbctFolder" type="file" webkitdirectory multiple></label></div>'+
   '<div id="sslCbctSelected" role="status" aria-live="polite">Todavía no has seleccionado un estudio.</div>'+
   '<progress id="sslCbctProgress" class="ssl-cbct-progress" max="100" value="0" aria-label="Progreso de preparación del estudio" hidden></progress>'+
   '<div class="ssl-cbct-actions"><button id="sslCbctPreview" type="button" class="ssl-media-secondary" disabled>Visualizar estudio</button>'+
   '<button id="sslCbctPersist" type="button" class="ssl-media-primary" disabled>Guardar estudio en MySQL</button></div>'+
   '<p class="ssl-media-note">Visualización local: ZIP DICOM hasta 256 MB, STL hasta 40 MB. Para guardar un ZIP, STL o DICOM en MySQL: máximo 14 MB por archivo. Visor exploratorio, no diagnóstico.</p></section>';
 }
 function mainHtml(mode){
  const radio=mode==='radiographs'||mode==='media',all=mode==='media';
  const filters=all?'<section class="ssl-media-library-tools" aria-label="Buscar y filtrar estudios">'+
   '<label>Buscar en el expediente<input id="sslMediaSearch" type="search" autocomplete="off" placeholder="Nombre, descripción o tipo de estudio"></label>'+
   '<label>Tipo<select id="sslMediaKind"><option value="">Todos los formatos</option>'+
   '<option value="pdf">PDF</option><option value="image">Fotografías / RX</option>'+
   '<option value="video">Videos</option><option value="audio">Audio</option>'+
   '<option value="3d">Modelos 3D</option><option value="dicom">DICOM</option>'+
   '<option value="cbct">Tomografías ZIP</option></select></label>'+
   '<span id="sslMediaCount" aria-live="polite"></span></section>':'';
  return '<div class="ssl-media-root"><div id="sslMediaMessage" role="status" class="ssl-media-message" hidden></div>'+
   (all?'<div class="ssl-media-intro"><span>BIBLIOTECA MULTIMEDIA CLÍNICA</span><h3>Todos los estudios, una sola vista.</h3>'+
      '<p>Filtra archivos privados, visualiza documentos y videos, explora modelos 3D y compara fotografías sin abandonar el expediente.</p></div>':'')+
   '<div class="ssl-media-columns">'+formHtml(mode)+
   '<section class="ssl-media-card"><h3>'+(all?'Estudios del paciente':radio?'Radiografías y tomografías del paciente':'Archivos PDF del paciente')+
   '</h3>'+filters+'<div id="sslMediaList" aria-live="polite">Cargando archivos…</div>'+
   (all?'<div id="sslMediaCompareBar" class="ssl-media-compare-bar" hidden><span id="sslMediaCompareCount">Selecciona dos fotografías</span>'+
      '<button type="button" id="sslMediaCompareStart" class="ssl-media-secondary" disabled>Comparar fotografías</button>'+
      '<button type="button" id="sslMediaCompareClear">Limpiar</button></div>':'')+'</section></div>'+
   (radio?cbctHtml():'')+
   '<section class="ssl-media-card ssl-media-viewer-card"><h3>'+(all?'Visor multimedia clínico':radio?'Visor de radiografías y tomografías':'Vista previa del documento')+
   '</h3><div id="sslMediaViewer" class="ssl-media-viewer"><div class="ssl-media-placeholder">Selecciona un archivo guardado para consultarlo.</div></div>'+
   (radio?'<p class="ssl-media-note">Visor orientativo, no certificado para diagnóstico. STL/OBJ/PLY son superficies 3D, no tomografías de volumen. DICOM con códecs no compatibles requiere PACS profesional.</p>':'')+'</section></div>';
 }
 function listRows(items,cat){
  if(!items.length)return '<p class="ssl-media-empty">Todavía no hay archivos en este apartado.</p>';
  const groups=new Map();
  if(cat==='RADIOGRAFIA')for(const item of items){
    if(item.tipoMime==='application/dicom'&&String(item.descripcion||'').startsWith('CBCT:')){
      const key=String(item.descripcion);groups.set(key,[...(groups.get(key)||[]),item]);
    }
  }
  const series=[...groups.entries()].filter(([,entries])=>entries.length>=12).map(([uid,entries])=>
    '<article class="ssl-media-series"><strong>Serie CBCT guardada · '+entries.length+' cortes</strong>'+
    '<button type="button" data-media-series="'+escape(uid)+'">Ver tomografía 2D / 3D / Panorámica</button></article>').join('');
  return '<div class="ssl-media-list">'+series+items.map(item=>{
   const mime=item.tipoMime||'',id=Number(item.idArchivo),isZip=mime==='application/zip'||/\.zip$/i.test(item.nombre||''),isDicom=mime==='application/dicom';
   // Compatibilidad con STL antiguos que MySQL guardó como application/octet-stream.
   const isStl=mime==='model/stl'||/\.stl$/i.test(item.nombre||'');
   const action=isStl?'Visualizar':isZip?'Ver tomografía':isDicom?'Ver DICOM':
     mime==='image/tiff'||mime==='image/bmp'?'Descargar':mime.startsWith('image/')?'Ver imagen':mime==='application/pdf'?'Ver PDF':'Descargar';
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
  objectUrls.forEach(saved=>URL.revokeObjectURL(saved));objectUrls=[];
  const mime=item.tipoMime;
  if(mime==='application/zip'||mime==='model/stl'||/\.(stl|zip)$/i.test(item.nombre||'')){
   const file=new File([blob],item.nombre,{type:mime});
   await openSelectedStudy([file],item.nombre);
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
 async function viewSavedSeries(uid){
  const items=current.items.filter(item=>item.tipoMime==='application/dicom'&&String(item.descripcion)===uid);
  if(items.length<12||items.length>400)throw Error('La serie guardada debe tener entre 12 y 400 cortes. Revisa si faltan archivos.');
  const size=items.reduce((n,item)=>n+Number(item.bytes||0),0);
  if(size>256*1024*1024)throw Error('La serie supera 256 MB; ábrela en un PACS compatible.');
  const files=[];
  for(let i=0;i<items.length;i++){
    const entry=items[i],blob=await blobRequest(Number(entry.idArchivo));
    files.push(new File([blob],entry.nombre,{type:'application/dicom'}));
    const label=$('sslCbctSelected');if(label)label.textContent='Descargando corte '+(i+1)+' de '+items.length;
  }
  await openVolume(files,'Serie CBCT guardada');
 }
 async function downloadFile(id,name){
  const blob=await blobRequest(id),link=document.createElement('a');
  const object=url(blob);
  link.href=object;link.download=name||'archivo-clinico';
  document.body.append(link);link.click();link.remove();
  // Mantener temporalmente el objeto para que navegadores móviles terminen la descarga.
  setTimeout(()=>{URL.revokeObjectURL(object);objectUrls=objectUrls.filter(item=>item!==object)},60000);
 }
 function setSelection(files){
  selection=Array.from(files||[]);
  const status=$('sslCbctSelected');
  if(status)status.textContent=selection.length===1?selection[0].name:
   selection.length?selection.length+' archivos seleccionados':'Todavía no has seleccionado un estudio.';
  const valid=selection.length>0;
  if($('sslCbctPreview'))$('sslCbctPreview').disabled=processing||!valid;
  if($('sslCbctPersist'))$('sslCbctPersist').disabled=processing||!valid;
  const bar=$('sslCbctProgress');if(bar)bar.hidden=true;
 }
 const isSTLName=name=>/\.stl$/i.test(String(name||''));
 function showProgress(n,total,label){
  const status=$('sslCbctSelected'),bar=$('sslCbctProgress');
  if(status)status.textContent=label+(total?' · '+n+'/'+total:'');
  if(!bar)return;
  bar.hidden=false;
  if(/Normalizando|Calculando contraste|Finalizando/i.test(label)){bar.removeAttribute('value');return}
  if(total>0)bar.value=Math.max(0,Math.min(100,Math.round(n*100/total)));
  else bar.removeAttribute('value');
 }
 function finishProgress(text){
  const bar=$('sslCbctProgress');if(bar)bar.hidden=true;
  const status=$('sslCbctSelected');if(status)status.textContent=text;
 }
 function setBusy(value,label){
  processing=value;
  $('sslCbctPanel')?.setAttribute('aria-busy',String(value));
  for(const id of ['sslCbctPreview','sslCbctPersist']){
   const button=$(id);if(!button)continue;
   button.disabled=value||!selection.length;
   button.textContent=value?'Procesando estudio…':id==='sslCbctPreview'?'Visualizar estudio':'Guardar estudio en MySQL';
  }
  if(value&&label)showProgress(0,0,label);
 }
 async function stlFromSelection(files){
  if(files.length!==1)return null;
  const file=files[0];
  if(!isSTLName(file.name)&&!/\.zip$/i.test(file.name))return null;
  if(!window.SamanthaSTLViewer)throw Error('No se cargó el visor STL. Actualiza la página.');
  return window.SamanthaSTLViewer.openStudy(file);
 }
 async function openSelectedStudy(files,label){
  const token=modeToken;
  if(files.length===1){
   const study=await stlFromSelection(files);
   if(token!==modeToken)return null;
   if(study){
    const host=$('sslMediaViewer');if(!host)return;
    viewer?.dispose?.();viewer=null;
    viewer=window.SamanthaSTLViewer.mount(host,study.mesh,{name:label||study.source});
    host.scrollIntoView({behavior:'smooth',block:'start'});
    finishProgress('Modelo STL listo · '+study.mesh.triangles.toLocaleString('es-MX')+' triángulos');
    return 'STL';
   }
  }
  if(files.some(f=>isSTLName(f.name)))throw Error('Selecciona un STL individual, sin mezclar con cortes DICOM.');
  await openVolume(files,label);
  if(token!==modeToken)return null;
  finishProgress('Tomografía CBCT lista · 2D, 3D y panorámica');
  return 'CBCT';
 }
 async function volumeFromFiles(files){
  if(!window.YerenaCBCTArchive||!window.YerenaVolume||!window.YerenaCBCTViewer)
   throw Error('El visor CBCT no está disponible. Actualiza la página.');
  const loaded=await window.YerenaCBCTArchive.fromFiles(files,{
   onProgress:showProgress
  });
  const volume=await window.YerenaVolume.fromFiles(loaded.records,showProgress);
  return {volume,loaded};
 }
 async function openVolume(files,label){
  const token=modeToken;
  const {volume}=await volumeFromFiles(files);
  if(token!==modeToken)return;
  const host=$('sslMediaViewer');
  if(!host)return;
  if(viewer){viewer.dispose?.();viewer=null}
  host.replaceChildren();
  viewer=window.YerenaCBCTViewer.mount(host,volume,{name:label||'Estudio CBCT'});
  host.scrollIntoView({behavior:'smooth',block:'start'});
 }
 async function persistSeries(){
  if(!selection.length)throw Error('Selecciona un estudio.');
  const token=modeToken;
  const stl=await stlFromSelection(selection);
  if(token!==modeToken)throw Error('Cambió el expediente; vuelve a seleccionar el estudio.');
  if(stl){
   if(selection[0].size>14*1024*1024)
    throw Error('El STL o ZIP de modelo supera 14 MB para MySQL. Puedes visualizarlo localmente o reducirlo.');
   if(!confirm('¿Guardar este modelo STL en el expediente de este paciente?'))return;
   await uploadFile(selection[0],'Modelo STL 3D','RADIOGRAFIA');
   finishProgress('Modelo STL guardado en el expediente.');
   message('Modelo STL guardado correctamente.');
   await refresh();
   return;
  }
  if(selection.some(f=>isSTLName(f.name)))throw Error('Selecciona un solo STL, sin mezclar modelos con DICOM.');
  const {volume,loaded}=await volumeFromFiles(selection);
  if(token!==modeToken)throw Error('Cambió el expediente; se canceló el guardado.');
  const zip=loaded.kind==='zip';
  const unit=zip?selection:[...loaded.records.map(r=>r.file)];
  const max=zip?1:unit.length;
  if(zip&&selection[0].size>14*1024*1024)throw Error('ZIP mayor a 14 MB: puedes verlo localmente, pero no guardarlo completo en MySQL.');
  if(!confirm('¿Guardar '+max+' archivo(s) de la serie CBCT en el expediente de este paciente?'))return;
  const uid=loaded.records[0]?window.YerenaDicomViewer.parse(loaded.records[0].buffer).metadata?.seriesUID:'';
  if(!uid)throw Error('Falta identificador SeriesInstanceUID; no se puede guardar una serie sin identificación.');
  for(let i=0;i<unit.length;i++){
   if(token!==modeToken)throw Error('Cambió el expediente; se detuvo el guardado de cortes.');
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
   if(button.disabled)return;
   button.disabled=true;button.textContent='Guardando archivo…';
   try{
    await uploadFile(file,$('sslMediaDescription').value.trim(),category());
    fileForm.reset();message('Archivo guardado en el expediente.');
    try{await refresh()}catch(_){message('El archivo se guardó, pero no se pudo actualizar el listado. Recarga para consultarlo.',true)}
   }catch(err){message('No se confirmó el guardado: '+err.message,true)}
   finally{button.disabled=false;button.textContent='Guardar en expediente'}
  });
  $('sslMediaList').addEventListener('click',async e=>{
   const view=e.target.closest('[data-media-view]'),down=e.target.closest('[data-media-download]'),del=e.target.closest('[data-media-delete]'),series=e.target.closest('[data-media-series]');
   const button=view||down||del||series;if(!button)return;button.disabled=true;
   try{
    if(series)await viewSavedSeries(series.dataset.mediaSeries);
    else if(view)await viewFile(Number(view.dataset.mediaView));
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
  $('sslCbctFolder').addEventListener('change',e=>setSelection(Array.from(e.target.files).filter(f=>/\.(dcm|dicom|ima|stl)$/i.test(f.name))));
  $('sslCbctPreview').addEventListener('click',async ()=>{
   if(processing||!selection.length)return;
   setBusy(true,'Preparando estudio');
   try{await openSelectedStudy([...selection],selection[0].name||'Estudio local')}
   catch(err){finishProgress('No se pudo visualizar el estudio.');message(err.message,true)}
   finally{setBusy(false)}
  });
  $('sslCbctPersist').addEventListener('click',async ()=>{
   if(processing||!selection.length)return;
   setBusy(true,'Validando estudio para guardar');
   try{await persistSeries()}
   catch(err){finishProgress('No se pudo guardar el estudio.');message(err.message,true)}
   finally{setBusy(false)}
  });
 }
 async function render(config){
  dispose();
  processing=false;
  current={...config,items:[]};
  const element=$('phView');if(!element)return;
  element.innerHTML=mainHtml(config.mode);
  bindEvents();
  await refresh();
 }
 window.SamanthaClinicalMedia={render,dispose};
})();
