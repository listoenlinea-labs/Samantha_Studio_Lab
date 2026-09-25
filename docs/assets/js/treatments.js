(function () {
  'use strict';

  if (document.body.dataset.page !== 'tratamientos') return;

  const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:3000/api';
  const money = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  });
  let treatments = [];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.mensaje || data.detalle || 'No fue posible completar la operación.');
    }

    return data;
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function setConnection(tone, title, detail) {
    const connection = document.getElementById('treatmentConnection');
    if (!connection) return;
    connection.className = `callout treatment-connection ${tone}`;
    connection.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span>`;
  }

  function durationLabel(minutes) {
    if (!minutes) return 'Por definir';
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (!hours) return `${remaining} min`;
    return remaining ? `${hours} h ${remaining} min` : `${hours} h`;
  }

  function renderRows() {
    const table = document.getElementById('treatmentTable');
    const count = document.getElementById('treatmentCount');
    const heroCount = document.getElementById('treatmentHeroCount');
    if (!table) return;

    count.textContent = `${treatments.length} ${treatments.length === 1 ? 'registro' : 'registros'}`;
    heroCount.textContent = `${treatments.length} tratamientos en MySQL`;

    if (!treatments.length) {
      table.innerHTML = '<tr><td colspan="7" class="treatment-empty">La tabla aún no contiene tratamientos.</td></tr>';
      return;
    }

    table.innerHTML = treatments.map((treatment) => `
      <tr data-search-row data-status="${treatment.activo ? 'active' : 'inactive'}">
        <td><span class="table-title">${escapeHtml(treatment.nombre)}</span><span class="table-sub">${escapeHtml(treatment.categoria)}${treatment.descripcion ? ` · ${escapeHtml(treatment.descripcion)}` : ''}</span></td>
        <td>${durationLabel(treatment.duracionMinutos)}</td>
        <td>${treatment.sesionesSugeridas || 1}</td>
        <td>${money.format(treatment.costoCalculado || 0)}</td>
        <td>${money.format(treatment.precioVenta || 0)}</td>
        <td><span class="status ${treatment.activo ? 'success' : 'warning'}"><span class="dot"></span>${treatment.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td><button class="button soft" type="button" data-edit-treatment="${treatment.idTratamiento}">Editar</button></td>
      </tr>
    `).join('');
    applyFilters();
  }

  function fillCalculator() {
    const select = document.getElementById('calcTreatment');
    if (!select) return;
    const active = treatments.filter((treatment) => treatment.activo);
    select.innerHTML = active.length
      ? active.map((treatment) => `<option value="${treatment.idTratamiento}">${escapeHtml(treatment.nombre)}</option>`).join('')
      : '<option value="">Sin tratamientos activos</option>';
    syncSelectedTreatment();
  }

  function syncSelectedTreatment() {
    const selectedId = Number(document.getElementById('calcTreatment')?.value);
    const treatment = treatments.find((item) => item.idTratamiento === selectedId);
    if (!treatment) return;

    const hoursInput = document.getElementById('calcHours');
    const materialsInput = document.getElementById('calcMaterials');
    const hourly = Number(document.getElementById('calcHourly')?.value || 0);
    const hours = treatment.duracionMinutos ? treatment.duracionMinutos / 60 : 0;
    const remainingCost = Math.max(0, Number(treatment.costoCalculado || 0) - (hours * hourly));

    if (hoursInput) hoursInput.value = hours || '';
    if (materialsInput) materialsInput.value = remainingCost.toFixed(2);
    const currentPrice = document.getElementById('currentTreatmentPrice');
    if (currentPrice) currentPrice.textContent = money.format(treatment.precioVenta || 0);
    document.getElementById('calcHours')?.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyFilters() {
    const query = document.getElementById('treatmentSearch')?.value.trim().toLowerCase() || '';
    const status = document.getElementById('treatmentStatusFilter')?.value || '';

    document.querySelectorAll('#treatmentTable [data-search-row]').forEach((row) => {
      const matchesText = !query || row.textContent.toLowerCase().includes(query);
      const matchesStatus = !status || row.dataset.status === status;
      row.hidden = !(matchesText && matchesStatus);
    });
  }

  function treatmentForm(treatment = null) {
    const value = (field) => escapeHtml(treatment?.[field] ?? '');
    return `
      <div class="modal-head">
        <div><h2>${treatment ? 'Editar tratamiento' : 'Nuevo tratamiento'}</h2><p class="modal-subtitle">Los cambios se guardarán en catalogo_tratamientos.</p></div>
        <button class="icon-button" type="button" data-close-modal aria-label="Cerrar">×</button>
      </div>
      <form id="treatmentForm" class="treatment-form" data-treatment-id="${treatment?.idTratamiento || ''}">
        <div class="form-grid">
          <div class="field"><label>Nombre</label><input class="input" name="nombre" maxlength="150" required value="${value('nombre')}"></div>
          <div class="field"><label>Categoría</label><input class="input" name="categoria" maxlength="100" required value="${value('categoria')}"></div>
          <div class="field wide"><label>Descripción</label><textarea class="textarea" name="descripcion">${value('descripcion')}</textarea></div>
          <div class="field"><label>Duración (minutos)</label><input class="input" name="duracionMinutos" type="number" min="1" step="1" value="${value('duracionMinutos')}"></div>
          <div class="field"><label>Sesiones sugeridas</label><input class="input" name="sesionesSugeridas" type="number" min="1" step="1" required value="${treatment?.sesionesSugeridas || 1}"></div>
          <div class="field"><label>Costo calculado</label><input class="input" name="costoCalculado" type="number" min="0" step="0.01" required value="${treatment?.costoCalculado ?? 0}"></div>
          <div class="field"><label>Precio de venta</label><input class="input" name="precioVenta" type="number" min="0" step="0.01" required value="${treatment?.precioVenta ?? 0}"></div>
          <div class="field"><label>Estado</label><select class="select" name="activo"><option value="1" ${treatment?.activo !== false ? 'selected' : ''}>Activo</option><option value="0" ${treatment?.activo === false ? 'selected' : ''}>Inactivo</option></select></div>
        </div>
        <div class="form-actions"><button class="button secondary" type="button" data-close-modal>Cancelar</button><button class="button primary" type="submit">Guardar en MySQL</button></div>
      </form>`;
  }

  function openForm(treatment = null) {
    const backdrop = document.getElementById('modalBackdrop');
    const modal = document.getElementById('modal');
    modal.innerHTML = treatmentForm(treatment);
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    modal.querySelector('input[name="nombre"]')?.focus();
  }

  function closeForm() {
    const backdrop = document.getElementById('modalBackdrop');
    backdrop?.classList.remove('open');
    backdrop?.setAttribute('aria-hidden', 'true');
  }

  async function loadTreatments() {
    setConnection('', 'Conectando con MySQL…', 'Consultando catalogo_tratamientos.');

    try {
      const data = await api('/tratamientos?incluirInactivos=true');
      treatments = data.items || [];
      renderRows();
      fillCalculator();
      setConnection('success', 'Catálogo sincronizado.', `${treatments.length} registros obtenidos desde la base de datos.`);
    } catch (error) {
      treatments = [];
      const table = document.getElementById('treatmentTable');
      if (table) table.innerHTML = `<tr><td colspan="7" class="treatment-empty"><strong>No fue posible cargar el catálogo.</strong><br>${escapeHtml(error.message)}</td></tr>`;
      setConnection('error', 'Sin conexión con el catálogo.', 'Verifica que la API esté encendida y que API_URL apunte al backend HTTPS.');
    }
  }

  function init() {
  document.getElementById('newTreatmentButton')?.addEventListener('click', () => openForm());
  document.getElementById('calcTreatment')?.addEventListener('change', syncSelectedTreatment);
  document.getElementById('treatmentSearch')?.addEventListener('input', applyFilters);
  const requestedTreatment = new URLSearchParams(location.search).get('buscar');
  if (requestedTreatment && document.getElementById('treatmentSearch')) {
    document.getElementById('treatmentSearch').value = requestedTreatment;
  }
  document.getElementById('treatmentStatusFilter')?.addEventListener('change', applyFilters);

  document.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-treatment]');
    if (editButton) {
      const treatment = treatments.find((item) => item.idTratamiento === Number(editButton.dataset.editTreatment));
      if (treatment) openForm(treatment);
    }
  });

  document.addEventListener('submit', async (event) => {
    if (event.target.id !== 'treatmentForm') return;
    event.preventDefault();

    const form = event.target;
    const submit = form.querySelector('[type="submit"]');
    const formData = new FormData(form);
    const id = Number(form.dataset.treatmentId);
    const isEditing = Number.isInteger(id) && id > 0;
    const payload = {
      nombre: formData.get('nombre'),
      categoria: formData.get('categoria'),
      descripcion: formData.get('descripcion'),
      duracionMinutos: formData.get('duracionMinutos') || null,
      sesionesSugeridas: Number(formData.get('sesionesSugeridas')),
      costoCalculado: Number(formData.get('costoCalculado')),
      precioVenta: Number(formData.get('precioVenta')),
      activo: formData.get('activo') === '1'
    };

    submit.disabled = true;
    submit.textContent = 'Guardando…';

    try {
      await api(isEditing ? `/tratamientos/${id}` : '/tratamientos', {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload)
      });
      closeForm();
      showToast(isEditing ? 'Tratamiento actualizado en MySQL.' : 'Tratamiento creado en MySQL.');
      await loadTreatments();
    } catch (error) {
      showToast(error.message);
      submit.disabled = false;
      submit.textContent = 'Guardar en MySQL';
    }
  });

  loadTreatments();
  }
  if (document.getElementById('treatmentTable')) init();
  else window.addEventListener('ssl:ready', init, { once: true });
})();
