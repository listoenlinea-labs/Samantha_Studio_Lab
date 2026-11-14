(function(){
 'use strict';
 const apiBase=window.APP_CONFIG?.API_URL||location.origin+'/api';
 const $=id=>document.getElementById(id);
 const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[char]));
 async function api(path,options={}){
  const r=await fetch(apiBase+path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.ok===false)throw Error(data.mensaje||'No se pudo conectar con recordatorios.');
  return data;
 }
 function notify(message,error=false){const el=$('remindersNotice');el.hidden=false;el.textContent=message;el.classList.toggle('error',error);el.scrollIntoView({block:'nearest',behavior:'smooth'});}
 function setChecks(name,values){
  document.querySelectorAll('[name="'+name+'"]').forEach(input=>{input.checked=values.includes(Number(input.value))});
 }
 function getChecks(name){return [...document.querySelectorAll('[name="'+name+'"]:checked')].map(el=>Number(el.value));}
 async function config(){
  try{
   const {data}=await api('/recordatorios/configuracion'),form=$('reminderConfigForm');
   for(const key of ['nombreConsultorio','direccionConsultorio','horaEnvio'])form.elements[key].value=data[key]||'';
   form.elements.correoHabilitado.checked=data.correoHabilitado;
   form.elements.whatsappHabilitado.checked=data.whatsappHabilitado;
   setChecks('days',data.diasAntes||[]);setChecks('hours',data.horasAntes||[]);
   const p=data.proveedores||{};
   $('reminderProviders').innerHTML=[
    ['Automatización del servidor',p.enabled],['Correo SMTP',p.smtp],['WhatsApp Business Meta',p.whatsapp]
   ].map(([name,ready])=>'<div><strong>'+esc(name)+'</strong><span class="'+(ready?'ready':'off')+'">'+(ready?'Configurado':'Sin activar o configurar')+'</span></div>').join('');
  }catch(e){notify(e.message,true)}
 }
 async function log(){
  try{
   const {items}=await api('/recordatorios/envios');
   $('reminderLogRows').innerHTML=items.length?items.map(x=>'<tr><td>'+esc(x.paciente)+'</td><td>'+esc(x.fechaCita)+'</td><td>'+esc(x.canal)+'</td><td>'+esc(x.ventana)+'</td><td><span class="ph-log-'+String(x.estado).toLowerCase()+'">'+esc(x.estado)+'</span></td><td>'+esc(x.creadoAt)+'</td></tr>').join(''):'<tr><td colspan="6">Todavía no se han enviado recordatorios.</td></tr>';
  }catch(e){$('reminderLogRows').innerHTML='<tr><td colspan="6">'+esc(e.message)+'</td></tr>'}
 }
 $('reminderConfigForm').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget,b=form.querySelector('[type=submit]');
  const diasAntes=getChecks('days'),horasAntes=getChecks('hours');
  if(!diasAntes.length||!horasAntes.length){notify('Selecciona al menos un periodo en días y otro en horas.',true);return;}
  const body={nombreConsultorio:form.elements.nombreConsultorio.value,direccionConsultorio:form.elements.direccionConsultorio.value,
   horaEnvio:Number(form.elements.horaEnvio.value),diasAntes,horasAntes,
   correoHabilitado:form.elements.correoHabilitado.checked,whatsappHabilitado:form.elements.whatsappHabilitado.checked};
  b.disabled=true;
  try{const result=await api('/recordatorios/configuracion',{method:'PATCH',body:JSON.stringify(body)});notify(result.mensaje);await config()}
  catch(e){notify(e.message,true)}finally{b.disabled=false}
 });
 $('refreshReminderLog').onclick=log;
 config();log();
})();