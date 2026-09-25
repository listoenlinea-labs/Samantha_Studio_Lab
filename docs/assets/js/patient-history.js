(function () {
  'use strict';

  const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:3000/api';
  const patientId = Number(new URLSearchParams(location.search).get('id'));
  const app = document.getElementById('patientHistoryApp');
  const adultUpper = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  const adultLower = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
  const childUpper = [55,54,53,52,51,61,62,63,64,65];
  const childLower = [85,84,83,82,81,71,72,73,74,75];
  const stages = { initial: 'INICIAL', evolution: 'EVOLUCION', discharge: 'ALTA' };
  const icons = { filiation: '♙', history: '▤', odontogram: '♧', perio: '♧', ortho: '♜', account: '▱', prescriptions: '▧', files: '▭' };
  const navigation = [
    ['filiation','Filiación'], ['history','Historia clínica'],
    ['odontogram','Odontograma'], ['perio','Periodontograma'],
    ['ortho','Ortodoncia'], ['account','Estado de cuenta'],
    ['prescriptions','Prescripciones'], ['files','Archivos']
  ];
  const state = {
    patient: null,
    history: null,
    odontograms: [],
    odontogram: null,
    findings: [],
    findingCatalog: [],
    stage: 'initial',
    dentition: 'ADULTO',
    nomenclature: 'FDI',
    periodontogram: null,
    measurements: new Map(),
    perioFace: 'VESTIBULAR'
  };
  let odontogramCreationPromise = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    // En desarrollo la API incluye detalle; en producción se conserva el mensaje amigable.
    if (!response.ok) throw new Error(data.detalle || data.mensaje || 'No fue posible completar la solicitud.');
    return data;
  }

  function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value));
  }

  function initials(name) {
    return String(name || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  function avatar(patient) {
    if (patient.fotoUrl) return `<img src="${escapeHtml(patient.fotoUrl)}" alt="Foto de ${escapeHtml(patient.nombreCompleto)}">`;
    return `<span class="ph-profile-initials" aria-hidden="true">${initials(patient.nombreCompleto)}</span>`;
  }

  const symbolText = {
    sano: 'S', ausente: '×', superficie: 'Click', extraccion: '×', endodoncia: '⌟',
    corona: '○', fractura: '╱', 'lesion-cervical': '⌒', 'defecto-esmalte': '●',
    impactacion: 'Click', implante: '▥', linea: '━', gingivitis: 'G⌒', erupcion: 'ϟ',
    fisura: '╱', remanente: 'RR', periodontitis: 'P⌒', 'perno-fibra': '▴',
    frenillo: '∪∪', ffp: 'FFP', 'aparato-fijo': '⊞—⊞', fusion: '⚭',
    'aparato-removible': '⌃', geminacion: '○', bolsa: 'B⌒', gingivectomia: 'Gingiv',
    carilla: '▪', carillas: '▪▪', giroversion: '↷', furca: '∿', diastema: ')(',
    'perno-metalico': '▥', 'flecha-arriba': '⬆', ectopica: 'Click', clavija: '△',
    'flecha-abajo': '⬇', puente: 'Π', pulpectomia: '⌟', pulpotomia: '▣',
    sellante: '✚', conducto: '│', caries: '●', restauracion: '◆'
  };

  function findingGlyph(icon, visualState, compact = false) {
    const stateClass = String(visualState || 'NEUTRO').toLowerCase();
    return `<span class="ph-symbol ${stateClass} icon-${escapeHtml(icon || 'punto')} ${compact ? 'compact' : ''}" aria-hidden="true">${escapeHtml(symbolText[icon] || '●')}</span>`;
  }

  function notify(message, error = false) {
    const toast = document.getElementById('phToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle('error', error);
    toast.classList.add('show');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function toothType(id) {
    const numericId = Number(id);
    const quadrant = Math.floor(numericId / 10);
    const number = numericId % 10;
    if (quadrant >= 5 && number >= 4) return 'molar';
    if (number <= 2) return 'incisor';
    if (number === 3) return 'canine';
    if (number <= 5) return 'premolar';
    return 'molar';
  }

  function toothArtwork(id, arch) {
    const type = toothType(id);
    const numericId = Number(id);
    const quadrant = Math.floor(numericId / 10);
    const number = numericId % 10;
    const primary = quadrant >= 5;
    const width = { incisor: 34, canine: 36, premolar: 42, molar: 50 }[type];
    const crown = {
      incisor: 'M15 51 Q15 45 20 43 L34 43 Q39 45 39 51 L38 69 Q36 78 27 80 Q18 78 16 69Z',
      canine: 'M13 53 Q14 46 21 43 L27 38 L34 43 Q41 46 41 53 L39 68 Q35 76 27 81 Q19 76 15 68Z',
      premolar: 'M9 53 Q10 44 18 42 Q27 37 36 42 Q44 44 45 53 L43 68 Q40 78 30 80 L23 80 Q13 78 11 68Z',
      molar: 'M5 52 Q6 43 15 41 Q20 37 27 41 Q34 37 40 41 Q49 43 49 52 L48 68 Q44 79 36 79 Q31 83 27 78 Q22 83 17 79 Q9 79 6 68Z'
    }[type];
    const singleRoot = '<path d="M20 46 Q22 20 26 3 Q29 0 32 4 Q35 23 34 46Z"/>';
    const twoRoots = '<path d="M15 45 Q13 24 15 7 Q18 2 21 7 Q24 25 24 44 M30 44 Q32 23 37 7 Q40 3 42 9 Q43 27 39 46Z"/><path class="root-groove" d="M25 42 Q27 24 29 9 Q31 25 30 43Z"/>';
    const threeRoots = '<path d="M12 45 Q10 25 13 8 Q15 3 18 7 Q21 24 21 43 M23 43 Q23 19 26 4 Q29 0 31 5 Q34 22 32 43 M35 43 Q38 22 41 8 Q44 4 45 10 Q46 28 41 46Z"/><path class="root-groove" d="M21 42 Q25 24 27 7 Q29 25 28 43Z"/>';
    let roots = { incisor: singleRoot, canine: singleRoot, premolar: singleRoot, molar: twoRoots }[type];
    if (!primary && type === 'molar' && [16, 26].includes(numericId)) roots = threeRoots;
    if (primary && type === 'molar' && [74, 75, 84, 85].includes(numericId)) roots = singleRoot;
    return `<svg viewBox="0 0 54 84" aria-hidden="true" class="${arch}"><g>${roots}<path class="crown" d="${crown}"/></g></svg>`;
  }

  function toothButton(id, arch) {
    const toothFindings = state.findings.filter((item) => String(item.pieza) === String(id));
    const finding = toothFindings[toothFindings.length - 1];
    const condition = finding ? (finding.estadoVisual === 'BUENO' ? 'good' : finding.estadoVisual === 'MALO' ? 'bad' : 'neutral') : '';
    return `<button class="ph-tooth ${toothType(id)} ${condition}" data-tooth="${id}" aria-label="Diente ${id}">
      <span>${id}</span>${toothArtwork(id, arch)}${finding ? `<i class="ph-tooth-marker">${findingGlyph(finding.icono, finding.estadoVisual, true)}${toothFindings.length > 1 ? `<em>${toothFindings.length}</em>` : ''}</i>` : ''}</button>`;
  }

  function toothRow(ids, arch, primary = false) {
    return `<div class="ph-tooth-row ${arch} ${primary ? 'primary' : ''}" style="--tooth-count:${ids.length}">
      ${ids.map((id) => toothButton(id, arch)).join('')}</div>`;
  }

  function dentitionChart() {
    if (state.dentition === 'NINO') {
      return `<div class="ph-dentition-block child">${toothRow(childUpper, 'upper', true)}<div class="ph-midline"></div>${toothRow(childLower, 'lower', true)}</div>`;
    }
    if (state.dentition === 'MIXTO') {
      return `<div class="ph-dentition-block mixed">${toothRow(adultUpper, 'upper')}
        <div class="ph-primary-pair">${toothRow(childUpper, 'upper', true)}<div class="ph-midline"></div>${toothRow(childLower, 'lower', true)}</div>
        ${toothRow(adultLower, 'lower')}</div>`;
    }
    return `<div class="ph-dentition-block adult">${toothRow(adultUpper, 'upper')}<div class="ph-midline"></div>${toothRow(adultLower, 'lower')}</div>`;
  }

  function shell() {
    const patient = state.patient;
    const tags = patient.etiquetas?.length ? patient.etiquetas.map((tag) => tag.nombre).join(', ') : 'Paciente activo';
    app.innerHTML = `
      <header class="ph-header"><a href="pacientes.html" class="ph-brand"><img src="assets/img/logo-ssl.svg" alt=""><strong>samantha's studio lab</strong></a><nav><a href="agenda.html">Agenda</a><a class="active" href="pacientes.html">Pacientes</a><a href="finanzas.html">Finanzas</a><a href="inventario.html">Inventario</a></nav><div><button type="button" id="globalSearchToggle" aria-label="Buscar en la aplicación" aria-haspopup="dialog" aria-expanded="false" aria-controls="globalSearchPanel">⌕ Buscar</button><button data-notify="Nueva cita preparada">＋ Crear</button><span>Administrador</span></div></header>
      <main class="ph-layout">
        <aside class="ph-sidebar"><section class="ph-profile"><div class="ph-profile-cover"></div>${avatar(patient)}<h1>${escapeHtml(patient.nombreCompleto)}</h1><p>${patient.edad ?? 'Edad no registrada'}${patient.edad !== null ? ' años' : ''}</p><small>Creado el ${formatDate(patient.creadoAt)}</small><div class="ph-contact"><a href="${patient.telefono ? `tel:${escapeHtml(patient.telefono)}` : '#'}">☎</a><a href="${patient.correo ? `mailto:${escapeHtml(patient.correo)}` : '#'}">✉</a><button id="phMoreButton">⋮</button></div><div class="ph-more-menu" id="phMoreMenu" hidden><a href="pacientes.html">Editar datos y foto</a><button data-notify="La descarga del expediente se habilitará en Archivos">Descargar expediente</button></div></section>
          <nav class="ph-record-nav">${navigation.map(([id,label]) => `<button class="${id === 'odontogram' ? 'active' : ''}" data-record-view="${id}"><i>${icons[id]}</i>${label}</button>`).join('')}</nav></aside>
        <section class="ph-workspace"><div class="ph-info-strip"><article><b>▮ Etiquetas</b><button data-summary-edit="tags">＋ Editar</button><span>${escapeHtml(tags)}</span></article><article><b>▰ Nota general</b><button data-summary-edit="note">Editar</button><span>${escapeHtml(patient.notaGeneral || 'Sin notas')}</span></article><article><b>● Alergias</b><button data-summary-edit="allergies">Editar</button><span>${escapeHtml(patient.alergias || 'Sin alergias registradas')}</span></article></div><div id="phView"></div></section>
        <aside class="ph-clinical-rail"><section><h3>Expediente</h3><div class="ph-illustration">◔</div><strong>${escapeHtml(patient.numeroExpediente || '—')}</strong></section><section><div class="ph-rail-title"><h3>Notas de evolución</h3></div><div class="ph-illustration note">▤</div><button data-record-view-shortcut="history">＋ Registrar evolución</button></section></aside>
      </main><div class="ph-modal-backdrop" id="phModal" hidden></div><div class="ph-toast" id="phToast" role="status"></div>`;
    document.querySelector('.ph-record-nav').addEventListener('click', onNavigation);
    document.getElementById('phMoreButton').addEventListener('click', () => {
      const menu = document.getElementById('phMoreMenu'); menu.hidden = !menu.hidden;
    });
    document.querySelector('[data-record-view-shortcut="history"]').addEventListener('click', () => activateView('history'));
    document.querySelectorAll('[data-summary-edit]').forEach((button) => button.addEventListener('click', () => openSummaryEditor(button.dataset.summaryEdit)));
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-notify]');
      if (trigger) notify(trigger.dataset.notify);
    });
  }

  async function refreshPatientSummary() {
    state.patient = await api(`/pacientes/${patientId}/resumen`);
    const active = document.querySelector('[data-record-view].active')?.dataset.recordView || 'odontogram';
    shell();
    await activateView(active);
  }

  function closeModal() {
    const modal = document.getElementById('phModal');
    modal.hidden = true;
    modal.innerHTML = '';
  }

  async function openSummaryEditor(type) {
    const modal = document.getElementById('phModal');
    modal.hidden = false;
    if (type === 'tags') {
      try {
        const data = await api('/pacientes/etiquetas/catalogo');
        const assigned = new Set((state.patient.etiquetas || []).map((tag) => Number(tag.idEtiqueta)));
        modal.innerHTML = `<section class="ph-modal-card"><header><h2>Etiquetas del paciente</h2><button data-close-modal>×</button></header><div class="ph-tag-editor">${data.items.map((tag) => `<label style="--tag-bg:${escapeHtml(tag.colorFondo || '#e5f6f2')};--tag-color:${escapeHtml(tag.colorTexto || '#187862')}"><input type="checkbox" value="${tag.idEtiqueta}" ${assigned.has(Number(tag.idEtiqueta)) ? 'checked' : ''}>${escapeHtml(tag.nombre)}</label>`).join('') || '<p>No hay etiquetas activas en el catálogo.</p>'}</div><footer><button data-close-modal>Cancelar</button><button class="ph-primary" id="saveTags">Guardar etiquetas</button></footer></section>`;
        modal.querySelector('#saveTags').onclick = async () => {
          try {
            const selected = new Set([...modal.querySelectorAll('input:checked')].map((input) => Number(input.value)));
            await Promise.all([
              ...[...selected].filter((id) => !assigned.has(id)).map((id) => api(`/pacientes/${patientId}/etiquetas`, { method: 'POST', body: JSON.stringify({ idEtiqueta: id }) })),
              ...[...assigned].filter((id) => !selected.has(id)).map((id) => api(`/pacientes/${patientId}/etiquetas/${id}`, { method: 'DELETE' }))
            ]);
            closeModal(); notify('Etiquetas guardadas.'); await refreshPatientSummary();
          } catch (error) { notify(error.message, true); }
        };
      } catch (error) { modal.innerHTML = `<section class="ph-modal-card"><p>${escapeHtml(error.message)}</p><button data-close-modal>Cerrar</button></section>`; }
    } else {
      const isNote = type === 'note';
      const value = isNote ? state.patient.notaGeneral : state.patient.alergias;
      modal.innerHTML = `<form class="ph-modal-card" id="summaryForm"><header><h2>${isNote ? 'Nota general' : 'Alergias'}</h2><button type="button" data-close-modal>×</button></header><label>${isNote ? 'Información visible en el expediente' : 'Alergias y reacciones importantes'}<textarea name="value" rows="6" maxlength="4000">${escapeHtml(value || '')}</textarea></label><footer><button type="button" data-close-modal>Cancelar</button><button class="ph-primary">Guardar</button></footer></form>`;
      modal.querySelector('form').onsubmit = async (event) => {
        event.preventDefault();
        try {
          const payload = { [isNote ? 'notaGeneral' : 'alergias']: new FormData(event.currentTarget).get('value') };
          await api(`/pacientes/${patientId}/resumen`, { method: 'PATCH', body: JSON.stringify(payload) });
          closeModal(); notify('Información clínica guardada.'); await refreshPatientSummary();
        } catch (error) { notify(error.message, true); }
      };
    }
    modal.querySelectorAll('[data-close-modal]').forEach((button) => button.onclick = closeModal);
    modal.onclick = (event) => { if (event.target === modal) closeModal(); };
  }

  function onNavigation(event) {
    const button = event.target.closest('[data-record-view]');
    if (button) activateView(button.dataset.recordView);
  }

  function activateView(id) {
    document.querySelectorAll('[data-record-view]').forEach((button) => button.classList.toggle('active', button.dataset.recordView === id));
    if (id === 'filiation') return renderFiliation();
    if (id === 'history') return renderHistory();
    if (id === 'odontogram') return loadOdontograms();
    if (id === 'perio') return loadPeriodontogram();
    renderGeneric(id);
  }

  async function renderFiliation() {
    const view = document.getElementById('phView');
    view.innerHTML = '<section class="ph-card ph-loading">Cargando filiación…</section>';
    try {
      const data = await api(`/pacientes/${patientId}/filiacion`);
      const input = (name, label, type = 'text') => `<label>${label}<input type="${type}" name="${name}" value="${escapeHtml(data[name] || '')}"></label>`;
      view.innerHTML = `<section class="ph-card ph-history"><header><div><h2>Filiación</h2><p>Datos personales y de contacto del paciente.</p></div><button class="ph-primary" id="saveFiliation">Guardar cambios</button></header><form id="filiationForm" class="ph-history-form">${input('nombres','Nombre(s)')}${input('apellidoPaterno','Apellido paterno')}${input('apellidoMaterno','Apellido materno')}${input('fechaNacimiento','Fecha de nacimiento','date')}<label>Sexo<select name="sexo"><option value="">No especificado</option>${['F','M','X','NO_ESPECIFICA'].map((value) => `<option ${data.sexo === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>${input('telefono','Teléfono','tel')}${input('correo','Correo','email')}${input('comoNosConocio','¿Cómo nos conoció?')}<label>Antecedentes médicos<textarea name="antecedentesMedicos" rows="4">${escapeHtml(data.antecedentesMedicos || '')}</textarea></label><label>Notas de alerta<textarea name="notasAlerta" rows="4">${escapeHtml(data.notasAlerta || '')}</textarea></label></form></section>`;
      document.getElementById('saveFiliation').onclick = async () => {
        try {
          const payload = Object.fromEntries(new FormData(document.getElementById('filiationForm')));
          await api(`/pacientes/${patientId}/filiacion`, { method: 'PATCH', body: JSON.stringify(payload) });
          notify('Filiación guardada.'); await refreshPatientSummary();
        } catch (error) { notify(error.message, true); }
      };
    } catch (error) {
      view.innerHTML = `<section class="ph-card ph-error"><h2>No se pudo cargar la filiación</h2><p>${escapeHtml(error.message)}</p></section>`;
    }
  }

  async function renderHistory() {
    const view = document.getElementById('phView');
    view.innerHTML = '<section class="ph-card ph-loading">Cargando historia clínica…</section>';
    try {
      const [historyData, treatmentsData, sessionsData] = await Promise.all([
        api(`/pacientes/${patientId}/historia-clinica`),
        api(`/pacientes/${patientId}/tratamientos`),
        api(`/pacientes/${patientId}/sesiones`)
      ]);
      state.history = historyData.historia || {};
      const field = (name, label, rows = 2) => `<label>${label}<textarea name="${name}" rows="${rows}">${escapeHtml(state.history[name] || '')}</textarea></label>`;
      view.innerHTML = `<section class="ph-card ph-history"><header><div><h2>Historia clínica</h2><p>La edición crea una versión nueva y conserva la anterior.</p></div><button class="ph-primary" id="saveHistory">Guardar cambios</button></header><form id="historyForm" class="ph-history-form">${field('motivoConsulta','Motivo de consulta')}${field('alergias','Alergias')}${field('antecedentesMedicos','Antecedentes médicos',4)}${field('antecedentesOdontologicos','Antecedentes odontológicos',4)}${field('medicamentosActuales','Medicamentos actuales')}${field('diagnosticoGeneral','Diagnóstico general',4)}${field('observaciones','Observaciones',4)}</form><div class="ph-clinical-columns"><section><h3>Tratamientos</h3>${treatmentsData.items.length ? treatmentsData.items.map((item) => `<article><b>${escapeHtml(item.nombre)}</b><span>${escapeHtml(item.estado)}</span><p>${escapeHtml(item.descripcion || '')}</p></article>`).join('') : '<p>Sin tratamientos registrados.</p>'}</section><section><h3>Evolución</h3>${sessionsData.items.length ? sessionsData.items.map((item) => `<article><b>${formatDate(item.fechaSesion)}</b><p>${escapeHtml(item.evolucion)}</p></article>`).join('') : '<p>Sin sesiones registradas.</p>'}<form id="sessionForm"><textarea name="evolucion" required placeholder="Nueva nota de evolución"></textarea><button>Registrar evolución</button></form></section></div></section>`;
      document.getElementById('saveHistory').onclick = saveHistory;
      document.getElementById('sessionForm').onsubmit = saveSession;
    } catch (error) {
      view.innerHTML = `<section class="ph-card ph-error"><h2>No se pudo cargar la historia</h2><p>${escapeHtml(error.message)}</p></section>`;
    }
  }

  async function saveHistory() {
    try {
      const payload = Object.fromEntries(new FormData(document.getElementById('historyForm')));
      await api(`/pacientes/${patientId}/historia-clinica`, { method: 'PUT', body: JSON.stringify(payload) });
      notify('Historia clínica guardada y versionada.');
      await renderHistory();
    } catch (error) { notify(error.message, true); }
  }

  async function saveSession(event) {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(event.currentTarget));
      await api(`/pacientes/${patientId}/sesiones`, { method: 'POST', body: JSON.stringify(payload) });
      notify('Evolución registrada.');
      await renderHistory();
    } catch (error) { notify(error.message, true); }
  }

  function odontogramControls() {
    return `<div class="ph-odo-controls"><label>Tipo<select id="dentitionType" ${state.odontogram?.estado === 'FINALIZADO' ? 'disabled' : ''}><option value="ADULTO" ${state.dentition === 'ADULTO' ? 'selected' : ''}>Adulto</option><option value="MIXTO" ${state.dentition === 'MIXTO' ? 'selected' : ''}>Mixto</option><option value="NINO" ${state.dentition === 'NINO' ? 'selected' : ''}>Niño</option></select></label><label>Nomenclatura<select id="nomenclature" ${state.odontogram?.estado === 'FINALIZADO' ? 'disabled' : ''}><option value="FDI" ${state.nomenclature === 'FDI' ? 'selected' : ''}>Internacional (FDI)</option><option value="ADA" ${state.nomenclature === 'ADA' ? 'selected' : ''}>ADA</option></select></label><label class="ph-multi"><input id="multiSelect" type="checkbox" ${state.odontogram?.estado === 'FINALIZADO' ? 'disabled' : ''}> Marcado múltiple</label></div>`;
  }

  async function loadOdontograms() {
    const view = document.getElementById('phView');
    view.innerHTML = '<section class="ph-card ph-loading">Cargando odontograma…</section>';
    try {
      const data = await api(`/pacientes/${patientId}/odontogramas`);
      state.odontograms = data.items || [];
      state.odontogram = state.odontograms.find((item) => item.fase === stages[state.stage]) || null;
      if (state.odontogram) {
        state.dentition = state.odontogram.tipoDenticion;
        state.nomenclature = state.odontogram.nomenclatura;
        const findings = await api(`/odontogramas/${state.odontogram.idOdontograma}/hallazgos`);
        state.findings = findings.items || [];
      } else state.findings = [];
      renderOdontogram();
    } catch (error) {
      view.innerHTML = `<section class="ph-card ph-error"><h2>No se pudo cargar el odontograma</h2><p>${escapeHtml(error.message)}</p></section>`;
    }
  }

  function renderOdontogram() {
    const view = document.getElementById('phView');
    view.innerHTML = `<section class="ph-card ph-odontogram"><header class="ph-card-tabs"><div>${Object.entries(stages).map(([id, value]) => `<button class="${state.stage === id ? 'active' : ''}" data-odo-stage="${id}">${value === 'EVOLUCION' ? 'Odo. evolución' : value === 'ALTA' ? 'Odo. alta' : 'Odo. inicial'}</button>`).join('')}</div><div class="ph-state-key"><span class="bad">● Mal estado</span><span class="good">● Buen estado</span><button id="newOdontogram">${state.odontogram ? 'Nueva versión' : 'Crear odontograma'}</button>${state.odontogram && state.odontogram.estado !== 'FINALIZADO' ? '<button id="finalizeOdontogram" class="ph-finalize">Finalizar</button>' : ''}</div></header>${odontogramControls()}${state.odontogram ? `<div class="ph-record-status"><span>${escapeHtml(state.odontogram.estado)} · ${formatDate(state.odontogram.creadoAt)}</span><input id="odontogramNotes" maxlength="4000" placeholder="Observaciones del odontograma" value="${escapeHtml(state.odontogram.observaciones || '')}" ${state.odontogram.estado === 'FINALIZADO' ? 'disabled' : ''}></div>` : '<p class="ph-empty-notice">Selecciona un diente. El odontograma se guardará automáticamente al registrar el primer hallazgo.</p>'}<div class="ph-teeth-chart">${dentitionChart()}</div><section class="ph-treatment-plan"><h2>Hallazgos</h2><div class="ph-plan-table"><b>N.º diente</b><b>Hallazgo</b><b>Superficie</b><b>Estado</b><b></b>${state.findings.length ? state.findings.map((item) => `<div class="ph-plan-row"><span>${escapeHtml(item.pieza)}</span><span class="ph-plan-finding">${findingGlyph(item.icono, item.estadoVisual, true)}${escapeHtml(item.nombre)}</span><span>${escapeHtml(item.superficie || 'Diente completo')}</span><span class="${String(item.estadoVisual).toLowerCase()}">${escapeHtml(item.estadoVisual)}</span><span>${state.odontogram.estado !== 'FINALIZADO' ? `<button class="ph-remove-finding" data-remove-finding="${item.idHallazgo}" aria-label="Eliminar ${escapeHtml(item.nombre)}">×</button>` : ''}</span></div>`).join('') : '<div id="phPlanEmpty">Selecciona un diente para registrar un hallazgo.</div>'}</div></section></section><div class="ph-finding-popover" id="phFindingPopover" hidden></div>`;
    bindOdontogram();
  }

  function bindOdontogram() {
    const selected = new Set();
    document.querySelectorAll('[data-odo-stage]').forEach((button) => button.onclick = async () => { state.stage = button.dataset.odoStage; await loadOdontograms(); });
    document.getElementById('dentitionType').onchange = async (event) => { state.dentition = event.target.value; if (state.odontogram) await saveOdontogramSettings(); else renderOdontogram(); };
    document.getElementById('nomenclature').onchange = async (event) => { state.nomenclature = event.target.value; if (state.odontogram) await saveOdontogramSettings(); };
    document.getElementById('newOdontogram').onclick = createOdontogram;
    document.getElementById('finalizeOdontogram')?.addEventListener('click', finalizeOdontogram);
    document.getElementById('odontogramNotes')?.addEventListener('change', saveOdontogramSettings);
    document.querySelectorAll('[data-remove-finding]').forEach((button) => button.onclick = () => removeFinding(button.dataset.removeFinding));
    document.querySelectorAll('.ph-tooth').forEach((button) => button.onclick = () => {
      const multiple = document.getElementById('multiSelect').checked;
      if (!multiple) { selected.clear(); document.querySelectorAll('.ph-tooth').forEach((tooth) => tooth.classList.remove('selected')); }
      button.classList.toggle('selected');
      button.classList.contains('selected') ? selected.add(button.dataset.tooth) : selected.delete(button.dataset.tooth);
      showFindingPopover(button, selected);
    });
  }

  async function saveOdontogramSettings() {
    try {
      await api(`/odontogramas/${state.odontogram.idOdontograma}`, { method: 'PATCH', body: JSON.stringify({ tipoDenticion: state.dentition, nomenclatura: state.nomenclature, observaciones: document.getElementById('odontogramNotes')?.value || state.odontogram.observaciones || '' }) });
      state.odontogram.tipoDenticion = state.dentition;
      state.odontogram.nomenclatura = state.nomenclature;
      state.odontogram.observaciones = document.getElementById('odontogramNotes')?.value || '';
      notify('Configuración del odontograma guardada.');
      renderOdontogram();
    } catch (error) { notify(error.message, true); }
  }

  async function finalizeOdontogram() {
    if (!confirm('¿Finalizar este odontograma? Después necesitarás crear una nueva versión para modificarlo.')) return;
    try {
      await api(`/odontogramas/${state.odontogram.idOdontograma}/finalizar`, { method: 'PATCH', body: '{}' });
      notify('Odontograma finalizado.'); await loadOdontograms();
    } catch (error) { notify(error.message, true); }
  }

  async function removeFinding(findingId) {
    try {
      await api(`/odontogramas/${state.odontogram.idOdontograma}/hallazgos/${findingId}`, { method: 'DELETE' });
      notify('Hallazgo eliminado.'); await loadOdontograms();
    } catch (error) { notify(error.message, true); }
  }

  async function createOdontogram() {
    try {
      await requestNewOdontogram();
      notify('Odontograma creado.');
      await loadOdontograms();
    } catch (error) { notify(error.message, true); }
  }

  async function requestNewOdontogram() {
    const created = await api(`/pacientes/${patientId}/odontogramas`, {
      method: 'POST',
      body: JSON.stringify({ fase: stages[state.stage], tipoDenticion: state.dentition, nomenclatura: state.nomenclature, observaciones: '' })
    });
    return {
      idOdontograma: created.idOdontograma,
      fase: stages[state.stage],
      tipoDenticion: state.dentition,
      nomenclatura: state.nomenclature,
      observaciones: '',
      estado: 'BORRADOR',
      creadoAt: new Date().toISOString()
    };
  }

  async function ensureEditableOdontogram() {
    if (state.odontogram && state.odontogram.estado !== 'FINALIZADO') return state.odontogram;
    if (!odontogramCreationPromise) {
      odontogramCreationPromise = requestNewOdontogram()
        .then((odontogram) => {
          state.odontogram = odontogram;
          state.odontograms.unshift(odontogram);
          notify('Odontograma borrador creado automáticamente.');
          return odontogram;
        })
        .finally(() => { odontogramCreationPromise = null; });
    }
    return odontogramCreationPromise;
  }

  function showFindingPopover(button, selected) {
    const popover = document.getElementById('phFindingPopover');
    if (!selected.size) { popover.hidden = true; return; }
    const rectangle = button.getBoundingClientRect();
    popover.style.left = `${Math.min(innerWidth - 470, Math.max(16, rectangle.left - 100))}px`;
    popover.style.top = `${Math.max(10, Math.min(innerHeight - 480, Math.max(78, rectangle.bottom - 110)))}px`;
    const findingRows = state.findingCatalog.map((item) => `<article class="ph-finding-option" data-finding-name="${escapeHtml(item.nombre.toLowerCase())}"><span>${escapeHtml(item.nombre)}</span><div>${item.variantes.map((variant) => `<button type="button" data-code="${item.codigo}" data-visual-state="${variant}" data-requires-surface="${item.requiereSuperficie ? '1' : '0'}" title="${escapeHtml(item.nombre)} · ${variant}">${findingGlyph(item.icono, variant)}</button>`).join('')}</div></article>`).join('');
    popover.innerHTML = `<header><b>Diente${selected.size > 1 ? 's' : ''} ${[...selected].join(', ')}</b><button aria-label="Cerrar">×</button></header><div class="ph-finding-tags"><button data-quick-code="CARIES" class="bad">Caries</button><button data-quick-code="RESTAURACION_DEFICIENTE" class="bad">Restau.</button><button data-quick-code="RESTAURACION" class="good">Restau.</button></div><label class="ph-finding-search"><input id="findingSearch" type="search" placeholder="Buscar hallazgo"><span>⌕</span></label><label class="ph-surface-control">Superficie<select id="findingSurface"><option value="DIENTE">Diente completo</option><option>OCLUSAL</option><option>VESTIBULAR</option><option>PALATINA</option><option>LINGUAL</option><option>MESIAL</option><option>DISTAL</option></select></label><label class="ph-finding-note">Nota opcional<input id="findingNote" maxlength="500" placeholder="Observaciones"></label><div class="ph-findings">${findingRows}</div>`;
    popover.hidden = false;
    popover.querySelector('header button').onclick = () => { popover.hidden = true; };
    popover.querySelector('#findingSearch').oninput = (event) => {
      const query = event.target.value.trim().toLowerCase();
      popover.querySelectorAll('.ph-finding-option').forEach((row) => { row.hidden = !row.dataset.findingName.includes(query); });
    };
    popover.querySelectorAll('[data-quick-code]').forEach((quick) => quick.onclick = () => popover.querySelector(`[data-code="${quick.dataset.quickCode}"]`)?.click());
    popover.querySelectorAll('[data-code]').forEach((item) => item.onclick = async () => {
      try {
        const selectedSurface = document.getElementById('findingSurface').value;
        const odontogram = await ensureEditableOdontogram();
        await api(`/odontogramas/${odontogram.idOdontograma}/hallazgos`, { method: 'POST', body: JSON.stringify({ piezas: [...selected], codigoHallazgo: item.dataset.code, estadoVisual: item.dataset.visualState, superficie: item.dataset.requiresSurface === '1' || selectedSurface !== 'DIENTE' ? selectedSurface : null, observaciones: document.getElementById('findingNote').value }) });
        popover.hidden = true; notify('Hallazgo guardado.'); await loadOdontograms();
      } catch (error) { notify(error.message, true); }
    });
  }

  function measurementKey(piece, face, point) { return `${piece}|${face}|${point}`; }

  async function loadPeriodontogram() {
    const view = document.getElementById('phView');
    view.innerHTML = '<section class="ph-card ph-loading">Cargando periodontograma…</section>';
    try {
      const list = await api(`/pacientes/${patientId}/periodontogramas`);
      state.periodontogram = list.items?.[0] || null;
      state.measurements = new Map();
      if (state.periodontogram) {
        const data = await api(`/periodontogramas/${state.periodontogram.idPeriodontograma}`);
        data.mediciones.forEach((item) => state.measurements.set(measurementKey(item.pieza, item.cara, item.punto), item));
      }
      renderPeriodontogram();
    } catch (error) {
      view.innerHTML = `<section class="ph-card ph-error"><h2>No se pudo cargar el periodontograma</h2><p>${escapeHtml(error.message)}</p></section>`;
    }
  }

  function perioTable(ids, offset) {
    const points = ['MESIAL','CENTRAL','DISTAL'];
    const read = (piece, point) => state.measurements.get(measurementKey(piece, state.perioFace, point)) || {};
    return `<div class="ph-perio-table"><div class="ph-perio-labels"><b></b><span>Movilidad</span><span>Sangrado</span><span>Placa</span><span>Margen gingival</span><span>Profundidad</span><span>Furcación</span><span>Supuración</span></div><div class="ph-perio-cells">${ids.map((id) => `<div class="ph-perio-col"><b>${id}</b><input type="number" min="0" max="3" value="${read(id,'CENTRAL').movilidad || 0}" data-perio="movilidad" data-piece="${id}"><label class="ph-triple">${points.map((point) => `<input type="checkbox" ${read(id,point).sangrado ? 'checked' : ''} data-perio="sangrado" data-piece="${id}" data-point="${point}">`).join('')}</label><label class="ph-triple">${points.map((point) => `<input type="checkbox" ${read(id,point).placa ? 'checked' : ''} data-perio="placa" data-piece="${id}" data-point="${point}">`).join('')}</label><label class="ph-triple">${points.map((point) => `<input type="number" min="-15" max="15" value="${read(id,point).margenGingival || 0}" data-perio="margenGingival" data-piece="${id}" data-point="${point}">`).join('')}</label><label class="ph-triple">${points.map((point) => `<input type="number" min="0" max="15" value="${read(id,point).profundidad || 0}" data-perio="profundidad" data-piece="${id}" data-point="${point}">`).join('')}</label><input type="number" min="0" max="3" value="${read(id,'CENTRAL').furcacion || 0}" data-perio="furcacion" data-piece="${id}"><label class="ph-triple">${points.map((point) => `<input type="checkbox" ${read(id,point).supuracion ? 'checked' : ''} data-perio="supuracion" data-piece="${id}" data-point="${point}">`).join('')}</label></div>`).join('')}</div></div>`;
  }

  function renderPeriodontogram() {
    const view = document.getElementById('phView');
    const locked = state.periodontogram?.estado === 'FINALIZADO';
    view.innerHTML = `<section class="ph-card ph-perio"><header class="ph-simple-tabs"><button class="active">Periodontograma</button><label>Cara <select id="perioFace"><option>VESTIBULAR</option><option>PALATINA</option><option>LINGUAL</option></select></label><button class="ph-save" id="savePerio" ${locked ? 'disabled' : ''}>Guardar</button>${state.periodontogram && !locked ? '<button class="ph-finalize" id="finalizePerio">Finalizar</button>' : ''}</header><div class="ph-perio-status">${state.periodontogram ? `${escapeHtml(state.periodontogram.estado)} · ${formatDate(state.periodontogram.creadoAt)}` : 'Se creará al guardar'} · Placa <b id="plaquePct">0%</b> · Sangrado <b id="bleedPct">0%</b> · Profundidad media <b id="depthAvg">0.0 mm</b></div><label class="ph-perio-notes">Observaciones <textarea id="perioNotes" rows="2" maxlength="4000" ${locked ? 'disabled' : ''}>${escapeHtml(state.periodontogram?.observaciones || '')}</textarea></label><fieldset ${locked ? 'disabled' : ''}><div class="ph-perio-scroll">${perioTable(adultUpper.slice(0,8),0)}${perioTable(adultUpper.slice(8),8)}<div class="ph-perio-chart"><svg viewBox="0 0 1000 220" preserveAspectRatio="none"><g class="grid">${[30,60,90,120,150,180].map((y) => `<line x1="0" y1="${y}" x2="1000" y2="${y}"/>`).join('')}</g><path id="upperMarginLine" class="margin-line"/><path id="upperDepthLine" class="depth-line"/></svg><div class="ph-perio-teeth">${adultUpper.map((id) => toothButton(id,'upper')).join('')}</div></div>${perioTable(adultLower.slice(0,8),16)}${perioTable(adultLower.slice(8),24)}<div class="ph-perio-chart lower"><svg viewBox="0 0 1000 220" preserveAspectRatio="none"><g class="grid">${[30,60,90,120,150,180].map((y) => `<line x1="0" y1="${y}" x2="1000" y2="${y}"/>`).join('')}</g><path id="lowerMarginLine" class="margin-line"/><path id="lowerDepthLine" class="depth-line"/></svg><div class="ph-perio-teeth">${adultLower.map((id) => toothButton(id,'lower')).join('')}</div></div></div></fieldset></section>`;
    document.getElementById('perioFace').value = state.perioFace;
    document.getElementById('perioFace').onchange = (event) => { collectPerioInputs(); state.perioFace = event.target.value; renderPeriodontogram(); };
    document.querySelectorAll('[data-perio]').forEach((input) => input.addEventListener('input', updatePerioSummary));
    document.getElementById('savePerio').onclick = savePeriodontogram;
    document.getElementById('finalizePerio')?.addEventListener('click', finalizePeriodontogram);
    updatePerioSummary();
  }

  function collectPerioInputs() {
    const points = ['MESIAL','CENTRAL','DISTAL'];
    [...new Set([...document.querySelectorAll('[data-piece]')].map((input) => input.dataset.piece))].forEach((piece) => {
      points.forEach((point) => {
        const value = (name) => document.querySelector(`[data-perio="${name}"][data-piece="${piece}"][data-point="${point}"]`);
        const mobility = document.querySelector(`[data-perio="movilidad"][data-piece="${piece}"]`);
        const furcation = document.querySelector(`[data-perio="furcacion"][data-piece="${piece}"]`);
        const item = { pieza: piece, cara: state.perioFace, punto: point, profundidad: Number(value('profundidad')?.value || 0), margenGingival: Number(value('margenGingival')?.value || 0), sangrado: Boolean(value('sangrado')?.checked), placa: Boolean(value('placa')?.checked), movilidad: Number(mobility?.value || 0), furcacion: Number(furcation?.value || 0), supuracion: Boolean(value('supuracion')?.checked) };
        state.measurements.set(measurementKey(piece, state.perioFace, point), item);
      });
    });
  }

  function updatePerioSummary() {
    const depths = [...document.querySelectorAll('[data-perio="profundidad"]')];
    const plaques = [...document.querySelectorAll('[data-perio="placa"]')];
    const bleeds = [...document.querySelectorAll('[data-perio="sangrado"]')];
    const average = depths.reduce((sum, input) => sum + Number(input.value), 0) / Math.max(depths.length, 1);
    document.getElementById('depthAvg').textContent = `${average.toFixed(1)} mm`;
    document.getElementById('plaquePct').textContent = `${Math.round(plaques.filter((input) => input.checked).length / Math.max(plaques.length, 1) * 100)}%`;
    document.getElementById('bleedPct').textContent = `${Math.round(bleeds.filter((input) => input.checked).length / Math.max(bleeds.length, 1) * 100)}%`;
    const chart = (prefix, ids) => {
      const values = (name) => ids.flatMap((id) => ['MESIAL','CENTRAL','DISTAL'].map((point) => Number(document.querySelector(`[data-perio="${name}"][data-piece="${id}"][data-point="${point}"]`)?.value || 0)));
      const path = (list, base, scale) => `M${list.map((value,index) => `${index / (list.length - 1) * 1000},${base + value * scale}`).join(' L')}`;
      document.getElementById(`${prefix}DepthLine`).setAttribute('d', path(values('profundidad'), 110, 7));
      document.getElementById(`${prefix}MarginLine`).setAttribute('d', path(values('margenGingival'), 110, -7));
    };
    chart('upper', adultUpper); chart('lower', adultLower);
  }

  async function savePeriodontogram() {
    try {
      collectPerioInputs();
      if (!state.periodontogram) {
        const created = await api(`/pacientes/${patientId}/periodontogramas`, { method: 'POST', body: JSON.stringify({ observaciones: '' }) });
        state.periodontogram = { idPeriodontograma: created.idPeriodontograma, estado: 'BORRADOR', creadoAt: new Date().toISOString() };
      }
      await api(`/periodontogramas/${state.periodontogram.idPeriodontograma}/mediciones`, { method: 'PUT', body: JSON.stringify({ mediciones: [...state.measurements.values()] }) });
      await api(`/periodontogramas/${state.periodontogram.idPeriodontograma}`, { method: 'PATCH', body: JSON.stringify({ observaciones: document.getElementById('perioNotes').value }) });
      state.periodontogram.observaciones = document.getElementById('perioNotes').value;
      notify('Periodontograma guardado.');
      return true;
    } catch (error) { notify(error.message, true); return false; }
  }

  async function finalizePeriodontogram() {
    if (!confirm('¿Finalizar este periodontograma? Ya no se podrá editar.')) return;
    try {
      if (!(await savePeriodontogram())) return;
      await api(`/periodontogramas/${state.periodontogram.idPeriodontograma}/finalizar`, { method: 'PATCH', body: '{}' });
      notify('Periodontograma finalizado.'); await loadPeriodontogram();
    } catch (error) { notify(error.message, true); }
  }

  function renderGeneric(id) {
    const copy = { filiation:['Filiación','Datos personales, tutor y medios de contacto'], ortho:['Ortodoncia','Diagnóstico, análisis y controles'], account:['Estado de cuenta','Cargos, abonos y planes de pago'], prescriptions:['Prescripciones','Recetas e indicaciones clínicas'], files:['Archivos','Radiografías, consentimientos y documentos'] }[id];
    document.getElementById('phView').innerHTML = `<section class="ph-card ph-generic"><h2>${copy[0]}</h2><p>${copy[1]}</p><div class="ph-generic-grid"><article><b>Expediente</b><strong>${escapeHtml(state.patient.numeroExpediente || '—')}</strong><span>${state.patient.activo ? 'Paciente activo' : 'Paciente inactivo'}</span></article><article><b>Teléfono</b><strong>${escapeHtml(state.patient.telefono || '—')}</strong><span>${escapeHtml(state.patient.correo || 'Sin correo')}</span></article></div><p>Esta sección conservará el mismo paciente al conectarse en el siguiente módulo.</p></section>`;
  }

  async function init() {
    if (!Number.isInteger(patientId) || patientId <= 0) {
      app.innerHTML = '<main class="ph-fatal"><h1>Paciente no válido</h1><p>Abre el historial desde el directorio de pacientes.</p><a href="pacientes.html">Volver a pacientes</a></main>';
      return;
    }
    app.innerHTML = '<main class="ph-fatal"><p>Cargando expediente clínico…</p></main>';
    try {
      const [patient, catalog] = await Promise.all([
        api(`/pacientes/${patientId}/resumen`),
        api('/odontogramas/catalogo/hallazgos')
      ]);
      state.patient = patient;
      state.findingCatalog = catalog.items || [];
      shell();
      window.dispatchEvent(new Event('ssl:ready'));
      await loadOdontograms();
    } catch (error) {
      app.innerHTML = `<main class="ph-fatal"><h1>No se pudo abrir el expediente</h1><p>${escapeHtml(error.message)}</p><a href="pacientes.html">Volver a pacientes</a></main>`;
    }
  }

  init();
})();
