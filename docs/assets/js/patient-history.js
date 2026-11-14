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
  const stageLabels = { initial: 'Odo. inicial', evolution: 'Odo. evolución', discharge: 'Odo. alta' };
  const surfaceLabels = {
    DIENTE: 'Diente completo', WHOLE: 'Diente completo', OCLUSAL: 'Oclusal', OCCLUSAL: 'Oclusal',
    VESTIBULAR: 'Vestibular', BUCCAL: 'Vestibular', PALATINA: 'Palatina', LINGUAL: 'Lingual / palatina',
    MESIAL: 'Mesial', DISTAL: 'Distal'
  };
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
    dirtyMeasurements: new Set(),
    perioNotes: '',
    perioFace: 'VESTIBULAR'
  };
  let odontogramCreationPromise = null;
  let findingDialogCleanup = null;

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

  function findingGlyph(icon, visualState, compact = false) {
    return window.SamanthaDentalArt.findingGlyph(icon, visualState, compact);
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
    return window.SamanthaDentalArt.toothType(id);
  }

  function toothArtwork(id, arch) {
    return window.SamanthaDentalArt.toothArtwork(id, arch);
  }

  function normalizeSearch(value) {
    return String(value || '').toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function toothLabel(id) {
    if (state.nomenclature === 'FDI') return id;
    const adult = [...adultUpper, ...adultLower];
    const adultIndex = adult.indexOf(Number(id));
    if (adultIndex >= 0) return adultIndex < 16 ? adultIndex + 1 : 32 - (adultIndex - 16);
    const children = [...childUpper, ...childLower];
    const childIndex = children.indexOf(Number(id));
    if (childIndex < 0) return id;
    return childIndex < 10 ? 'ABCDEFGHIJ'[childIndex] : 'TSRQPONMLK'[childIndex - 10];
  }

  function findingsForTooth(id) {
    return state.findings.filter((item) => String(item.pieza) === String(id))
      .sort((a, b) => Number(b.idHallazgo || 0) - Number(a.idHallazgo || 0)
        || String(b.creadoAt || '').localeCompare(String(a.creadoAt || '')));
  }

  function findingDescription(item) {
    return `${item.nombre} · ${surfaceLabels[item.superficie] || item.superficie || 'Diente completo'} · ${item.estadoVisual || 'NEUTRO'}`;
  }

  function toothVisual(id, arch, findings) {
    const visible = findings.slice(0, 3);
    return `<span class="ph-tooth-visual">${toothArtwork(id, arch)}<span class="ph-tooth-markers" data-marker-count="${visible.length}">${visible.map((item) => `<span class="ph-tooth-marker" title="${escapeHtml(findingDescription(item))}">${findingGlyph(item.icono, item.estadoVisual, true)}</span>`).join('')}</span></span>`;
  }

  function toothButton(id, arch) {
    const findings = findingsForTooth(id);
    const latest = findings[0];
    const condition = latest ? (latest.estadoVisual === 'BUENO' ? 'good' : latest.estadoVisual === 'MALO' ? 'bad' : 'neutral') : '';
    const extra = Math.max(0, findings.length - 3);
    const description = `Diente ${toothLabel(id)}, ${findings.length} registro(s)${findings.length ? `: ${findings.map(findingDescription).join('; ')}` : ''}`;
    return `<button type="button" class="ph-tooth ${toothType(id)} ${condition}" data-tooth="${id}" aria-pressed="false" aria-haspopup="dialog" aria-label="${escapeHtml(description)}">
      <span class="ph-tooth-number">${escapeHtml(toothLabel(id))}</span>${toothVisual(id, arch, findings)}<span class="ph-tooth-overflow" ${extra ? '' : 'aria-hidden="true"'}>${extra ? `+${extra}` : ''}</span></button>`;
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
      <header class="ph-header">
        <button type="button" id="phSidebarToggle" class="ph-menu-toggle" aria-controls="phClinicalSidebar" aria-expanded="true" aria-label="Mostrar u ocultar menú del expediente">‹</button>
        <a href="pacientes.html" class="ph-brand"><img src="assets/img/logo-ssl.svg" alt=""><span><strong>samantha's studio lab</strong><small>CONSULTORIO DENTAL</small></span></a>
        <div class="ph-top-actions"><button type="button" id="globalSearchToggle" class="ph-menu-toggle" aria-label="Buscar" aria-haspopup="dialog" aria-expanded="false" aria-controls="globalSearchPanel">⌕</button><a class="ph-return" href="pacientes.html">← Volver a pacientes</a></div>
      </header>
      <main class="ph-layout">
        <aside class="ph-sidebar" id="phClinicalSidebar"><section class="ph-profile"><div class="ph-profile-cover"></div>${avatar(patient)}<h1>${escapeHtml(patient.nombreCompleto)}</h1><p>${patient.edad ?? 'Edad no registrada'}${patient.edad !== null ? ' años' : ''}</p><small>Creado el ${formatDate(patient.creadoAt)}</small><div class="ph-contact"><a href="${patient.telefono ? `tel:${escapeHtml(patient.telefono)}` : '#'}">☎</a><a href="${patient.correo ? `mailto:${escapeHtml(patient.correo)}` : '#'}">✉</a><button id="phMoreButton">⋮</button></div><div class="ph-more-menu" id="phMoreMenu" hidden><a href="pacientes.html">Editar datos y foto</a><button data-notify="La descarga del expediente se habilitará en Archivos">Descargar expediente</button></div></section>
          <nav class="ph-record-nav">${navigation.map(([id,label]) => `<button class="${id === 'filiation' ? 'active' : ''}" data-record-view="${id}"><i>${icons[id]}</i>${label}</button>`).join('')}</nav></aside>
        <section class="ph-workspace"><div class="ph-clinical-heading"><span class="ph-eyebrow">HISTORIA CLÍNICA DIGITAL</span><h2 id="phViewTitle">Filiación</h2><p id="phViewSubtitle">Datos personales y medios de contacto del paciente.</p></div><div class="ph-info-strip"><article><b>▮ Etiquetas</b><button data-summary-edit="tags">＋ Editar</button><span>${escapeHtml(tags)}</span></article><article><b>▰ Nota general</b><button data-summary-edit="note">Editar</button><span>${escapeHtml(patient.notaGeneral || 'Sin notas')}</span></article><article><b>● Alergias</b><button data-summary-edit="allergies">Editar</button><span>${escapeHtml(patient.alergias || 'Sin alergias registradas')}</span></article></div><div id="phView"></div></section>
        <aside class="ph-clinical-rail"><section><h3>Expediente</h3><div class="ph-illustration">◔</div><strong>${escapeHtml(patient.numeroExpediente || '—')}</strong></section><section><div class="ph-rail-title"><h3>Notas de evolución</h3></div><div class="ph-illustration note">▤</div><button data-record-view-shortcut="history">＋ Registrar evolución</button></section></aside>
      </main><div class="ph-sidebar-backdrop" id="phSidebarBackdrop" hidden></div><div class="ph-modal-backdrop" id="phModal" hidden></div><div class="ph-toast" id="phToast" role="status"></div>`;
    document.querySelector('.ph-record-nav').addEventListener('click', onNavigation);
    const menu = document.getElementById('phSidebarToggle');
    const backdrop = document.getElementById('phSidebarBackdrop');
    const mobile = window.matchMedia('(max-width:760px)');
    function syncSidebar(){
      const expanded=mobile.matches?document.body.classList.contains('ph-sidebar-open'):!document.body.classList.contains('ph-sidebar-collapsed');
      menu.setAttribute('aria-expanded',String(expanded));
      menu.textContent=expanded?'‹':'›';
      backdrop.hidden=!mobile.matches||!expanded;
    }
    menu.onclick=()=>{
      if(mobile.matches)document.body.classList.toggle('ph-sidebar-open');
      else document.body.classList.toggle('ph-sidebar-collapsed');
      syncSidebar();
    };
    backdrop.onclick=()=>{document.body.classList.remove('ph-sidebar-open');syncSidebar();};
    mobile.addEventListener('change',()=>{document.body.classList.remove('ph-sidebar-open');syncSidebar();});
    syncSidebar();
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
    const meta={
      filiation:['Filiación','Datos personales y de contacto del paciente.'],
      history:['Historia clínica','Antecedentes médicos y odontológicos del paciente.'],
      odontogram:['Odontograma','Piezas dentales FDI y hallazgos por etapa clínica.'],
      perio:['Periodontograma','Profundidades y sangrado por sitio dental.'],
      prescriptions:['Prescripciones','Redacta, guarda y genera recetas PDF.'],
      files:['Archivos PDF','Documentos privados del paciente.'],
      ortho:['Ortodoncia','Diagnósticos, análisis y controles.'],
      account:['Estado de cuenta','Cargos, abonos y planes de pago.']
    }[id]||['Expediente clínico','Información del paciente'];
    const title=document.getElementById('phViewTitle'),subtitle=document.getElementById('phViewSubtitle');
    if(title)title.textContent=meta[0];
    if(subtitle)subtitle.textContent=meta[1];
    document.body.classList.remove('ph-sidebar-open');
    const overlay=document.getElementById('phSidebarBackdrop');
    if(overlay)overlay.hidden=true;
    const toggle=document.getElementById('phSidebarToggle');
    if(toggle)toggle.setAttribute('aria-expanded',String(!window.matchMedia('(max-width:760px)').matches));
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
      const input = (name, label, type = 'text') => `<label>${label}<input type="${type}" name="${name}" value="${escapeHtml(type==='date'?String(data[name]||'').slice(0,10):data[name]||'')}" autocomplete="off"></label>`;
      const multiline=(name,label,rows=3)=>`<label class="ph-wide">${label}<textarea name="${name}" rows="${rows}">${escapeHtml(data[name]||'')}</textarea></label>`;
      const checkbox=(key,label)=>`<label class="ph-consent"><input type="checkbox" name="${key}" ${data[key]?'checked':''}><span>${label}</span></label>`;
      view.innerHTML = `<section class="ph-card ph-history ph-filiation"><header><div><h2>Información personal</h2><p>Datos generales, fecha de nacimiento y contacto de emergencia.</p></div><button class="ph-primary" id="saveFiliation" type="button">Guardar cambios</button></header>
        <form id="filiationForm"><div class="ph-history-form">
          ${input('nombres','Nombre(s)')}${input('apellidoPaterno','Apellido paterno')}${input('apellidoMaterno','Apellido materno')}
          ${input('fechaNacimiento','Fecha de nacimiento','date')}${input('ocupacion','Ocupación')}${input('domicilio','Domicilio')}
          <label>Sexo<select name="sexo"><option value="">No especificado</option>${['F','M','X','NO_ESPECIFICA'].map(value=>`<option value="${value}" ${data.sexo===value?'selected':''}>${value}</option>`).join('')}</select></label>
          ${input('tutorResponsable','Responsable legal / tutor (si aplica)')}${input('telefono','Teléfono','tel')}${input('correo','Correo','email')}
          ${input('contactoEmergencia','Contacto de emergencia')}${input('telefonoEmergencia','Teléfono de emergencia','tel')}
          ${input('comoNosConocio','¿Cómo nos conoció?')}
          ${multiline('observacionesFiliacion','Observaciones de filiación')}
        </div>
        <h3 class="ph-filiation-subhead">Antecedentes y alertas</h3>
        <div class="ph-history-form">${multiline('antecedentesMedicos','Antecedentes médicos',4)}${multiline('notasAlerta','Notas de alerta',4)}</div>
        <h3 class="ph-filiation-subhead">Consentimiento para recordatorios</h3>
        <p class="ph-consent-help">Activa un canal únicamente cuando el paciente autorice recibir avisos de citas. Los recordatorios no incluyen diagnósticos ni datos clínicos.</p>
        <div class="ph-consent-options">${checkbox('recordatorioCorreoConsentido','El paciente autorizó recordatorios por correo electrónico.')}${checkbox('recordatorioWhatsappConsentido','El paciente autorizó recordatorios por WhatsApp.')}</div>
        </form></section>`;

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
    findingDialogCleanup?.();
    findingDialogCleanup = null;
    view.innerHTML = `<section class="ph-card ph-odontogram"><header class="ph-card-tabs"><div>${Object.keys(stages).map((id) => `<button class="${state.stage === id ? 'active' : ''}" data-odo-stage="${id}">${stageLabels[id]}</button>`).join('')}</div><div class="ph-state-key"><span class="bad">● Mal estado</span><span class="good">● Buen estado</span><button id="newOdontogram">${state.odontogram ? 'Nueva versión' : 'Crear odontograma'}</button>${state.odontogram && state.odontogram.estado !== 'FINALIZADO' ? '<button id="finalizeOdontogram" class="ph-finalize">Finalizar</button>' : ''}</div></header>${odontogramControls()}${state.odontogram ? `<div class="ph-record-status"><span>${escapeHtml(state.odontogram.estado)} · ${formatDate(state.odontogram.creadoAt)}</span><input id="odontogramNotes" maxlength="4000" placeholder="Observaciones del odontograma" value="${escapeHtml(state.odontogram.observaciones || '')}" ${state.odontogram.estado === 'FINALIZADO' ? 'disabled' : ''}></div>` : '<p class="ph-empty-notice">Selecciona un diente. El odontograma se guardará automáticamente al registrar el primer hallazgo.</p>'}<p class="ph-odontogram-help">Se muestran hasta tres símbolos por pieza en esta etapa. <b>+N</b> indica registros adicionales. Selecciona una pieza para ampliarla y consultar todos sus hallazgos.</p><div class="ph-teeth-chart">${dentitionChart()}</div><section class="ph-treatment-plan"><h2>Hallazgos</h2><div class="ph-plan-table"><b>N.º diente</b><b>Hallazgo</b><b>Superficie</b><b>Estado</b><b></b>${state.findings.length ? state.findings.map((item) => `<div class="ph-plan-row"><span>${escapeHtml(toothLabel(Number(item.pieza)))}</span><span class="ph-plan-finding">${findingGlyph(item.icono, item.estadoVisual, true)}${escapeHtml(item.nombre)}</span><span>${escapeHtml(surfaceLabels[item.superficie] || item.superficie || 'Diente completo')}</span><span class="${String(item.estadoVisual).toLowerCase()}">${escapeHtml(item.estadoVisual)}</span><span>${state.odontogram.estado !== 'FINALIZADO' ? `<button class="ph-remove-finding" data-remove-finding="${item.idHallazgo}" aria-label="Eliminar ${escapeHtml(item.nombre)}">×</button>` : ''}</span></div>`).join('') : '<div id="phPlanEmpty">Selecciona un diente para registrar un hallazgo.</div>'}</div></section></section><div class="ph-finding-popover" id="phFindingPopover" hidden></div>`;
    bindOdontogram();
  }

  function bindOdontogram() {
    const selected = new Set();
    document.querySelectorAll('[data-odo-stage]').forEach((button) => button.onclick = async () => { state.stage = button.dataset.odoStage; await loadOdontograms(); });
    document.getElementById('dentitionType').onchange = async (event) => { state.dentition = event.target.value; if (state.odontogram) await saveOdontogramSettings(); else renderOdontogram(); };
    document.getElementById('nomenclature').onchange = async (event) => { state.nomenclature = event.target.value; if (state.odontogram) await saveOdontogramSettings(); else renderOdontogram(); };
    document.getElementById('newOdontogram').onclick = createOdontogram;
    document.getElementById('finalizeOdontogram')?.addEventListener('click', finalizeOdontogram);
    document.getElementById('odontogramNotes')?.addEventListener('change', saveOdontogramSettings);
    document.querySelectorAll('[data-remove-finding]').forEach((button) => button.onclick = () => removeFinding(button.dataset.removeFinding));
    document.querySelectorAll('.ph-tooth').forEach((button) => button.onclick = () => {
      const multiple = document.getElementById('multiSelect').checked;
      if (!multiple) { selected.clear(); document.querySelectorAll('.ph-tooth').forEach((tooth) => { tooth.classList.remove('selected'); tooth.setAttribute('aria-pressed', 'false'); }); }
      button.classList.toggle('selected');
      button.classList.contains('selected') ? selected.add(button.dataset.tooth) : selected.delete(button.dataset.tooth);
      button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
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

  function selectedToothDetails(selected) {
    const teeth = [...selected];
    if (teeth.length !== 1) return `<p class="ph-dialog-note">El hallazgo se agregará a las ${teeth.length} piezas seleccionadas.</p>`;
    const tooth = Number(teeth[0]);
    const findings = findingsForTooth(tooth);
    const quadrant = Math.floor(tooth / 10);
    const arch = [1, 2, 5, 6].includes(quadrant) ? 'upper' : 'lower';
    return `<section class="ph-tooth-detail" aria-label="Registros de la pieza seleccionada"><div class="ph-tooth-enlarged">${toothVisual(tooth, arch, findings)}</div><div class="ph-tooth-detail-content"><h4>${findings.length} registro(s) · ${stageLabels[state.stage]}</h4><p class="ph-detail-hint">Vista: los tres más recientes. La posición del símbolo no representa la superficie anatómica.</p><div class="ph-tooth-detail-list" tabindex="0" aria-label="Todos los registros de esta pieza">${findings.length ? findings.map((item) => `<div class="ph-tooth-detail-row">${findingGlyph(item.icono, item.estadoVisual)}<div><strong>${escapeHtml(item.nombre)}</strong><small>${escapeHtml(surfaceLabels[item.superficie] || item.superficie || 'Diente completo')} · ${escapeHtml(item.estadoVisual || 'NEUTRO')}</small><small>${escapeHtml(String(item.creadoAt || '').replace('T', ' ').slice(0, 16))}</small>${item.observaciones ? `<p>${escapeHtml(item.observaciones)}</p>` : ''}</div></div>`).join('') : '<p class="ph-empty-notice">Todavía no hay hallazgos en esta etapa.</p>'}</div></div></section>`;
  }

  function showFindingPopover(button, selected) {
    const popover = document.getElementById('phFindingPopover');
    if (!selected.size) {
      popover.hidden = true;
      document.body.classList.remove('ph-dialog-open');
      findingDialogCleanup?.();
      findingDialogCleanup = null;
      return;
    }
    const findingRows = state.findingCatalog.map((item) => `<article class="ph-finding-option" data-finding-name="${escapeHtml(normalizeSearch(item.nombre))}"><span>${escapeHtml(item.nombre)}</span><div>${item.variantes.map((variant) => `<button type="button" data-code="${item.codigo}" data-visual-state="${variant}" data-requires-surface="${item.requiereSuperficie ? '1' : '0'}" title="${escapeHtml(item.nombre)} · ${variant}">${findingGlyph(item.icono, variant)}</button>`).join('')}</div></article>`).join('');
    popover.innerHTML = `<section class="ph-finding-dialog ${selected.size === 1 ? '' : 'multi'}" role="dialog" aria-modal="true" aria-labelledby="phFindingTitle"><header><b id="phFindingTitle">Diente${selected.size > 1 ? 's' : ''} ${[...selected].map((id) => toothLabel(Number(id))).join(', ')}</b><button type="button" data-close-finding aria-label="Cerrar">×</button></header>${selectedToothDetails(selected)}<div class="ph-finding-tags"><button type="button" data-quick-code="CARIES" class="bad">Caries</button><button type="button" data-quick-code="RESTAURACION_DEFICIENTE" class="bad">Restau.</button><button type="button" data-quick-code="RESTAURACION" class="good">Restau.</button></div><label class="ph-finding-search"><span>Buscar hallazgo</span><input id="findingSearch" type="search" placeholder="Buscar en ${state.findingCatalog.length} hallazgos" autocomplete="off"></label><div class="ph-finding-form"><label>Superficie<select id="findingSurface"><option value="DIENTE">Diente completo</option><option value="OCLUSAL">Oclusal</option><option value="VESTIBULAR">Vestibular</option><option value="PALATINA">Palatina</option><option value="LINGUAL">Lingual</option><option value="MESIAL">Mesial</option><option value="DISTAL">Distal</option></select></label><label>Nota opcional<input id="findingNote" maxlength="500" placeholder="Observaciones clínicas"></label></div><div class="ph-findings">${findingRows}</div><small class="ph-finding-bottom">Selecciona el símbolo correspondiente al estado. Se guardará en el expediente del paciente.</small></section>`;
    popover.hidden = false;
    document.body.classList.add('ph-dialog-open');
    const close = () => {
      popover.hidden = true;
      document.body.classList.remove('ph-dialog-open');
      findingDialogCleanup?.();
      findingDialogCleanup = null;
      button.focus({ preventScroll: true });
    };
    popover.querySelector('[data-close-finding]').onclick = close;
    popover.onclick = (event) => { if (event.target === popover) close(); };
    popover.querySelector('#findingSearch').oninput = (event) => {
      const query = normalizeSearch(event.target.value.trim());
      popover.querySelectorAll('.ph-finding-option').forEach((row) => { row.hidden = !row.dataset.findingName.includes(query); });
    };
    popover.querySelectorAll('[data-quick-code]').forEach((quick) => quick.onclick = () => popover.querySelector(`[data-code="${quick.dataset.quickCode}"]`)?.click());
    popover.querySelectorAll('[data-code]').forEach((item) => item.onclick = async () => {
      try {
        const selectedSurface = document.getElementById('findingSurface').value;
        const odontogram = await ensureEditableOdontogram();
        await api(`/odontogramas/${odontogram.idOdontograma}/hallazgos`, { method: 'POST', body: JSON.stringify({ piezas: [...selected], codigoHallazgo: item.dataset.code, estadoVisual: item.dataset.visualState, superficie: item.dataset.requiresSurface === '1' || selectedSurface !== 'DIENTE' ? selectedSurface : null, observaciones: document.getElementById('findingNote').value }) });
        popover.hidden = true; document.body.classList.remove('ph-dialog-open'); notify('Hallazgo guardado.'); await loadOdontograms();
      } catch (error) { notify(error.message, true); }
    });
    const onKeydown = (event) => {
      const dialog = popover.querySelector('.ph-finding-dialog');
      if (popover.hidden || !dialog) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')]
        .filter((element) => element.getClientRects().length);
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeydown);
    findingDialogCleanup?.();
    findingDialogCleanup = () => document.removeEventListener('keydown', onKeydown);
    requestAnimationFrame(() => popover.querySelector('#findingSearch')?.focus());
  }

  const perioPoints = ['MESIAL', 'CENTRAL', 'DISTAL'];

  function normalizePerioFace(face) {
    return String(face || '').toUpperCase() === 'PALATINA' ? 'LINGUAL' : String(face || '').toUpperCase();
  }

  function measurementKey(piece, face, point) { return `${piece}|${normalizePerioFace(face)}|${point}`; }

  function measurementHasData(item) {
    return Boolean(item && (Number(item.profundidad) || Number(item.margenGingival)
      || item.sangrado || item.placa || Number(item.movilidad) || Number(item.furcacion) || item.supuracion));
  }

  function perioValue(value) {
    return Number(value) ? escapeHtml(value) : '';
  }

  function perioSiteLabels() {
    return state.perioFace === 'VESTIBULAR'
      ? [{ short: 'MV', full: 'Mesiovestibular' }, { short: 'V', full: 'Vestibular' }, { short: 'DV', full: 'Distovestibular' }]
      : [{ short: 'ML', full: 'Mesiolingual' }, { short: 'L/P', full: 'Lingual o palatina' }, { short: 'DL', full: 'Distolingual' }];
  }

  async function loadPeriodontogram() {
    const view = document.getElementById('phView');
    view.innerHTML = '<section class="ph-card ph-loading">Cargando periodontograma…</section>';
    try {
      const list = await api(`/pacientes/${patientId}/periodontogramas`);
      state.periodontogram = list.items?.[0] || null;
      state.measurements = new Map();
      state.dirtyMeasurements = new Set();
      state.perioNotes = state.periodontogram?.observaciones || '';
      if (state.periodontogram) {
        const data = await api(`/periodontogramas/${state.periodontogram.idPeriodontograma}`);
        state.periodontogram = data.periodontograma;
        state.perioNotes = data.periodontograma.observaciones || '';
        data.mediciones.forEach((item) => {
          const normalized = { ...item, cara: normalizePerioFace(item.cara) };
          if (measurementHasData(normalized)) state.measurements.set(measurementKey(normalized.pieza, normalized.cara, normalized.punto), normalized);
        });
      }
      renderPeriodontogram();
    } catch (error) {
      view.innerHTML = `<section class="ph-card ph-error"><h2>No se pudo cargar el periodontograma</h2><p>${escapeHtml(error.message)}</p></section>`;
    }
  }

  function perioTable(ids) {
    const read = (piece, point) => state.measurements.get(measurementKey(piece, state.perioFace, point)) || {};
    const toothValue = (piece, field) => perioPoints.map((point) => read(piece, point)[field]).find((value) => Number(value)) || '';
    const sites = perioSiteLabels();
    const siteInput = (piece, point, field, type, min, max) => {
      const item = read(piece, point);
      const checked = type === 'checkbox' && item[field] ? 'checked' : '';
      const value = type === 'number' ? `value="${perioValue(item[field])}"` : '';
      const site = sites[perioPoints.indexOf(point)];
      return `<input type="${type}" ${type === 'number' ? `min="${min}" max="${max}" inputmode="numeric" placeholder="—"` : ''} ${value} ${checked} data-perio="${field}" data-piece="${piece}" data-point="${point}" aria-label="${field}, diente ${piece}, ${site.full}">`;
    };
    return `<div class="ph-perio-table"><div class="ph-perio-labels"><b><span class="ph-site-key">${sites.map((site) => `<abbr title="${site.full}">${site.short}</abbr>`).join('')}</span></b><span>Movilidad</span><span>Sangrado</span><span>Placa</span><span>Margen gingival</span><span>Profundidad</span><span>Furcación</span><span>Supuración</span></div><div class="ph-perio-cells">${ids.map((id) => `<div class="ph-perio-col"><b>${id}<small>${sites.map((site) => `<abbr title="${site.full}">${site.short}</abbr>`).join('')}</small></b><input type="number" min="0" max="3" inputmode="numeric" placeholder="—" value="${perioValue(toothValue(id, 'movilidad'))}" data-perio="movilidad" data-piece="${id}" aria-label="Movilidad, diente ${id}"><label class="ph-triple">${perioPoints.map((point) => siteInput(id, point, 'sangrado', 'checkbox')).join('')}</label><label class="ph-triple">${perioPoints.map((point) => siteInput(id, point, 'placa', 'checkbox')).join('')}</label><label class="ph-triple">${perioPoints.map((point) => siteInput(id, point, 'margenGingival', 'number', -15, 15)).join('')}</label><label class="ph-triple">${perioPoints.map((point) => siteInput(id, point, 'profundidad', 'number', 0, 15)).join('')}</label><input type="number" min="0" max="3" inputmode="numeric" placeholder="—" value="${perioValue(toothValue(id, 'furcacion'))}" data-perio="furcacion" data-piece="${id}" aria-label="Furcación, diente ${id}"><label class="ph-triple">${perioPoints.map((point) => siteInput(id, point, 'supuracion', 'checkbox')).join('')}</label></div>`).join('')}</div></div>`;
  }

  function perioTeeth(ids, arch) {
    return `<div class="ph-perio-teeth">${ids.map((id) => `<span class="ph-perio-tooth"><b>${id}</b>${toothArtwork(id, arch)}</span>`).join('')}</div>`;
  }

  function renderPeriodontogram() {
    const view = document.getElementById('phView');
    const locked = state.periodontogram?.estado === 'FINALIZADO';
    view.innerHTML = `<section class="ph-card ph-perio"><header class="ph-simple-tabs"><button class="active" type="button">Periodontograma</button><label>Cara <select id="perioFace"><option value="VESTIBULAR">Vestibular</option><option value="LINGUAL">Lingual / palatina</option></select></label><button class="ph-save" id="savePerio" ${locked ? 'disabled' : ''}>Guardar cambios</button>${state.periodontogram && !locked ? '<button class="ph-finalize" id="finalizePerio">Finalizar</button>' : ''}${locked ? '<button class="ph-primary" id="newPerio">Nueva versión</button>' : ''}</header><p class="ph-perio-help">Registro periodontal de seis sitios por diente: tres vestibulares y tres linguales o palatinos. Los campos sin medición pueden dejarse vacíos.</p><div class="ph-perio-status">${state.periodontogram ? `${escapeHtml(state.periodontogram.estado)} · ${formatDate(state.periodontogram.creadoAt)}` : 'Se creará al guardar'} · Placa <b id="plaquePct">0%</b> · Sangrado <b id="bleedPct">0%</b> · Profundidad media <b id="depthAvg">—</b></div><label class="ph-perio-notes">Observaciones <textarea id="perioNotes" rows="2" maxlength="4000" ${locked ? 'disabled' : ''}>${escapeHtml(state.perioNotes)}</textarea></label><fieldset ${locked ? 'disabled' : ''}><div class="ph-perio-scroll">${perioTable(adultUpper.slice(0,8))}${perioTable(adultUpper.slice(8))}<div class="ph-perio-chart"><svg viewBox="0 0 1000 220" preserveAspectRatio="none" aria-label="Gráfica periodontal superior"><g class="grid">${[30,60,90,120,150,180].map((y) => `<line x1="0" y1="${y}" x2="1000" y2="${y}"/>`).join('')}</g><path id="upperMarginLine" class="margin-line"/><path id="upperDepthLine" class="depth-line"/></svg>${perioTeeth(adultUpper, 'upper')}</div>${perioTable(adultLower.slice(0,8))}${perioTable(adultLower.slice(8))}<div class="ph-perio-chart lower"><svg viewBox="0 0 1000 220" preserveAspectRatio="none" aria-label="Gráfica periodontal inferior"><g class="grid">${[30,60,90,120,150,180].map((y) => `<line x1="0" y1="${y}" x2="1000" y2="${y}"/>`).join('')}</g><path id="lowerMarginLine" class="margin-line"/><path id="lowerDepthLine" class="depth-line"/></svg>${perioTeeth(adultLower, 'lower')}</div></div></fieldset></section>`;
    document.getElementById('perioFace').value = state.perioFace;
    document.getElementById('perioFace').onchange = (event) => {
      collectPerioInputs();
      state.perioNotes = document.getElementById('perioNotes').value;
      state.perioFace = event.target.value;
      renderPeriodontogram();
    };
    document.querySelectorAll('[data-perio]').forEach((input) => input.addEventListener('input', () => {
      const points = input.dataset.point ? [input.dataset.point] : perioPoints;
      points.forEach((point) => state.dirtyMeasurements.add(measurementKey(input.dataset.piece, state.perioFace, point)));
      collectPerioInputs();
      updatePerioSummary();
      syncPerioSaveState();
    }));
    document.getElementById('perioNotes').addEventListener('input', (event) => {
      state.perioNotes = event.target.value;
      state.dirtyMeasurements.add('NOTES');
      syncPerioSaveState();
    });
    document.getElementById('savePerio').onclick = savePeriodontogram;
    document.getElementById('finalizePerio')?.addEventListener('click', finalizePeriodontogram);
    document.getElementById('newPerio')?.addEventListener('click', createPeriodontogramVersion);
    updatePerioSummary();
    syncPerioSaveState();
  }

  function collectPerioInputs() {
    [...new Set([...document.querySelectorAll('[data-perio][data-piece]')].map((input) => input.dataset.piece))].forEach((piece) => {
      perioPoints.forEach((point) => {
        const value = (name) => document.querySelector(`[data-perio="${name}"][data-piece="${piece}"][data-point="${point}"]`);
        const mobility = document.querySelector(`[data-perio="movilidad"][data-piece="${piece}"]`);
        const furcation = document.querySelector(`[data-perio="furcacion"][data-piece="${piece}"]`);
        const item = { pieza: piece, cara: state.perioFace, punto: point, profundidad: Number(value('profundidad')?.value || 0), margenGingival: Number(value('margenGingival')?.value || 0), sangrado: Boolean(value('sangrado')?.checked), placa: Boolean(value('placa')?.checked), movilidad: Number(mobility?.value || 0), furcacion: Number(furcation?.value || 0), supuracion: Boolean(value('supuracion')?.checked) };
        const key = measurementKey(piece, state.perioFace, point);
        if (measurementHasData(item)) state.measurements.set(key, item);
        else state.measurements.delete(key);
      });
    });
  }

  function syncPerioSaveState() {
    const button = document.getElementById('savePerio');
    if (!button || state.periodontogram?.estado === 'FINALIZADO') return;
    const changes = state.dirtyMeasurements.size;
    button.disabled = changes === 0;
    button.textContent = changes ? `Guardar cambios (${changes})` : 'Sin cambios';
  }

  function perioGraphPath(inputs, base, scale) {
    let drawing = false;
    return inputs.map((input, index) => {
      if (!input || input.value === '') { drawing = false; return ''; }
      const command = drawing ? 'L' : 'M';
      drawing = true;
      return `${command}${index / Math.max(inputs.length - 1, 1) * 1000},${base + Number(input.value) * scale}`;
    }).filter(Boolean).join(' ');
  }

  function updatePerioSummary() {
    const depths = [...document.querySelectorAll('[data-perio="profundidad"]')];
    const plaques = [...document.querySelectorAll('[data-perio="placa"]')];
    const bleeds = [...document.querySelectorAll('[data-perio="sangrado"]')];
    const recordedDepths = depths.filter((input) => input.value !== '');
    const average = recordedDepths.reduce((sum, input) => sum + Number(input.value), 0) / Math.max(recordedDepths.length, 1);
    document.getElementById('depthAvg').textContent = recordedDepths.length ? `${average.toFixed(1)} mm` : '—';
    document.getElementById('plaquePct').textContent = `${Math.round(plaques.filter((input) => input.checked).length / Math.max(plaques.length, 1) * 100)}%`;
    document.getElementById('bleedPct').textContent = `${Math.round(bleeds.filter((input) => input.checked).length / Math.max(bleeds.length, 1) * 100)}%`;
    const chart = (prefix, ids) => {
      const inputs = (name) => ids.flatMap((id) => perioPoints.map((point) => document.querySelector(`[data-perio="${name}"][data-piece="${id}"][data-point="${point}"]`)));
      document.getElementById(`${prefix}DepthLine`).setAttribute('d', perioGraphPath(inputs('profundidad'), 110, 7));
      document.getElementById(`${prefix}MarginLine`).setAttribute('d', perioGraphPath(inputs('margenGingival'), 110, -7));
    };
    chart('upper', adultUpper); chart('lower', adultLower);
  }

  async function savePeriodontogram() {
    try {
      collectPerioInputs();
      state.perioNotes = document.getElementById('perioNotes').value;
      if (!state.periodontogram) {
        const created = await api(`/pacientes/${patientId}/periodontogramas`, { method: 'POST', body: JSON.stringify({ observaciones: state.perioNotes }) });
        state.periodontogram = { idPeriodontograma: created.idPeriodontograma, estado: 'BORRADOR', creadoAt: new Date().toISOString(), observaciones: state.perioNotes };
      }
      await api(`/periodontogramas/${state.periodontogram.idPeriodontograma}/mediciones`, { method: 'PUT', body: JSON.stringify({ mediciones: [...state.measurements.values()] }) });
      await api(`/periodontogramas/${state.periodontogram.idPeriodontograma}`, { method: 'PATCH', body: JSON.stringify({ observaciones: state.perioNotes }) });
      state.periodontogram.observaciones = state.perioNotes;
      state.dirtyMeasurements.clear();
      notify('Periodontograma guardado.');
      renderPeriodontogram();
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

  async function createPeriodontogramVersion() {
    try {
      await api(`/pacientes/${patientId}/periodontogramas`, { method: 'POST', body: JSON.stringify({ observaciones: '' }) });
      notify('Nueva versión del periodontograma creada.');
      await loadPeriodontogram();
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
      await renderFiliation();
    } catch (error) {
      app.innerHTML = `<main class="ph-fatal"><h1>No se pudo abrir el expediente</h1><p>${escapeHtml(error.message)}</p><a href="pacientes.html">Volver a pacientes</a></main>`;
    }
  }

  init();
})();
