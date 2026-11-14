/* Recetas de Samantha: editor libre, historial y PDF privados, sin datos de demostración. */
(function(){
 'use strict';
 let currentPdfUrl=null;
 function text(value){return String(value==null?'':value);}
 function renderError(message){const view=document.getElementById('phView');if(view)view.textContent=message;}
 async function show(context){
  const {api,patientId,escapeHtml:esc,notify,formatDate,API_URL}=context;
  const view=document.getElementById('phView');
  if(currentPdfUrl){URL.revokeObjectURL(currentPdfUrl);currentPdfUrl=null;}
  view.innerHTML='<section class="ph-card ph-loading">Consultando recetas…</section>';
  let items;
  try{items=(await api('/recetas/pacientes/'+patientId)).items||[]}
  catch(e){renderError('No se pudieron cargar las recetas: '+e.message);return}
  const card=items.map(function(r){
    const id=Number(r.idReceta);
    return '<article><strong>'+esc(r.titulo)+'</strong><small>'+esc(r.folio)+' · '+esc(formatDate(r.creadoAt))+'</small>'+
    '<div class="actions"><button type="button" data-rx-view="'+id+'">Ver PDF</button>'+
    '<button type="button" data-rx-download="'+id+'" data-folio="'+esc(r.folio)+'">Descargar</button>'+
    '<button type="button" class="danger" data-rx-delete="'+id+'">Eliminar</button></div></article>';
  }).join('');
  view.innerHTML='<div class="ph-prescription-workspace">'+
   '<section class="ph-card ph-prescription-list"><header><h2>Recetas guardadas <small>'+items.length+'</small></h2>'+
   '<p>Documentos clínicos asociados a este paciente.</p></header>'+
   '<div class="ph-prescription-history" id="phRxHistory">'+(card||'<p>No hay recetas guardadas para este paciente.</p>')+'</div></section>'+
   '<section class="ph-card ph-prescription-editor"><header><h2>Redactar receta</h2><p>Escribe medicamentos, dosis e indicaciones. Al guardar se genera el PDF en MySQL.</p></header>'+
   '<form id="phRxForm"><label for="phRxText">Contenido de la receta</label>'+
   '<textarea id="phRxText" name="texto" maxlength="12000" required placeholder="Indicaciones, dosis, duración y cuidados…"></textarea>'+
   '<div class="ph-history-form"><label>Nombre del profesional<input name="profesional" maxlength="160" autocomplete="off"></label>'+
   '<label>Cédula profesional<input name="cedula" maxlength="60" autocomplete="off"></label></div>'+
   '<small>El profesional debe revisar y firmar la prescripción antes de su uso. No se generan datos clínicos automáticamente.</small>'+
   '<div class="ph-rx-actions"><button type="reset">Limpiar</button><button class="ph-primary" type="submit">Guardar y generar PDF</button></div></form></section></div>'+
   '<div class="ph-prescription-preview" id="phRxPreview" hidden><section role="dialog" aria-modal="true" aria-label="Vista previa de receta">'+
   '<div class="preview-actions"><strong>Vista previa · Receta</strong><button type="button" id="phRxPrint">Imprimir</button><button type="button" id="phRxClose">Cerrar</button></div>'+
   '<iframe title="Vista previa PDF de receta"></iframe></section></div>';
  async function blobFor(id){
   const resp=await fetch(API_URL+'/recetas/'+id+'/pdf',{credentials:'same-origin'});
   if(!resp.ok)throw Error('No fue posible cargar el PDF de esta receta.');
   return URL.createObjectURL(await resp.blob());
  }
  function closePreview(){
   const modal=document.getElementById('phRxPreview');
   if(!modal)return;modal.hidden=true;modal.querySelector('iframe').src='about:blank';
   if(currentPdfUrl)URL.revokeObjectURL(currentPdfUrl);currentPdfUrl=null;
  }
  async function preview(id){
   const modal=document.getElementById('phRxPreview');
   closePreview();currentPdfUrl=await blobFor(id);
   modal.querySelector('iframe').src=currentPdfUrl;modal.hidden=false;
   document.getElementById('phRxClose').focus();
  }
  document.getElementById('phRxClose').onclick=closePreview;
  document.getElementById('phRxPreview').onclick=e=>{if(e.target.id==='phRxPreview')closePreview()};
  document.getElementById('phRxPrint').onclick=()=>document.querySelector('#phRxPreview iframe').contentWindow.print();
  document.getElementById('phRxHistory').onclick=async function(e){
   const b=e.target.closest('button');if(!b)return;
   try{
    if(b.dataset.rxView){await preview(b.dataset.rxView);return;}
    if(b.dataset.rxDownload){
     const url=await blobFor(b.dataset.rxDownload),a=document.createElement('a');
     a.href=url;a.download=(b.dataset.folio||'receta')+'.pdf';document.body.appendChild(a);a.click();a.remove();
     setTimeout(()=>URL.revokeObjectURL(url),1000);return;
    }
    if(b.dataset.rxDelete&&confirm('¿Eliminar la receta y el PDF de este expediente?')){
     await api('/recetas/'+b.dataset.rxDelete,{method:'DELETE'});
     notify('Receta eliminada.');await show(context);
    }
   }catch(err){notify(err.message,true);}
  };
  document.getElementById('phRxForm').onsubmit=async function(e){
   e.preventDefault();const form=e.currentTarget,b=form.querySelector('[type=submit]');
   b.disabled=true;b.textContent='Guardando…';
   try{
    const payload=Object.fromEntries(new FormData(form));
    const saved=await api('/recetas/pacientes/'+patientId,{method:'POST',body:JSON.stringify(payload)});
    notify('Receta guardada con folio '+saved.folio);
    await show(context);
    const first=document.querySelector('[data-rx-view="'+Number(saved.idReceta)+'"]');if(first)first.click();
   }catch(err){notify(err.message,true);b.disabled=false;b.textContent='Guardar y generar PDF';}
  };
 }
 window.SamanthaPrescriptions={render:show};
})();