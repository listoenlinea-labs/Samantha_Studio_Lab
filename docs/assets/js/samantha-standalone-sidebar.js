/* Navegación persistente para páginas independientes del shell (Recordatorios).
   Mantiene el mismo menú lavanda sin modificar formularios ni llamadas API. */
(function(){
 'use strict';
 if(!document.body.classList.contains('recordatorios-body'))return;
 const links=[
  ['index.html','Inicio'],['agenda.html','Agenda'],['pacientes.html','Pacientes'],
  ['operacion.html','Operación clínica'],['tratamientos.html','Tratamientos'],
  ['seguimientos.html','Seguimientos'],['radiografias.html','Radiografías'],
  ['recordatorios.html','Recordatorios'],['finanzas.html','Finanzas'],
  ['reportes.html','Reportes'],['configuracion.html','Configuración'],['inventario.html','Inventario']
 ];
 const current=location.pathname.split('/').pop();
 const aside=document.createElement('aside');
 aside.className='ssl-standalone-sidebar';
 aside.id='sslStandaloneSidebar';
 aside.setAttribute('aria-label','Navegación principal de Samantha');
 const logo=document.createElement('a');logo.className='ssl-standalone-brand';logo.href='index.html';
 const img=document.createElement('img');img.src='assets/img/logo-ssl.svg';img.alt='';
 const label=document.createElement('span');label.textContent="samantha's studio lab";
 logo.append(img,label);aside.append(logo);
 const nav=document.createElement('nav');nav.setAttribute('aria-label','Secciones del consultorio');
 for(const [url,title] of links){
   const a=document.createElement('a');a.href=url;a.textContent=title;
   if(url===current){a.classList.add('active');a.setAttribute('aria-current','page')}
   nav.append(a);
 }
 aside.append(nav);
 const toggle=document.createElement('button');
 toggle.type='button';toggle.id='sslStandaloneToggle';toggle.className='ssl-standalone-toggle';
 toggle.setAttribute('aria-controls',aside.id);
 toggle.textContent='‹';
 const scrim=document.createElement('button');scrim.type='button';
 scrim.className='ssl-standalone-scrim';scrim.setAttribute('aria-label','Cerrar menú');
 document.body.prepend(scrim,aside,toggle);
 const mobile=window.matchMedia('(max-width:760px)');
 try{document.body.classList.toggle('ssl-side-hidden',localStorage.getItem('ssl-sidebar-collapsed')==='true'&&!mobile.matches)}catch(_){}
 function refresh(){
  const expanded=mobile.matches?document.body.classList.contains('ssl-mobile-open'):!document.body.classList.contains('ssl-side-hidden');
  toggle.setAttribute('aria-expanded',String(expanded));
  toggle.setAttribute('aria-label',expanded?'Ocultar barra lateral':'Mostrar barra lateral');
  toggle.textContent=mobile.matches?'☰':expanded?'‹':'›';
 }
 toggle.addEventListener('click',()=>{
  if(mobile.matches)document.body.classList.toggle('ssl-mobile-open');
  else{
   const hidden=document.body.classList.toggle('ssl-side-hidden');
   try{localStorage.setItem('ssl-sidebar-collapsed',String(hidden))}catch(_){}
  }
  refresh();
 });
 scrim.addEventListener('click',()=>{document.body.classList.remove('ssl-mobile-open');refresh()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('ssl-mobile-open');refresh()}});
 mobile.addEventListener('change',()=>{document.body.classList.remove('ssl-mobile-open');refresh()});
 refresh();
})();