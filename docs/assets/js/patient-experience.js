(function () {
  'use strict';

  const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:3000/api';
  const content = document.querySelector('.content');

  if (!content) return;

  let patients = [];
  let total = 0;
  let searchTimer;

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
        <td>${patient.tareasPendientes ? `<span class="px-check">⚠ ${patient.tareasPendientes}</span>` : '—'}</td>
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

      if (!response.ok) {
        throw new Error('No fue posible cargar el directorio.');
      }

      const data = await response.json();
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

  function openDrawer(patient) {
    document.getElementById('pxDrawerContent').innerHTML = `
      <header class="px-patient-header">
        ${avatar(patient, true)}
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
        <textarea readonly>${escapeHtml(patient.notaGeneral || 'Sin nota general.')}</textarea>
      </label>

      <div class="px-empty">
        <h3>Ficha rápida</h3>
        <p>Los apartados de citas, filiación, presupuestos y tareas se conectarán en el siguiente paso.</p>
      </div>`;

    const drawer = document.getElementById('pxDrawer');
    const scrim = document.getElementById('pxDrawerScrim');

    drawer.classList.add('open');
    scrim.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('px-no-scroll');
  }

  function closeDrawer() {
    const drawer = document.getElementById('pxDrawer');
    const scrim = document.getElementById('pxDrawerScrim');

    drawer.classList.remove('open');
    scrim.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('px-no-scroll');
  }

  content.innerHTML = `
    <section class="px-page" aria-labelledby="patientTitle">
      <div class="px-section-tabs" role="tablist">
        <button class="active" type="button">Mis pacientes</button>
        <button type="button" data-demo-toast="Asistencias estará conectada con la agenda clínica.">Asistencias</button>
      </div>

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
    </section>

    <div class="px-drawer-scrim" id="pxDrawerScrim"></div>
    <aside class="px-drawer" id="pxDrawer" aria-hidden="true" aria-label="Ficha rápida del paciente">
      <button class="px-drawer-close" id="pxDrawerClose" aria-label="Cerrar ficha">×</button>
      <div id="pxDrawerContent"></div>
    </aside>`;

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
      const response = await fetch(`${API_URL}/pacientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

  loadPatients();
})();