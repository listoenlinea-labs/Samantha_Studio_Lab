/* Alta real de citas Samantha: busca pacientes de MySQL y crea nuevos expedientes.
 * El doctor se guarda en citas.doctor (campo existente). */
(function(root){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
 let request=0,timer=null;
 const find=(form,id)=>form.querySelector('#'+id);
 async function read(response){
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok===false)throw Error(data.mensaje||'Error HTTP '+response.status+' al consultar MySQL.');
  return data;
 }
 async function listPatients(form,apiBase,searchTerm){
  const id=++request;
  const target=find(form,'appointmentPatientMatches');
  if(!target)return;
  target.innerHTML='<p>Buscando en MySQL…</p>';
  try{
   const query=new URLSearchParams({buscar:searchTerm,pagina:'1',limite:'20'});
   const data=await read(await fetch(apiBase+'/pacientes?'+query,{headers:{Accept:'application/json'},credentials:'same-origin'}));
   if(id!==request||!form.isConnected)return;
   const rows=Array.isArray(data.items)?data.items:[];
   target.innerHTML=(rows.length?rows.map(p=>
     '<button type="button" class="ssl-appointment-match" data-patient-id="'+Number(p.idPaciente)+'" data-patient-name="'+esc(p.nombreCompleto)+'">'+
     '<strong>'+esc(p.nombreCompleto)+'</strong><small>'+esc([p.numeroExpediente,p.telefono].filter(Boolean).join(' · '))+'</small></button>'
   ).join(''):'<p class="ssl-appointment-no-matches">No hay coincidencias.</p>')+
   '<button type="button" class="ssl-appointment-new" data-create-patient>＋ Registrar paciente nuevo</button>';
  }catch(e){
   if(id!==request||!form.isConnected)return;
   target.textContent='No fue posible consultar pacientes: '+e.message;
  }
 }
 function setup({form,apiBase}){
  if(!form||form.dataset.appointmentBound)return;
  form.dataset.appointmentBound='1';form.dataset.flow='appointment';form.dataset.apiBase=apiBase;
  const patient=find(form,'appointmentPatientName');
  const hidden=find(form,'appointmentPatientId');
  const results=find(form,'appointmentPatientMatches');
  const newFields=find(form,'appointmentNewPatientFields');
  const note=find(form,'appointmentPatientNotice');
  const setNotice=message=>{if(note)note.textContent=message};
  const clearSelection=()=>{hidden.value='';patient.setCustomValidity('');setNotice('Selecciona un paciente del listado o registra uno nuevo.')};
  patient.addEventListener('input',()=>{
   clearSelection();newFields.hidden=true;
   clearTimeout(timer);
   if(patient.value.trim().length<2){results.textContent='Escribe al menos dos letras para buscar.';return}
   timer=setTimeout(()=>listPatients(form,apiBase,patient.value.trim()),230);
  });
  results.addEventListener('click',event=>{
   const row=event.target.closest('[data-patient-id]');
   const add=event.target.closest('[data-create-patient]');
   if(row){
    hidden.value=row.dataset.patientId;
    patient.value=row.dataset.patientName;
    newFields.hidden=true;
    results.replaceChildren();
    setNotice('Paciente seleccionado. La cita quedará vinculada a su expediente.');
   }else if(add){
    hidden.value='';
    results.replaceChildren();
    newFields.hidden=false;
    const name=find(form,'appointmentNewGivenNames');
    name.value=patient.value.trim();
    name.focus();
    setNotice('Completa los datos mínimos para crear el expediente y luego guardar la cita.');
   }
  });
  const doctor=find(form,'appointmentDoctor');
  if(doctor){
   fetch(apiBase+'/clinica/doctores',{credentials:'same-origin'})
    .then(read).then(data=>{
     if(!form.isConnected)return;
     const datalist=find(form,'appointmentDoctorSuggestions');
     if(datalist)datalist.innerHTML=(data.doctores||[]).map(name=>'<option value="'+esc(name)+'"></option>').join('');
    }).catch(()=>{}); // Se puede escribir un doctor aunque todavía no existan citas previas.
  }
  results.textContent='Escribe al menos dos letras para buscar.';
 }
 async function save({form,apiBase}){
  const fields=Object.fromEntries(new FormData(form));
  const patientId=Number(fields.idPaciente);
  const firstName=String(fields.nuevoNombre||'').trim();
  const lastName=String(fields.nuevoApellido||'').trim();
  const newPatient=!find(form,'appointmentNewPatientFields').hidden;
  if(!patientId&&!newPatient)throw Error('Selecciona un paciente de los resultados o pulsa Registrar paciente nuevo.');
  if(newPatient&&!firstName)throw Error('Escribe el nombre del paciente nuevo.');
  if(!String(fields.doctor||'').trim())throw Error('Selecciona o escribe el doctor responsable de la cita.');
  if(!fields.date||!fields.time)throw Error('Selecciona fecha y hora para la cita.');
  let id=patientId;
  if(newPatient){
   const person=new FormData();
   person.set('nombres',firstName);
   person.set('apellidoPaterno',lastName);
   person.set('telefono',String(fields.nuevoTelefono||'').trim());
   person.set('correo',String(fields.nuevoCorreo||'').trim());
   const created=await read(await fetch(apiBase+'/pacientes',{method:'POST',body:person,credentials:'same-origin'}));
   id=Number(created.paciente?.idPaciente);
   if(!Number.isSafeInteger(id)||id<1)throw Error('El servidor no devolvió el identificador del paciente creado.');
   // Si la cita falla, reutilizar este paciente y NO crearlo otra vez al reintentar.
   find(form,'appointmentPatientId').value=String(id);
   find(form,'appointmentPatientName').value=[firstName,lastName].filter(Boolean).join(' ');
   find(form,'appointmentNewPatientFields').hidden=true;
   find(form,'appointmentPatientNotice').textContent='Paciente creado correctamente. Guardando la cita…';
  }
  const body={
   idPaciente:id,fecha:String(fields.date||''),hora:String(fields.time||''),
   tratamiento:String(fields.treatment||''),duracionMinutos:Number(fields.duration),
   doctor:String(fields.doctor||'').trim(),tipoCita:String(fields.appointmentType||'general'),
   silla:String(fields.chair||''),notaRoja:String(fields.notes||'').trim()
  };
  const response=await fetch(apiBase+'/clinica/citas',{
   method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
   body:JSON.stringify(body)
  });
  return read(response);
 }
 root.SamanthaAppointmentFlow={setup,save};
})(window);
