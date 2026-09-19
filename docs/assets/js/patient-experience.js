(function () {
  'use strict';

  const patients = [
    { id: 1, name: 'Paciente demo A', initials: 'PA', age: 8, phone: '33 1234 5678', created: '02 sep 2026', next: '20 sep 2026 · 11:00', last: '02 sep 2026', tag: 'Activo', tone: 'active', source: 'Recomendación familiar' },
    { id: 2, name: 'Paciente demo B', initials: 'PB', age: 11, phone: '33 2468 1357', created: '04 sep 2026', next: '21 sep 2026 · 16:00', last: '11 sep 2026', tag: 'VIP', tone: 'vip', source: 'Paciente existente' },
    { id: 3, name: 'Paciente demo C', initials: 'PC', age: 5, phone: '33 9876 4321', created: '09 sep 2026', next: 'Sin próxima cita', last: '09 sep 2026', tag: 'Nuevo', tone: 'new', source: 'Redes sociales' },
    { id: 4, name: 'Paciente demo D', initials: 'PD', age: 13, phone: '33 5555 0182', created: '12 sep 2026', next: '24 sep 2026 · 10:30', last: '12 sep 2026', tag: 'Seguimiento', tone: 'follow', source: 'Campaña escolar' },
  ];

  const content = document.querySelector('.content');
  if (!content) return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const avatar = (patient, large = false) => patient.id === 1
    ? `<img class="px-avatar${large ? ' large' : ''}" src="assets/img/patient-demo.svg" alt="Foto de ${escapeHtml(patient.name)}">`
    : `<span class="px-avatar${large ? ' large' : ''} px-avatar-${patient.id}" aria-hidden="true">${patient.initials}</span>`;

  content.innerHTML = `
    <section class="px-page" aria-labelledby="patientTitle">
      <div class="px-section-tabs" role="tablist">
        <button class="active" type="button">Mis pacientes</button>
        <button type="button" data-demo-toast="Asistencias estará conectada con la agenda clínica.">Asistencias</button>
      </div>
      <header class="px-toolbar">
        <div><h1 id="patientTitle">Todos los pacientes</h1><span id="patientCount">${patients.length} pacientes</span></div>
        <div class="px-toolbar-actions">
          <button class="px-primary" type="button" data-modal="patient">＋ Nuevo paciente</button>
          <label class="px-search"><span aria-hidden="true">⌕</span><input id="pxSearch" type="search" placeholder="Nombre, tutor, teléfono..." aria-label="Buscar paciente"></label>
        </div>
      </header>
      <div class="px-table-shell">
        <table class="px-patient-table">
          <thead><tr><th>Paciente</th><th>Última cita</th><th>Próxima cita</th><th>Tarea</th><th>Presupuesto</th><th>Fuente de captación</th><th>Comentario</th></tr></thead>
          <tbody id="pxPatientRows">${patients.map((patient) => `
            <tr tabindex="0" data-patient-id="${patient.id}" aria-label="Abrir ficha de ${escapeHtml(patient.name)}">
              <td><div class="px-patient-cell">${avatar(patient)}<span><strong>${escapeHtml(patient.name)}</strong><small>${patient.age} años</small><em class="px-tag ${patient.tone}">${patient.tag}</em></span></div></td>
              <td><strong>${patient.last}</strong><small>Control clínico</small></td>
              <td><strong>${patient.next}</strong><small>${patient.id === 3 ? 'Programar seguimiento' : 'Odontopediatría'}</small></td>
              <td><span class="px-check">✓</span></td><td>—</td><td>${patient.source}</td><td>—</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      <footer class="px-pagination"><span>${patients.length} resultados</span><button disabled>‹</button><button class="current">1</button><button disabled>›</button><span>Mostrar <b>20</b> resultados por página</span></footer>
    </section>
    <div class="px-drawer-scrim" id="pxDrawerScrim"></div>
    <aside class="px-drawer" id="pxDrawer" aria-hidden="true" aria-label="Ficha rápida del paciente">
      <button class="px-drawer-close" id="pxDrawerClose" aria-label="Cerrar ficha">×</button>
      <div id="pxDrawerContent"></div>
    </aside>`;

  const drawer = document.getElementById('pxDrawer');
  const scrim = document.getElementById('pxDrawerScrim');

  function appointments(patient) {
    return `<div class="px-drawer-actions"><button class="px-primary" data-quick-action="Nueva cita">＋ Nuevo</button></div>
      <div class="px-mini-table"><div class="head"><b>Fecha</b><b>Doctor</b><b>Motivo</b><b>Estado</b><b>Comentario</b></div>
      <div class="row"><span>${patient.next.replace(' · ', '<br>')}</span><span>Dra. Samantha</span><span>Control preventivo</span><span>Por confirmar</span><span>—</span></div>
      <div class="row"><span>${patient.last}<br>10:00</span><span>Dra. Samantha</span><span>Valoración inicial</span><span class="positive">Finalizada</span><span>Buena evolución</span></div></div>`;
  }

  function affiliation(patient) {
    return `<form class="px-affiliation" id="pxAffiliation"><label>Teléfono <input value="${patient.phone}"></label><label>E-mail <input type="email" value="tutor.demo@ejemplo.com"></label><label>Fuente de captación <select><option>${patient.source}</option><option>Redes sociales</option><option>Recomendación</option></select></label><label>Adicional <input value="Tutor: Familia demo"></label><label>N.º HC <input value="SSL-${String(patient.id).padStart(4, '0')}"></label><label>Grupo <select><option>Odontopediatría</option><option>Ortodoncia</option></select></label><button class="px-primary" type="submit">Guardar cambios</button></form>`;
  }

  function budgets() {
    return `<div class="px-empty"><span class="px-empty-icon">◔</span><h3>Presupuestos</h3><p>Aún no hay presupuestos registrados para este paciente.</p><button class="px-primary" data-quick-action="Crear presupuesto">＋ Crear presupuesto</button></div>`;
  }

  function tasks() {
    return `<section class="px-task-section"><h3>Manuales</h3><div class="px-mini-table"><div class="head"><b>Nombre de la tarea</b><b>F. creación</b><b>Estado</b><b>Responsable</b><b>Descripción</b></div><div class="px-empty-row">No se encontró ninguna información</div></div><h3>Automáticas</h3><div class="px-mini-table"><div class="head"><b>Tipo de mensaje</b><b>Plantilla enviada</b><b>Enviado por</b><b>F. envío</b><b>Estado</b></div><div class="px-empty-row">No se encontró ninguna información</div></div></section>`;
  }

  function openDrawer(patient) {
    document.getElementById('pxDrawerContent').innerHTML = `
      <header class="px-patient-header">${avatar(patient, true)}<div><div class="px-name-line"><h2>${escapeHtml(patient.name)}</h2><a class="px-history-button" href="historial-paciente.html?id=${patient.id}" target="_blank" rel="noopener">Abrir historial ↗</a></div><p>${patient.age} años <i></i> ☎ ${patient.phone}</p><button class="px-add-tags" id="pxAddTags">⊕ Agregar</button><div class="px-tags-menu" id="pxTagsMenu" hidden><span class="new">Nuevo</span><span class="vip">VIP</span><span class="late">Impuntual</span><span class="loyal">Fidelizado</span><hr><small>Crea y gestiona etiquetas desde configuración.</small></div></div><small>Creado el ${patient.created}</small></header>
      <label class="px-note">Nota general<textarea placeholder="Escribe aquí..."></textarea></label>
      <nav class="px-drawer-tabs" role="tablist">${['Citas','Filiación','Presupuestos','Tareas'].map((tab, index) => `<button class="${index === 0 ? 'active' : ''}" data-drawer-tab="${tab.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}">${tab}</button>`).join('')}</nav>
      <div class="px-drawer-panel" id="pxDrawerPanel">${appointments(patient)}</div>`;
    drawer.dataset.patientId = patient.id;
    drawer.classList.add('open'); scrim.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('px-no-scroll');
  }

  function closeDrawer() { drawer.classList.remove('open'); scrim.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('px-no-scroll'); }

  document.getElementById('pxPatientRows').addEventListener('click', (event) => { const row = event.target.closest('[data-patient-id]'); if (row) openDrawer(patients.find((p) => p.id === Number(row.dataset.patientId))); });
  document.getElementById('pxPatientRows').addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.target.click(); } });
  document.getElementById('pxDrawerClose').addEventListener('click', closeDrawer); scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });
  document.getElementById('pxSearch').addEventListener('input', (event) => { const query = event.target.value.trim().toLowerCase(); let visible = 0; document.querySelectorAll('#pxPatientRows tr').forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(query); if (!row.hidden) visible += 1; }); document.getElementById('patientCount').textContent = `${visible} pacientes`; });
  drawer.addEventListener('click', (event) => {
    if (event.target.closest('#pxAddTags')) document.getElementById('pxTagsMenu').hidden = !document.getElementById('pxTagsMenu').hidden;
    const tab = event.target.closest('[data-drawer-tab]');
    if (tab) { drawer.querySelectorAll('[data-drawer-tab]').forEach((item) => item.classList.toggle('active', item === tab)); const patient = patients.find((p) => p.id === Number(drawer.dataset.patientId)); const views = { citas: appointments(patient), filiacion: affiliation(patient), presupuestos: budgets(), tareas: tasks() }; document.getElementById('pxDrawerPanel').innerHTML = views[tab.dataset.drawerTab]; }
    const action = event.target.closest('[data-quick-action]'); if (action) notify(`${action.dataset.quickAction}: demostración preparada para conectar al backend.`);
  });
  drawer.addEventListener('submit', (event) => { if (event.target.id === 'pxAffiliation') { event.preventDefault(); notify('Datos de filiación guardados en la demostración.'); } });

  function notify(message) { const toast = document.getElementById('toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
  document.querySelectorAll('[data-demo-toast]').forEach((button) => button.addEventListener('click', () => notify(button.dataset.demoToast)));
})();
