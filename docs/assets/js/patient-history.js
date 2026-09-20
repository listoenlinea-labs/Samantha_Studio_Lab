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
    stage: 'initial',
    dentition: 'ADULTO',
    nomenclature: 'FDI',
    periodontogram: null,
    measurements: new Map(),
    perioFace: 'VESTIBULAR'
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.mensaje || data.detalle || 'No fue posible completar la solicitud.');
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
    const finding = state.findings.find((item) => String(item.pieza) === String(id));
    const condition = finding ? (finding.clasificacion === 'BUENO' ? 'good' : 'bad') : '';
    return `<button class="ph-tooth ${toothType(id)} ${condition}" data-tooth="${id}" aria-label="Diente ${id}">
      <span>${id}</span>${toothArtwork(id, arch)}</button>`;
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
      <header class="ph-header"><a href="pacientes.html" class="ph-brand"><img src="assets/img/logo-ssl.svg" alt=""><strong>samantha's studio lab</strong></a><nav><a href="agenda.html">Agenda</a><a class="active" href="pacientes.html">Pacientes</a><a href="finanzas.html">Finanzas</a><a href="inventario.html">Inventario</a></nav><div><button data-notify="Nueva cita preparada">＋ Crear</button><span>Administrador</span></div></header>
      <main class="ph-layout">
        <aside class="ph-sidebar"><section class="ph-profile"><div class="ph-profile-cover"></div>${avatar(patient)}<h1>${escapeHtml(patient.nombreCompleto)}</h1><p>${patient.edad ?? 'Edad no registrada'}${patient.edad !== null ? ' años' : ''}</p><small>Creado el ${formatDate(patient.creadoAt)}</small><div class="ph-contact"><a href="${patient.telefono ? `tel:${escapeHtml(patient.telefono)}` : '#'}">☎</a><a href="${patient.correo ? `mailto:${escapeHtml(patient.correo)}` : '#'}">✉</a><button id="phMoreButton">⋮</button></div><div class="ph-more-menu" id="phMoreMenu" hidden><a href="pacientes.html">Editar datos y foto</a><button data-notify="La descarga del expediente se habilitará en Archivos">Descargar expediente</button></div></section>
          <nav class="ph-record-nav">${navigation.map(([id,label]) => `<button class="${id === 'odontogram' ? 'active' : ''}" data-record-view="${id}"><i>${icons[id]}</i>${label}</button>`).join('')}</nav></aside>
        <section class="ph-workspace"><div class="ph-info-strip"><article><b>▮ Etiquetas</b><span>${escapeHtml(tags)}</span></article><article><b>▰ Nota general</b><span>${escapeHtml(patient.notaGeneral || 'Sin notas')}</span></article><article><b>● Alergias</b><span>${escapeHtml(patient.alergias || 'Sin alergias registradas')}</span></article></div><div id="phView"></div></section>
        <aside class="ph-clinical-rail"><section><h3>Expediente</h3><div class="ph-illustration">◔</div><strong>${escapeHtml(patient.numeroExpediente || '—')}</strong></section><section><div class="ph-rail-title"><h3>Notas de evolución</h3></div><div class="ph-illustration note">▤</div><button data-record-view-shortcut="history">＋ Registrar evolución</button></section></aside>
      </main><div class="ph-toast" id="phToast" role="status"></div>`;
    document.querySelector('.ph-record-nav').addEventListener('click', onNavigation);
    document.getElementById('phMoreButton').addEventListener('click', () => {
      const menu = document.getElementById('phMoreMenu'); menu.hidden = !menu.hidden;
    });
    document.querySelector('[data-record-view-shortcut="history"]').addEventListener('click', () => activateView('history'));
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-notify]');
      if (trigger) notify(trigger.dataset.notify);
    });
  }

  function onNavigation(event) {
    const button = event.target.closest('[data-record-view]');
    if (button) activateView(button.dataset.recordView);
  }

  function activateView(id) {
    document.querySelectorAll('[data-record-view]').forEach((button) => button.classList.toggle('active', button.dataset.recordView === id));
    if (id === 'history') return renderHistory();
    if (id === 'odontogram') return loadOdontograms();
    if (id === 'perio') return loadPeriodontogram();
    renderGeneric(id);
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
    return `<div class="ph-odo-controls"><label>Tipo<select id="dentitionType"><option value="ADULTO" ${state.dentition === 'ADULTO' ? 'selected' : ''}>Adulto</option><option value="MIXTO" ${state.dentition === 'MIXTO' ? 'selected' : ''}>Mixto</option><option value="NINO" ${state.dentition === 'NINO' ? 'selected' : ''}>Niño</option></select></label><label>Nomenclatura<select id="nomenclature"><option value="FDI">Internacional (FDI)</option><option value="ADA">ADA</option></select></label><label class="ph-multi"><input id="multiSelect" type="checkbox"> Marcado múltiple</label></div>`;
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
    view.innerHTML = `<section class="ph-card ph-odontogram"><header class="ph-card-tabs"><div>${Object.entries(stages).map(([id, value]) => `<button class="${state.stage === id ? 'active' : ''}" data-odo-stage="${id}">${value === 'EVOLUCION' ? 'Odo. evolución' : value === 'ALTA' ? 'Odo. alta' : 'Odo. inicial'}</button>`).join('')}</div><div class="ph-state-key"><span class="bad">● Mal estado</span><span class="good">● Buen estado</span><button id="newOdontogram">${state.odontogram ? 'Nueva versión' : 'Crear odontograma'}</button></div></header>${odontogramControls()}${state.odontogram ? `<p class="ph-record-status">${escapeHtml(state.odontogram.estado)} · ${formatDate(state.odontogram.creadoAt)}</p>` : '<p class="ph-empty-notice">Aún no existe un odontograma para esta fase. Selecciona el tipo y créalo.</p>'}<div class="ph-teeth-chart">${dentitionChart()}</div><section class="ph-treatment-plan"><h2>Hallazgos</h2><div class="ph-plan-table"><b>N.º diente</b><b>Hallazgo</b><b>Superficie</b><b>Nota</b>${state.findings.length ? state.findings.map((item) => `<div class="ph-plan-row"><span>${escapeHtml(item.pieza)}</span><span>${escapeHtml(item.nombre)}</span><span>${escapeHtml(item.superficie || '—')}</span><span>${escapeHtml(item.observaciones || '—')}</span></div>`).join('') : '<div id="phPlanEmpty">Selecciona un diente para registrar un hallazgo.</div>'}</div></section></section><div class="ph-finding-popover" id="phFindingPopover" hidden></div>`;
    bindOdontogram();
  }

  function bindOdontogram() {
    const selected = new Set();
    document.querySelectorAll('[data-odo-stage]').forEach((button) => button.onclick = async () => { state.stage = button.dataset.odoStage; await loadOdontograms(); });
    document.getElementById('dentitionType').onchange = (event) => { state.dentition = event.target.value; renderOdontogram(); };
    document.getElementById('nomenclature').onchange = (event) => { state.nomenclature = event.target.value; };
    document.getElementById('newOdontogram').onclick = createOdontogram;
    document.querySelectorAll('.ph-tooth').forEach((button) => button.onclick = () => {
      if (!state.odontogram) return notify('Primero crea el odontograma.', true);
      const multiple = document.getElementById('multiSelect').checked;
      if (!multiple) { selected.clear(); document.querySelectorAll('.ph-tooth').forEach((tooth) => tooth.classList.remove('selected')); }
      button.classList.toggle('selected');
      button.classList.contains('selected') ? selected.add(button.dataset.tooth) : selected.delete(button.dataset.tooth);
      showFindingPopover(button, selected);
    });
  }

  async function createOdontogram() {
    try {
      await api(`/pacientes/${patientId}/odontogramas`, { method: 'POST', body: JSON.stringify({ fase: stages[state.stage], tipoDenticion: state.dentition, nomenclatura: state.nomenclature, observaciones: '' }) });
      notify('Odontograma creado.');
      await loadOdontograms();
    } catch (error) { notify(error.message, true); }
  }

  function showFindingPopover(button, selected) {
    const popover = document.getElementById('phFindingPopover');
    if (!selected.size) { popover.hidden = true; return; }
    const rectangle = button.getBoundingClientRect();
    popover.style.left = `${Math.min(innerWidth - 390, Math.max(20, rectangle.left - 80))}px`;
    popover.style.top = `${Math.min(innerHeight - 360, rectangle.bottom + 8)}px`;
    popover.innerHTML = `<header><b>Diente${selected.size > 1 ? 's' : ''} ${[...selected].join(', ')}</b><button aria-label="Cerrar">×</button></header><label>Superficie<select id="findingSurface"><option>OCLUSAL</option><option>VESTIBULAR</option><option>PALATINA</option><option>LINGUAL</option><option>MESIAL</option><option>DISTAL</option></select></label><div class="ph-findings"><button data-code="CARIES">Caries <i>●</i></button><button data-code="RESTAURACION_DEFICIENTE">Restauración deficiente <i>●</i></button><button data-code="RESTAURACION">Restauración <i>◆</i></button><button data-code="BOLSA_PERIODONTAL">Bolsa periodontal <i>⌒</i></button></div>`;
    popover.hidden = false;
    popover.querySelector('header button').onclick = () => { popover.hidden = true; };
    popover.querySelectorAll('[data-code]').forEach((item) => item.onclick = async () => {
      try {
        await api(`/odontogramas/${state.odontogram.idOdontograma}/hallazgos`, { method: 'POST', body: JSON.stringify({ piezas: [...selected], codigoHallazgo: item.dataset.code, superficie: document.getElementById('findingSurface').value, observaciones: '' }) });
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
    view.innerHTML = `<section class="ph-card ph-perio"><header class="ph-simple-tabs"><button class="active">Periodontograma</button><label>Cara <select id="perioFace"><option>VESTIBULAR</option><option>PALATINA</option><option>LINGUAL</option></select></label><button class="ph-save" id="savePerio">Guardar</button></header><div class="ph-perio-status">${state.periodontogram ? `${escapeHtml(state.periodontogram.estado)} · ${formatDate(state.periodontogram.creadoAt)}` : 'Se creará al guardar'} · Placa <b id="plaquePct">0%</b> · Sangrado <b id="bleedPct">0%</b> · Profundidad media <b id="depthAvg">0.0 mm</b></div><div class="ph-perio-scroll">${perioTable(adultUpper.slice(0,8),0)}${perioTable(adultUpper.slice(8),8)}<div class="ph-perio-chart"><svg viewBox="0 0 1000 220" preserveAspectRatio="none"><g class="grid">${[30,60,90,120,150,180].map((y) => `<line x1="0" y1="${y}" x2="1000" y2="${y}"/>`).join('')}</g><path id="upperMarginLine" class="margin-line"/><path id="upperDepthLine" class="depth-line"/></svg><div class="ph-perio-teeth">${adultUpper.map((id) => toothButton(id,'upper')).join('')}</div></div>${perioTable(adultLower.slice(0,8),16)}${perioTable(adultLower.slice(8),24)}<div class="ph-perio-chart lower"><svg viewBox="0 0 1000 220" preserveAspectRatio="none"><g class="grid">${[30,60,90,120,150,180].map((y) => `<line x1="0" y1="${y}" x2="1000" y2="${y}"/>`).join('')}</g><path id="lowerMarginLine" class="margin-line"/><path id="lowerDepthLine" class="depth-line"/></svg><div class="ph-perio-teeth">${adultLower.map((id) => toothButton(id,'lower')).join('')}</div></div></div></section>`;
    document.getElementById('perioFace').value = state.perioFace;
    document.getElementById('perioFace').onchange = (event) => { collectPerioInputs(); state.perioFace = event.target.value; renderPeriodontogram(); };
    document.querySelectorAll('[data-perio]').forEach((input) => input.addEventListener('input', updatePerioSummary));
    document.getElementById('savePerio').onclick = savePeriodontogram;
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
      notify('Periodontograma guardado.');
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
      state.patient = await api(`/pacientes/${patientId}/resumen`);
      shell();
      await loadOdontograms();
    } catch (error) {
      app.innerHTML = `<main class="ph-fatal"><h1>No se pudo abrir el expediente</h1><p>${escapeHtml(error.message)}</p><a href="pacientes.html">Volver a pacientes</a></main>`;
    }
  }

  init();
})();
