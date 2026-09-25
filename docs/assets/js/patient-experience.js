(function () {
  'use strict';

  const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:3000/api';
  const content = document.querySelector('.content');

  if (!content) return;

  let patients = [];
  let total = 0;
  let searchTimer;
  let activePatient = null;
  let activeDrawerTab = 'citas';
  let attendanceItems = [];
  let attendanceRequest = 0;
  const todayMexico = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

  const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));

  function initials(name) {
    return String(name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  function formatDate(value) {
    if (!value) return '—';

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: value.includes?.(':') ? 'short' : undefined
    }).format(new Date(value));
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function dateParts(value) {
    if (!value) return { date: '—', time: '' };
    const date = new Date(value);
    return {
      date: new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date),
      time: new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
    };
  }

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.mensaje || data.detalle || 'No fue posible completar la operación.');
    return data;
  }

  function avatar(patient, large = false) {
    if (patient.fotoUrl) {
      return `<img class="px-avatar${large ? ' large' : ''}" src="${escapeHtml(patient.fotoUrl)}" alt="Foto de ${escapeHtml(patient.nombreCompleto)}">`;
    }

    return `<span class="px-avatar${large ? ' large' : ''}" aria-hidden="true">${initials(patient.nombreCompleto)}</span>`;
  }

  function showToast(message) {
    const toast = document.getElementById('toast');

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function renderTags(tags) {
    if (!tags?.length) return '<em class="px-tag active">Activo</em>';

    return tags.map((tag) =>
      `<em class="px-tag" style="background:${escapeHtml(tag.colorFondo)};color:${escapeHtml(tag.colorTexto)}">${escapeHtml(tag.nombre)}</em>`
    ).join('');
  }

  function renderRows() {
    const rows = document.getElementById('pxPatientRows');
    const count = document.getElementById('patientCount');
    const results = document.getElementById('pxResults');

    if (!rows) return;

    count.textContent = `${total} ${total === 1 ? 'paciente' : 'pacientes'}`;
    results.textContent = `${total} resultados`;

    if (!patients.length) {
      rows.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="px-empty">
              <h3>No se encontraron pacientes</h3>
              <p>Intenta con otro término de búsqueda o registra un paciente nuevo.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    rows.innerHTML = patients.map((patient) => `
      <tr tabindex="0" data-patient-id="${patient.idPaciente}" aria-label="Abrir ficha de ${escapeHtml(patient.nombreCompleto)}">
        <td>
          <div class="px-patient-cell">
            ${avatar(patient)}
            <span>
              <strong>${escapeHtml(patient.nombreCompleto)}</strong>
              <small>${patient.edad ?? 'Edad no registrada'}${patient.edad !== null ? ' años' : ''}</small>
              ${renderTags(patient.etiquetas)}
            </span>
          </div>
        </td>
        <td><strong>${formatDate(patient.ultimaCita)}</strong><small>Control clínico</small></td>
        <td><strong>${formatDate(patient.proximaCita)}</strong><small>${patient.proximaCita ? 'Cita programada' : 'Sin próxima cita'}</small></td>
        <td>${patient.tareasPendientes ? `<span class="px-check" aria-label="${patient.tareasPendientes} ${patient.tareasPendientes === 1 ? 'tarea pendiente' : 'tareas pendientes'}" title="${patient.tareasPendientes} ${patient.tareasPendientes === 1 ? 'tarea pendiente' : 'tareas pendientes'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5 2.8 19.2a1.1 1.1 0 0 0 1 1.6h16.4a1.1 1.1 0 0 0 1-1.6L12 3.5Z"/><path d="M12 9v5.5M12 17.5h.01"/></svg><span class="px-check-count" aria-hidden="true">${patient.tareasPendientes}</span></span>` : '—'}</td>
        <td>${patient.presupuestoPendiente ? `$${Number(patient.presupuestoPendiente).toLocaleString('es-MX')}` : '—'}</td>
        <td>${escapeHtml(patient.comoNosConocio || '—')}</td>
        <td>${escapeHtml(patient.notaGeneral || '—')}</td>
      </tr>
    `).join('');
  }

  async function loadPatients(buscar = '') {
    const rows = document.getElementById('pxPatientRows');

    try {
      rows.innerHTML = '<tr><td colspan="7">Cargando pacientes…</td></tr>';

      const response = await fetch(
        `${API_URL}/pacientes?buscar=${encodeURIComponent(buscar)}&pagina=1&limite=20`
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detalle = data.detalle ? ` ${data.detalle}` : '';
        throw new Error(`${data.mensaje || 'No fue posible cargar el directorio.'}${detalle}`);
      }

      patients = data.items || [];
      total = Number(data.total || 0);
      renderRows();
    } catch (error) {
      rows.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="px-empty">
              <h3>No fue posible cargar pacientes</h3>
              <p>${escapeHtml(error.message)}</p>
            </div>
          </td>
        </tr>`;
    }
  }

  function drawerTabs() {
    return `
      <nav class="px-drawer-tabs" role="tablist" aria-label="Información rápida del paciente">
        ${[['citas', 'Citas'], ['filiacion', 'Filiación'], ['presupuestos', 'Presupuestos'], ['tareas', 'Tareas']]
          .map(([id, label]) => `<button type="button" role="tab" data-px-tab="${id}" class="${activeDrawerTab === id ? 'active' : ''}">${label}</button>`)
          .join('')}
      </nav>
      <section class="px-drawer-panel" id="pxDrawerPanel" aria-live="polite"></section>`;
  }

  function emptyState(title, message, action = '') {
    return `<div class="px-tab-empty"><span class="px-empty-illustration" aria-hidden="true">⌕</span>
      <h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p>${action}</div>`;
  }

  function renderAppointments(items) {
    const rows = items.map((item) => {
      const parts = dateParts(item.inicioAt);
      return `<div class="px-tabular-row">
        <span><strong>${escapeHtml(parts.date)}</strong><small>${escapeHtml(parts.time)}</small></span>
        <span>${escapeHtml(item.doctor || 'Sin asignar')}</span>
        <span>${escapeHtml(item.motivo || 'Consulta')}</span>
        <span><em class="px-status ${String(item.estado).toLowerCase()}">${escapeHtml(String(item.estado || '').replaceAll('_', ' '))}</em></span>
        <span>${escapeHtml(item.comentario || '—')}</span>
      </div>`;
    }).join('');
    return `<div class="px-drawer-actions"><button class="px-primary" type="button" data-px-new="cita">＋ Nuevo</button></div>
      <div class="px-tabular px-appointments">
        <div class="px-tabular-head"><b>Fecha</b><b>Doctor</b><b>Motivo</b><b>Estado</b><b>Comentario</b></div>
        ${rows || `<div class="px-table-empty"><span>⌕</span>No se encontró ninguna cita</div>`}
      </div>`;
  }

  function renderAffiliation(data) {
    const sourceOptions = ['Recomendación', 'Google', 'Facebook', 'Instagram', 'WhatsApp', 'Otro'];
    return `<form class="px-affiliation" data-px-form="filiacion">
      <input type="hidden" name="nombres" value="${escapeHtml(data.nombres || '')}">
      <input type="hidden" name="apellidoPaterno" value="${escapeHtml(data.apellidoPaterno || '')}">
      <input type="hidden" name="apellidoMaterno" value="${escapeHtml(data.apellidoMaterno || '')}">
      <input type="hidden" name="fechaNacimiento" value="${escapeHtml(String(data.fechaNacimiento || '').slice(0, 10))}">
      <input type="hidden" name="sexo" value="${escapeHtml(data.sexo || '')}">
      <label>Teléfono:<input name="telefono" value="${escapeHtml(data.telefono || '')}" placeholder="Teléfono"></label>
      <label>E-mail:<input name="correo" type="email" value="${escapeHtml(data.correo || '')}" placeholder="correo@ejemplo.com"></label>
      <label>Fuente de captación:<select name="comoNosConocio"><option value="">Seleccione una opción</option>${sourceOptions.map((option) => `<option ${data.comoNosConocio === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      <label>Adicional:<input name="adicional" value="${escapeHtml(data.adicional || '')}" placeholder="Información adicional"></label>
      <label>Nº HC:<input value="${escapeHtml(data.numeroExpediente || '')}" readonly></label>
      <label>Grupo:<select name="grupo"><option value="">Seleccione un tipo</option>${['PARTICULAR', 'FAMILIAR', 'EMPRESA', 'ASEGURADORA'].map((option) => `<option ${data.grupo === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      <label>Línea de negocio:<select name="lineaNegocio"><option value="">Seleccione un tipo</option>${['ODONTOPEDIATRÍA', 'ORTODONCIA', 'ODONTOLOGÍA GENERAL'].map((option) => `<option ${data.lineaNegocio === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label>
      <button class="px-primary" type="submit">Guardar cambios</button>
    </form>`;
  }

  function renderBudgets(items) {
    const action = '<button class="px-primary" type="button" data-px-new="presupuesto">＋ Crear Presupuesto</button>';
    if (!items.length) return `<h3 class="px-panel-title">Presupuesto</h3>${emptyState('Sin presupuestos', 'Crea el primer presupuesto de este paciente.', action)}`;
    return `<div class="px-panel-heading"><h3>Presupuesto</h3>${action}</div>
      <div class="px-budget-grid">${items.map((item) => `<article class="px-budget-card">
        <div><strong>${escapeHtml(item.concepto)}</strong><small>${formatDate(item.creadoAt)}</small></div>
        <b>${formatMoney(item.total)}</b><em class="px-status ${String(item.estado).toLowerCase()}">${escapeHtml(item.estado)}</em>
        ${item.observaciones ? `<p>${escapeHtml(item.observaciones)}</p>` : ''}
      </article>`).join('')}</div>`;
  }

  function taskTable(items, automatic = false) {
    const columns = automatic
      ? ['Tipo de mensaje', 'Plantilla enviada', 'Enviado por', 'F. envío', 'Hora envío', 'Estado']
      : ['Nombre de la tarea', 'F. creación', 'Estado', 'Responsable', 'Descripción'];
    const rows = items.map((item) => {
      const parts = dateParts(automatic ? item.fechaEnvio : item.creadoAt);
      const values = automatic
        ? [item.nombre, item.plantilla || '—', item.responsable || 'Sistema', parts.date, parts.time, item.estado]
        : [item.nombre, parts.date, item.estado, item.responsable || '—', item.descripcion || '—'];
      return `<div class="px-task-row">${values.map((value, index) => index === 2 && !automatic
        ? `<button type="button" class="px-status-button" data-task-id="${item.idTarea}" data-task-status="${item.estado === 'COMPLETADA' ? 'PENDIENTE' : 'COMPLETADA'}">${escapeHtml(String(value).replaceAll('_', ' '))}</button>`
        : `<span>${escapeHtml(value)}</span>`).join('')}</div>`;
    }).join('');
    return `<div class="px-task-table ${automatic ? 'automatic' : ''}"><div class="px-task-head">${columns.map((column) => `<b>${column}</b>`).join('')}</div>
      ${rows || `<div class="px-table-empty"><span>⌕</span>No se encontró ninguna información</div>`}</div>`;
  }

  function renderTasks(items) {
    const manual = items.filter((item) => item.tipo !== 'AUTOMATICA');
    const automatic = items.filter((item) => item.tipo === 'AUTOMATICA');
    return `<div class="px-task-top"><h3>Manuales</h3><button class="px-primary" type="button" data-px-new="tarea">＋ Nueva tarea</button></div>
      ${taskTable(manual)}<section class="px-auto-section"><h3>Automáticas <span>⌃</span></h3>${taskTable(automatic, true)}</section>`;
  }

  async function loadDrawerTab(tab) {
    if (!activePatient) return;
    activeDrawerTab = tab;
    document.querySelectorAll('[data-px-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.pxTab === tab);
    });
    const panel = document.getElementById('pxDrawerPanel');
    panel.innerHTML = '<div class="px-loading">Cargando información…</div>';
    try {
      const data = await api(`/pacientes/${activePatient.idPaciente}/${tab}`);
      if (tab === 'citas') panel.innerHTML = renderAppointments(data.items || []);
      if (tab === 'filiacion') panel.innerHTML = renderAffiliation(data);
      if (tab === 'presupuestos') panel.innerHTML = renderBudgets(data.items || []);
      if (tab === 'tareas') panel.innerHTML = renderTasks(data.items || []);
    } catch (error) {
      panel.innerHTML = emptyState('No fue posible cargar la información', error.message);
    }
  }

  function quickModal(type) {
    const definitions = {
      cita: {
        title: 'Nueva cita', fields: `<label>Fecha y hora<input required name="inicioAt" type="datetime-local"></label><label>Doctor<input name="doctor" placeholder="Nombre del doctor"></label><label>Motivo<input required name="motivo" placeholder="Motivo de la cita"></label><label>Estado<select name="estado"><option value="POR_CONFIRMAR">Por confirmar</option><option value="PROGRAMADA">Programada</option><option value="CONFIRMADA">Confirmada</option></select></label><label class="wide">Comentario<textarea name="comentario" placeholder="Comentario opcional"></textarea></label>`
      },
      presupuesto: {
        title: 'Crear presupuesto', fields: `<label>Concepto<input required name="concepto" placeholder="Tratamiento o servicio"></label><label>Total<input required min="0" step="0.01" name="total" type="number" placeholder="0.00"></label><label>Estado<select name="estado"><option value="BORRADOR">Borrador</option><option value="ENVIADO">Enviado</option><option value="APROBADO">Aprobado</option></select></label><label class="wide">Observaciones<textarea name="observaciones" placeholder="Detalles del presupuesto"></textarea></label>`
      },
      tarea: {
        title: 'Nueva tarea manual', fields: `<label>Nombre de la tarea<input required name="nombre" placeholder="Seguimiento pendiente"></label><label>Responsable<input name="responsable" placeholder="Nombre del responsable"></label><label class="wide">Descripción<textarea name="descripcion" placeholder="Describe la tarea"></textarea></label>`
      }
    };
    const definition = definitions[type];
    document.getElementById('pxDrawer').insertAdjacentHTML('beforeend', `<div class="px-quick-modal" role="dialog" aria-modal="true"><form data-px-form="${type}"><button type="button" class="px-modal-close" data-px-close-modal>×</button><h3>${definition.title}</h3><div class="px-form-grid">${definition.fields}</div><div class="px-modal-actions"><button type="button" data-px-close-modal>Cancelar</button><button class="px-primary" type="submit">Guardar</button></div></form></div>`);
  }

  function openDrawer(patient) {
    const drawer = document.getElementById('pxDrawer');

    activePatient = patient;
    activeDrawerTab = 'citas';
    drawer.dataset.patientId = String(patient.idPaciente);
    document.getElementById('pxDrawerContent').innerHTML = `
      <header class="px-patient-header">
        <label class="px-avatar-edit" title="Cambiar foto de perfil">
          ${avatar(patient, true)}
          <span class="px-avatar-edit-icon" aria-hidden="true">📷</span>
          <span class="px-visually-hidden">Cambiar foto de perfil</span>
          <input id="pxPhotoInput" name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp">
        </label>
        <div>
          <div class="px-name-line">
            <h2>${escapeHtml(patient.nombreCompleto)}</h2>
            <a class="px-history-button" href="historial-paciente.html?id=${patient.idPaciente}" target="_blank" rel="noopener">Abrir historial ↗</a>
          </div>
          <p>${patient.edad ?? 'Edad no registrada'} años <i></i> ☎ ${escapeHtml(patient.telefono || 'Sin teléfono')}</p>
          <div>${renderTags(patient.etiquetas)}</div>
        </div>
        <small>Expediente: ${escapeHtml(patient.numeroExpediente || 'Pendiente')}</small>
      </header>

      <label class="px-note">
        Nota general
        <textarea id="pxGeneralNote" placeholder="Escribe aquí…">${escapeHtml(patient.notaGeneral || '')}</textarea>
      </label>
      ${drawerTabs()}`;

    const scrim = document.getElementById('pxDrawerScrim');

    drawer.classList.add('open');
    scrim.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('px-no-scroll');
    loadDrawerTab('citas');
  }

  function closeDrawer() {
    const drawer = document.getElementById('pxDrawer');
    const scrim = document.getElementById('pxDrawerScrim');

    drawer.classList.remove('open');
    scrim.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('px-no-scroll');
    activePatient = null;
  }

  const attendanceLabel = (status) => ({
    EN_SALA: 'Llegó', NO_ASISTIO: 'No asistió', FINALIZADA: 'Atendida',
    CONFIRMADA: 'Confirmada', POR_CONFIRMAR: 'Por confirmar', PROGRAMADA: 'Programada'
  }[status] || status);

  function renderAttendance() {
    const search = document.getElementById('pxAttendanceSearch').value.trim().toLocaleLowerCase('es-MX');
    const status = document.getElementById('pxAttendanceStatus').value;
    const items = attendanceItems.filter((item) => {
      const matchesSearch = !search || `${item.paciente} ${item.motivo || ''}`.toLocaleLowerCase('es-MX').includes(search);
      const matchesStatus = !status || (status === 'PENDIENTE'
        ? ['PROGRAMADA', 'CONFIRMADA', 'POR_CONFIRMAR'].includes(item.estado)
        : item.estado === status);
      return matchesSearch && matchesStatus;
    });
    const count = (states) => attendanceItems.filter((item) => states.includes(item.estado)).length;
    document.getElementById('pxAttendanceSummary').innerHTML = `
      <article><span>Citas del día</span><strong>${attendanceItems.length}</strong></article>
      <article><span>Pendientes</span><strong>${count(['PROGRAMADA', 'CONFIRMADA', 'POR_CONFIRMAR'])}</strong></article>
      <article><span>Llegaron o atendidas</span><strong>${count(['EN_SALA', 'FINALIZADA'])}</strong></article>
      <article><span>No asistieron</span><strong>${count(['NO_ASISTIO'])}</strong></article>`;
    document.getElementById('pxAttendanceCount').textContent = `${items.length} ${items.length === 1 ? 'cita' : 'citas'}`;
    const future = document.getElementById('pxAttendanceDate').value > todayMexico();
    document.getElementById('pxAttendanceRows').innerHTML = items.length ? items.map((item) => {
      const fixed = item.estado === 'FINALIZADA';
      const canMark = !future && !fixed;
      return `<tr>
        <td><strong>${escapeHtml(item.hora)}</strong><small>${escapeHtml(item.motivo || 'Consulta')}</small></td>
        <td><a class="px-attendance-patient" href="historial-paciente.html?id=${Number(item.idPaciente)}">${escapeHtml(item.paciente)}</a><small>${escapeHtml(item.doctor || 'Profesional por asignar')}</small></td>
        <td><span class="px-attendance-state ${escapeHtml(item.estado.toLowerCase())}">${escapeHtml(attendanceLabel(item.estado))}</span></td>
        <td><div class="px-attendance-actions">
          ${canMark && item.estado !== 'EN_SALA' ? `<button type="button" data-attendance-id="${Number(item.idCita)}" data-attendance-status="EN_SALA">Llegó</button>` : ''}
          ${canMark && item.estado !== 'NO_ASISTIO' ? `<button type="button" class="absent" data-attendance-id="${Number(item.idCita)}" data-attendance-status="NO_ASISTIO">No asistió</button>` : ''}
          ${canMark && ['EN_SALA', 'NO_ASISTIO'].includes(item.estado) ? `<button type="button" data-attendance-id="${Number(item.idCita)}" data-attendance-status="CONFIRMADA">Restablecer</button>` : ''}
          ${future ? '<small>Disponible el día de la cita</small>' : fixed ? '<small>Cita finalizada</small>' : ''}
        </div></td>
      </tr>`;
    }).join('') : '<tr><td colspan="4" class="px-attendance-empty">No hay citas para esta fecha y filtros.</td></tr>';
  }

  async function loadAttendance() {
    const fecha = document.getElementById('pxAttendanceDate').value;
    const request = ++attendanceRequest;
    const rows = document.getElementById('pxAttendanceRows');
    rows.innerHTML = '<tr><td colspan="4" class="px-attendance-empty">Consultando citas…</td></tr>';
    try {
      const data = await api(`/clinica/asistencias?fecha=${encodeURIComponent(fecha)}`);
      if (request !== attendanceRequest) return;
      attendanceItems = data.items || [];
      renderAttendance();
    } catch (error) {
      if (request !== attendanceRequest) return;
      attendanceItems = [];
      document.getElementById('pxAttendanceSummary').innerHTML = '';
      document.getElementById('pxAttendanceCount').textContent = 'Sin datos';
      rows.innerHTML = `<tr><td colspan="4" class="px-attendance-empty" role="alert">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  content.innerHTML = `
    <section class="px-page" aria-labelledby="patientTitle">
      <div class="px-section-tabs" role="tablist">
        <button class="active" type="button" data-px-view="patients" aria-selected="true">Mis pacientes</button>
        <button type="button" data-px-view="attendance" aria-selected="false">Asistencias</button>
      </div>

      <div id="pxPatientsView">
      <header class="px-toolbar">
        <div>
          <h1 id="patientTitle">Todos los pacientes</h1>
          <span id="patientCount">Cargando pacientes…</span>
        </div>

        <div class="px-toolbar-actions">
          <button class="px-primary" type="button" data-modal="patient">＋ Nuevo paciente</button>
          <label class="px-search">
            <span aria-hidden="true">⌕</span>
            <input id="pxSearch" type="search" placeholder="Nombre, teléfono o expediente…" aria-label="Buscar paciente">
          </label>
        </div>
      </header>

      <div class="px-table-shell">
        <table class="px-patient-table">
          <thead>
            <tr>
              <th>Paciente</th><th>Última cita</th><th>Próxima cita</th>
              <th>Tarea</th><th>Presupuesto</th><th>Fuente de captación</th><th>Comentario</th>
            </tr>
          </thead>
          <tbody id="pxPatientRows"></tbody>
        </table>
      </div>

      <footer class="px-pagination">
        <span id="pxResults">Cargando…</span>
        <button disabled>‹</button><button class="current">1</button><button disabled>›</button>
        <span>Mostrar <b>20</b> resultados por página</span>
      </footer>
      </div>

      <section class="px-attendance" id="pxAttendanceView" hidden aria-label="Asistencias de pacientes">
        <header class="px-attendance-header"><div><p>Agenda clínica · MySQL</p><h1>Asistencias</h1><span>Registra la llegada o la falta en la cita del paciente.</span></div>
          <div class="px-attendance-date"><button type="button" data-attendance-day="-1" aria-label="Día anterior">‹</button><label>Fecha <input type="date" id="pxAttendanceDate" value="${todayMexico()}"></label><button type="button" data-attendance-day="1" aria-label="Día siguiente">›</button><button type="button" id="pxAttendanceToday">Hoy</button></div>
        </header>
        <div class="px-attendance-summary" id="pxAttendanceSummary"></div>
        <div class="px-attendance-filters"><label>Buscar paciente o motivo<input type="search" id="pxAttendanceSearch" placeholder="Escribe un nombre o motivo"></label><div class="px-attendance-status-field"><span id="pxAttendanceStatusLabel">Estado</span><select id="pxAttendanceStatus" tabindex="-1" aria-hidden="true"><option value="">Todos</option><option value="PENDIENTE">Pendientes</option><option value="EN_SALA">Llegaron</option><option value="FINALIZADA">Atendidas</option><option value="NO_ASISTIO">No asistieron</option></select><button type="button" class="dc-role-trigger px-attendance-status-trigger" id="pxAttendanceStatusToggle" aria-labelledby="pxAttendanceStatusLabel pxAttendanceStatusSelected" aria-haspopup="listbox" aria-expanded="false" aria-controls="pxAttendanceStatusMenu"><span id="pxAttendanceStatusSelected">Todos</span><span class="dc-select-chevron" aria-hidden="true"></span></button><div class="dc-role-menu px-attendance-status-menu" id="pxAttendanceStatusMenu" role="listbox" aria-labelledby="pxAttendanceStatusLabel" hidden>${[['', 'Todos'], ['PENDIENTE', 'Pendientes'], ['EN_SALA', 'Llegaron'], ['FINALIZADA', 'Atendidas'], ['NO_ASISTIO', 'No asistieron']].map(([value, label]) => `<button type="button" role="option" data-attendance-filter="${value}" aria-selected="${value === ''}">${label}<span aria-hidden="true">${value === '' ? '✓' : ''}</span></button>`).join('')}</div></div><span id="pxAttendanceCount" role="status"></span></div>
        <div class="px-attendance-table"><table><thead><tr><th>Hora y motivo</th><th>Paciente y profesional</th><th>Estado</th><th>Registrar asistencia</th></tr></thead><tbody id="pxAttendanceRows"></tbody></table></div>
      </section>
    </section>

    <div class="px-drawer-scrim" id="pxDrawerScrim"></div>
    <aside class="px-drawer" id="pxDrawer" aria-hidden="true" aria-label="Ficha rápida del paciente">
      <button class="px-drawer-close" id="pxDrawerClose" aria-label="Cerrar ficha">×</button>
      <div id="pxDrawerContent"></div>
    </aside>`;

  document.querySelectorAll('[data-px-view]').forEach((button) => button.addEventListener('click', () => {
    const attendance = button.dataset.pxView === 'attendance';
    document.getElementById('pxPatientsView').hidden = attendance;
    document.getElementById('pxAttendanceView').hidden = !attendance;
    document.querySelectorAll('[data-px-view]').forEach((tab) => {
      const selected = tab === button;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    if (attendance) loadAttendance();
  }));

  document.getElementById('pxAttendanceDate').addEventListener('change', loadAttendance);
  document.getElementById('pxAttendanceToday').addEventListener('click', () => {
    document.getElementById('pxAttendanceDate').value = todayMexico();
    loadAttendance();
  });
  document.querySelectorAll('[data-attendance-day]').forEach((button) => button.addEventListener('click', () => {
    const picker = document.getElementById('pxAttendanceDate');
    const value = new Date(`${picker.value}T12:00:00`);
    value.setDate(value.getDate() + Number(button.dataset.attendanceDay));
    picker.value = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    loadAttendance();
  }));
  document.getElementById('pxAttendanceSearch').addEventListener('input', renderAttendance);
  document.getElementById('pxAttendanceStatus').addEventListener('change', renderAttendance);
  const statusToggle = document.getElementById('pxAttendanceStatusToggle');
  const statusMenu = document.getElementById('pxAttendanceStatusMenu');
  const closeStatusMenu = (restoreFocus = false) => {
    statusMenu.hidden = true;
    statusToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) statusToggle.focus();
  };
  statusToggle.addEventListener('click', () => {
    const opening = statusMenu.hidden;
    statusMenu.hidden = !opening;
    statusToggle.setAttribute('aria-expanded', String(opening));
    if (opening) statusMenu.querySelector('[aria-selected="true"]')?.focus();
  });
  statusMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-attendance-filter]');
    if (!option) return;
    const value = option.dataset.attendanceFilter;
    const filter = document.getElementById('pxAttendanceStatus');
    filter.value = value;
    document.getElementById('pxAttendanceStatusSelected').textContent = option.firstChild.textContent.trim();
    statusMenu.querySelectorAll('[data-attendance-filter]').forEach((item) => {
      const selected = item === option;
      item.setAttribute('aria-selected', String(selected));
      item.querySelector('span').textContent = selected ? '✓' : '';
    });
    closeStatusMenu(true);
    filter.dispatchEvent(new Event('change', { bubbles: true }));
  });
  statusMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); closeStatusMenu(true); return; }
    if (event.key === 'Tab') { closeStatusMenu(); return; }
    const options = [...statusMenu.querySelectorAll('[data-attendance-filter]')];
    const index = options.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length;
      options[next]?.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.px-attendance-status-field')) closeStatusMenu();
  });
  document.getElementById('pxAttendanceRows').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-attendance-id]');
    if (!button || button.disabled) return;
    const fecha = document.getElementById('pxAttendanceDate').value;
    button.disabled = true;
    try {
      await api(`/clinica/asistencias/${button.dataset.attendanceId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: button.dataset.attendanceStatus })
      });
      showToast('Asistencia guardada en la base de datos.');
      if (fecha === document.getElementById('pxAttendanceDate').value) await loadAttendance();
    } catch (error) {
      showToast(error.message);
      button.disabled = false;
    }
  });

  document.getElementById('pxPatientRows').addEventListener('click', (event) => {
    const row = event.target.closest('[data-patient-id]');

    if (!row) return;

    const patient = patients.find((item) => item.idPaciente === Number(row.dataset.patientId));
    if (patient) openDrawer(patient);
  });

  document.getElementById('pxPatientRows').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.target.closest('[data-patient-id]')?.click();
    }
  });

  document.getElementById('pxSearch').addEventListener('input', (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadPatients(event.target.value.trim()), 300);
  });

  document.getElementById('pxDrawerClose').addEventListener('click', closeDrawer);
  document.getElementById('pxDrawerScrim').addEventListener('click', closeDrawer);

  document.getElementById('pxDrawer').addEventListener('click', async (event) => {
    const tab = event.target.closest('[data-px-tab]');
    if (tab) {
      loadDrawerTab(tab.dataset.pxTab);
      return;
    }

    const createButton = event.target.closest('[data-px-new]');
    if (createButton) {
      quickModal(createButton.dataset.pxNew);
      return;
    }

    if (event.target.closest('[data-px-close-modal]') || (event.target.classList.contains('px-quick-modal'))) {
      event.target.closest('.px-quick-modal')?.remove();
      return;
    }

    const taskButton = event.target.closest('[data-task-id]');
    if (taskButton && activePatient) {
      try {
        await api(`/pacientes/${activePatient.idPaciente}/tareas/${taskButton.dataset.taskId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: taskButton.dataset.taskStatus })
        });
        showToast('Tarea actualizada correctamente.');
        await loadDrawerTab('tareas');
        await loadPatients(document.getElementById('pxSearch').value.trim());
      } catch (error) {
        showToast(error.message);
      }
    }
  });

  document.getElementById('pxDrawer').addEventListener('focusout', async (event) => {
    if (event.target.id !== 'pxGeneralNote' || !activePatient) return;
    const note = event.target.value.trim();
    if (note === String(activePatient.notaGeneral || '')) return;
    try {
      await api(`/pacientes/${activePatient.idPaciente}/resumen`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notaGeneral: note })
      });
      activePatient.notaGeneral = note;
      showToast('Nota general guardada.');
    } catch (error) {
      showToast(error.message);
    }
  });

  document.getElementById('pxDrawer').addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-px-form]');
    if (!form || !activePatient) return;
    event.preventDefault();
    const type = form.dataset.pxForm;
    const values = Object.fromEntries(new FormData(form).entries());
    const endpoints = {
      filiacion: { path: 'filiacion', method: 'PATCH', tab: 'filiacion' },
      cita: { path: 'citas', method: 'POST', tab: 'citas' },
      presupuesto: { path: 'presupuestos', method: 'POST', tab: 'presupuestos' },
      tarea: { path: 'tareas', method: 'POST', tab: 'tareas' }
    };
    const endpoint = endpoints[type];
    if (!endpoint) return;
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const result = await api(`/pacientes/${activePatient.idPaciente}/${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      form.closest('.px-quick-modal')?.remove();
      showToast(result.mensaje || 'Cambios guardados correctamente.');
      await loadDrawerTab(endpoint.tab);
      await loadPatients(document.getElementById('pxSearch').value.trim());
    } catch (error) {
      showToast(error.message);
      submitButton.disabled = false;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });

  // Captura el formulario global "Nuevo paciente" creado por clinic-app.js.
  document.addEventListener('submit', async (event) => {
    const form = event.target;

    if (form.id !== 'demoForm' || !form.querySelector('[name="firstName"]')) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const data = new FormData(form);
    const apellidos = String(data.get('lastName') || '').trim().split(/\s+/);

    const payload = {
      nombres: String(data.get('firstName') || '').trim(),
      apellidoPaterno: apellidos.shift() || '',
      apellidoMaterno: apellidos.join(' '),
      fechaNacimiento: data.get('birthDate') || null,
      telefono: String(data.get('guardianPhone') || '').trim(),
      notasAlerta: String(data.get('clinicalAlerts') || '').trim(),
      notaGeneral: `Tutor o familia: ${String(data.get('guardian') || '').trim()}`.trim()
    };

    try {
      const formData = new FormData();

      Object.entries(payload).forEach(([campo, valor]) => {
        if (valor !== null && valor !== undefined) {
          formData.append(campo, valor);
        }
      });

      const archivoFoto = form.querySelector('[name="profilePhoto"]')?.files?.[0];

      if (archivoFoto) {
        formData.append('profilePhoto', archivoFoto);
      }

      const response = await fetch(`${API_URL}/pacientes`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.mensaje || 'No fue posible registrar el paciente.');
      }

      document.getElementById('modalBackdrop')?.classList.remove('open');
      document.getElementById('modalBackdrop')?.setAttribute('aria-hidden', 'true');

      showToast(`Paciente creado: ${result.paciente.numeroExpediente}`);
      await loadPatients();
    } catch (error) {
      showToast(error.message);
    }
  }, true);

  document.querySelectorAll('[data-demo-toast]').forEach((button) => {
    button.addEventListener('click', () => showToast(button.dataset.demoToast));
  });
  document.addEventListener('change', async (event) => {
    if (event.target.id !== 'pxPhotoInput') return;

    const idPaciente = Number(document.getElementById('pxDrawer').dataset.patientId);
    const archivo = event.target.files?.[0];

    if (!archivo) return;

    if (!Number.isInteger(idPaciente) || idPaciente <= 0) {
      showToast('No fue posible identificar al paciente seleccionado.');
      return;
    }

    const formData = new FormData();
    formData.append('profilePhoto', archivo);

    try {
      showToast('Guardando foto…');

      const response = await fetch(`${API_URL}/pacientes/${idPaciente}`, {
        method: 'PATCH',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.mensaje || 'No fue posible actualizar la foto.');
      }

      const patient = patients.find((item) => item.idPaciente === idPaciente);

      if (patient) {
        patient.fotoUrl = result.fotoUrl;
        renderRows();
        openDrawer(patient);
      }

      showToast('Foto actualizada correctamente.');
    } catch (error) {
      showToast(error.message);
    }
  });
  loadPatients();
})();
