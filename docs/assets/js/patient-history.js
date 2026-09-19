(function () {
  'use strict';

  const patientId = Number(new URLSearchParams(location.search).get('id')) || 1;
  const patients = {
    1: { name: 'Paciente demo A', age: 8, phone: '33 1234 5678', created: '02 sep 2026', record: 'SSL-0001' },
    2: { name: 'Paciente demo B', age: 11, phone: '33 2468 1357', created: '04 sep 2026', record: 'SSL-0002' },
    3: { name: 'Paciente demo C', age: 5, phone: '33 9876 4321', created: '09 sep 2026', record: 'SSL-0003' },
    4: { name: 'Paciente demo D', age: 13, phone: '33 5555 0182', created: '12 sep 2026', record: 'SSL-0004' },
  };
  const patient = patients[patientId] || patients[1];
  const upper = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  const lower = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
  const app = document.getElementById('patientHistoryApp');

  const icons = {
    filiation: '♙', history: '▤', odontogram: '♧', perio: '♧', ortho: '♜', account: '▱', prescriptions: '▧', files: '▭',
  };
  const nav = [
    ['filiation','Filiación'],['history','Historia clínica'],['odontogram','Odontograma'],['perio','Periodontograma'],['ortho','Ortodoncia'],['account','Estado de cuenta'],['prescriptions','Prescripciones'],['files','Archivos'],
  ];

  function toothType(id) { const n = id % 10; return n <= 2 ? 'incisor' : n === 3 ? 'canine' : n <= 5 ? 'premolar' : 'molar'; }
  function toothSvg(id, arch) {
    const type = toothType(id); const widths = { incisor: 31, canine: 34, premolar: 42, molar: 49 }; const width = widths[type];
    const crown = type === 'molar' ? 'M7 27 Q7 7 17 8 Q25 1 32 8 Q43 6 43 27 Q42 38 35 40 L14 40 Q7 37 7 27Z' : type === 'premolar' ? 'M9 28 Q9 8 19 8 Q25 3 31 8 Q41 9 41 28 Q39 39 31 41 L18 41 Q10 38 9 28Z' : type === 'canine' ? 'M12 30 Q12 9 25 3 Q38 10 38 30 Q35 40 28 42 L21 42 Q14 40 12 30Z' : 'M13 29 Q12 8 20 8 L30 8 Q38 8 37 29 Q35 40 29 42 L21 42 Q15 40 13 29Z';
    const roots = type === 'molar' ? '<path d="M14 39L12 76Q17 70 23 43M34 39L38 76Q31 70 27 43"/>' : type === 'premolar' ? '<path d="M20 40L19 76Q25 69 29 40"/>' : '<path d="M21 40L24 78Q30 68 29 40"/>';
    return `<button class="ph-tooth ${type}" data-tooth="${id}" aria-label="Diente ${id}" style="--tw:${width}px"><span>${id}</span><svg viewBox="0 0 50 82" aria-hidden="true" class="${arch}"><g>${roots}<path class="crown" d="${crown}"/></g></svg></button>`;
  }

  app.innerHTML = `
    <header class="ph-header"><a href="pacientes.html" class="ph-brand"><img src="assets/img/logo-ssl.svg" alt=""><strong>samantha's studio lab</strong></a><nav><a href="agenda.html">Agenda</a><a class="active" href="pacientes.html">Pacientes</a><a href="finanzas.html">Finanzas</a><a href="inventario.html">Inventario</a></nav><div><button data-notify="Nueva cita preparada">＋ Crear</button><span>Administrador</span></div></header>
    <main class="ph-layout">
      <aside class="ph-sidebar">
        <section class="ph-profile"><div class="ph-profile-cover"></div><img src="assets/img/patient-demo.svg" alt="Foto de ${patient.name}"><h1>${patient.name}</h1><p>${patient.age} años</p><small>Creado el ${patient.created}</small><div class="ph-contact"><button data-notify="Abriendo conversación de WhatsApp">◉</button><button data-notify="Preparando correo para el tutor">✉</button><button id="phMoreButton">⋮</button></div><div class="ph-more-menu" id="phMoreMenu" hidden><button>Subir foto</button><button>Descargar expediente</button><button>Fusionar paciente</button><button>Desactivar paciente</button><button class="danger">Eliminar paciente</button></div></section>
        <nav class="ph-record-nav">${nav.map(([id,label]) => `<button class="${id === 'odontogram' ? 'active' : ''}" data-record-view="${id}"><i>${icons[id]}</i>${label}</button>`).join('')}</nav>
      </aside>
      <section class="ph-workspace">
        <div class="ph-info-strip"><article><b>▮ Etiquetas</b><button data-notify="Editor de etiquetas abierto">＋ Agregar</button><span>Paciente activo</span></article><article><b>▰ Notas</b><button data-notify="Nota rápida lista para editar">Escribe aquí</button></article><article><b>● Alergias</b><button data-notify="Registro de alergias abierto">Sin alergias registradas</button></article></div>
        <div id="phView"></div>
      </section>
      <aside class="ph-clinical-rail"><section><h3>Presupuesto</h3><div class="ph-illustration">◔</div><button data-notify="Nuevo presupuesto iniciado">＋ Crear presupuesto</button></section><section><div class="ph-rail-title"><h3>Notas de evolución</h3><button data-notify="Nueva nota de evolución">＋</button></div><div class="ph-illustration note">▤</div><button data-notify="Registro de evolución abierto">＋ Registrar evolución</button></section></aside>
    </main>
    <div class="ph-toast" id="phToast" role="status"></div>`;

  const view = document.getElementById('phView');

  function controls() {
    return `<div class="ph-odo-controls"><label>Doctor<select><option>Dra. Samantha</option><option>Asistente clínica</option></select></label><label>Tipo<select id="dentitionType"><option value="adult">Adulto</option><option value="mixed">Mixto</option><option value="child">Niño</option></select></label><label>Nomenclatura<select id="nomenclature"><option value="fdi">Internacional (FDI)</option><option value="ada">ADA</option></select></label><label class="ph-multi"><input id="multiSelect" type="checkbox"> Marcado múltiple</label></div>`;
  }

  function renderOdontogram(stage = 'initial') {
    view.innerHTML = `<section class="ph-card ph-odontogram"><header class="ph-card-tabs"><div>${[['initial','Odo. inicial'],['evolution','Odo. evolución'],['discharge','Odo. alta']].map(([id,label]) => `<button class="${stage === id ? 'active' : ''}" data-odo-stage="${id}">${label}</button>`).join('')}</div><div class="ph-state-key"><span class="bad">● Mal estado</span><span class="good">● Buen estado</span><button data-notify="Nuevo odontograma creado">Nuevo odontog.</button><button data-notify="Configuración del odontograma">⚙</button></div></header>${controls()}<div class="ph-teeth-chart"><div class="ph-tooth-row upper">${upper.map((id) => toothSvg(id,'upper')).join('')}</div><div class="ph-midline"></div><div class="ph-tooth-row lower">${lower.map((id) => toothSvg(id,'lower')).join('')}</div></div><section class="ph-treatment-plan"><h2>Plan de tratamiento</h2><div class="ph-plan-table"><b>N.º diente</b><b>Hallazgo</b><b>Servicios vinculados</b><b>Nota</b><div id="phPlanEmpty">Selecciona un diente para registrar un hallazgo.</div></div></section></section><div class="ph-finding-popover" id="phFindingPopover" hidden></div>`;
    bindOdontogram();
  }

  function bindOdontogram() {
    const selected = new Set(); const popover = document.getElementById('phFindingPopover');
    const upperChild = [55,54,53,52,51,61,62,63,64,65];
    const lowerChild = [85,84,83,82,81,71,72,73,74,75];
    const upperAda = Array.from({ length: 16 }, (_, index) => index + 1);
    const lowerAda = Array.from({ length: 16 }, (_, index) => 32 - index);
    const applyChartOptions = () => {
      const type = document.getElementById('dentitionType').value;
      const notation = document.getElementById('nomenclature').value;
      document.querySelectorAll('.ph-tooth-row').forEach((row, rowIndex) => {
        const original = rowIndex === 0 ? upper : lower;
        const adultAda = rowIndex === 0 ? upperAda : lowerAda;
        const childFdi = rowIndex === 0 ? upperChild : lowerChild;
        const childAda = (rowIndex === 0 ? 'ABCDEFGHIJ' : 'TSRQPONMLK').split('');
        row.querySelectorAll('.ph-tooth').forEach((tooth, index) => {
          const childIndex = index - 3;
          const isChildSlot = childIndex >= 0 && childIndex < 10;
          tooth.classList.toggle('hidden-dentition', type === 'child' && !isChildSlot);
          tooth.classList.toggle('mixed-dentition', type === 'mixed' && [3,4,11,12].includes(index));
          let id = original[index];
          let label = notation === 'ada' ? adultAda[index] : id;
          if (type === 'child' && isChildSlot) {
            id = childFdi[childIndex];
            label = notation === 'ada' ? childAda[childIndex] : id;
          }
          tooth.dataset.tooth = id;
          tooth.querySelector(':scope > span').textContent = label;
          tooth.setAttribute('aria-label', `Diente ${id}`);
        });
      });
    };
    document.querySelectorAll('[data-odo-stage]').forEach((button) => button.addEventListener('click', () => renderOdontogram(button.dataset.odoStage)));
    document.getElementById('dentitionType').addEventListener('change', applyChartOptions);
    document.getElementById('nomenclature').addEventListener('change', applyChartOptions);
    document.querySelectorAll('.ph-tooth').forEach((button) => button.addEventListener('click', () => {
      const multiple = document.getElementById('multiSelect').checked;
      if (!multiple) { selected.clear(); document.querySelectorAll('.ph-tooth').forEach((tooth) => tooth.classList.remove('selected')); }
      button.classList.toggle('selected'); if (button.classList.contains('selected')) selected.add(button.dataset.tooth); else selected.delete(button.dataset.tooth);
      if (!selected.size) { popover.hidden = true; return; }
      const rect = button.getBoundingClientRect(); popover.style.left = `${Math.min(innerWidth - 390, Math.max(280, rect.left - 80))}px`; popover.style.top = `${Math.min(innerHeight - 360, rect.bottom + 8)}px`; popover.hidden = false;
      popover.innerHTML = `<header><b>Diente${selected.size > 1 ? 's' : ''} ${[...selected].join(', ')}</b><button aria-label="Cerrar">×</button></header><div class="ph-finding-tags"><button class="bad">Caries</button><button class="bad">Restauración deficiente</button><button class="good">Restauración</button></div><label class="ph-finding-search">⌕ <input placeholder="Buscar hallazgo"></label><div class="ph-findings"><button data-finding="Aparato ortodóntico fijo">Aparato ortodóntico fijo <i>⌗</i></button><button data-finding="Aparato removible">Aparato ortodóntico removible <i>⌃</i></button><button data-finding="Bolsa periodontal">Bolsa periodontal <i>⌒</i></button><button data-finding="Caries oclusal">Caries oclusal <i>●</i></button><button data-finding="Restauración">Restauración <i>◆</i></button></div>`;
      popover.querySelector('header button').onclick = () => { popover.hidden = true; };
      popover.querySelectorAll('[data-finding]').forEach((item) => item.onclick = () => { const finding = item.dataset.finding; selected.forEach((id) => { const tooth = document.querySelector(`[data-tooth="${id}"]`); tooth.classList.add(finding.includes('Restauración') ? 'good' : 'bad'); }); document.getElementById('phPlanEmpty').outerHTML = `<div class="ph-plan-row"><span>${[...selected].join(', ')}</span><span>${finding}</span><span>Por vincular</span><span>Demo clínico</span></div>`; popover.hidden = true; notify(`${finding} registrado en el odontograma demostrativo.`); });
    }));
    applyChartOptions();
  }

  function perioTable(ids, group) {
    return `<div class="ph-perio-table"><div class="ph-perio-labels"><b></b><span>Movilidad</span><span>Sangrado al sondaje</span><span>Placa</span><span>Margen gingival</span><span>Profundidad de sondaje</span></div><div class="ph-perio-cells">${ids.map((id, index) => `<div class="ph-perio-col"><b>${id}</b><input type="number" min="0" max="3" value="0" data-perio="mobility" data-index="${group + index}"><label class="ph-triple">${[0,1,2].map((point) => `<input type="checkbox" data-perio="bleed" data-index="${group + index}" data-point="${point}">`).join('')}</label><label class="ph-triple">${[0,1,2].map((point) => `<input type="checkbox" data-perio="plaque" data-index="${group + index}" data-point="${point}">`).join('')}</label><label class="ph-triple">${[0,1,2].map((point) => `<input type="number" min="-6" max="8" value="0" data-perio="margin" data-index="${group + index}" data-point="${point}">`).join('')}</label><label class="ph-triple">${[0,1,2].map((point) => `<input type="number" min="0" max="12" value="0" data-perio="depth" data-index="${group + index}" data-point="${point}">`).join('')}</label></div>`).join('')}</div></div>`;
  }

  function renderPeriodontogram() {
    view.innerHTML = `<section class="ph-card ph-perio"><header class="ph-simple-tabs"><button class="active">Periodontograma</button><button>Plan de tratamiento</button><label>Doctor <select><option>Dra. Samantha</option></select></label><button class="ph-save" data-save-perio>Guardar</button></header><div class="ph-perio-status">Índice de placa <b id="plaquePct">0%</b> · Sangrado <b id="bleedPct">0%</b> · Profundidad media <b id="depthAvg">0.0 mm</b></div><div class="ph-perio-scroll">${perioTable(upper.slice(0,8),0)}${perioTable(upper.slice(8),8)}<div class="ph-perio-chart"><svg viewBox="0 0 1000 220" preserveAspectRatio="none"><g class="grid">${[30,60,90,120,150,180].map((y) => `<line x1="0" y1="${y}" x2="1000" y2="${y}"/>`).join('')}</g><path id="upperMarginLine" class="margin-line" d="M0 112 L1000 112"/><path id="upperDepthLine" class="depth-line" d="M0 112 L1000 112"/></svg><div class="ph-perio-teeth">${upper.map((id) => toothSvg(id,'upper')).join('')}</div></div>${perioTable(lower.slice(0,8),16)}${perioTable(lower.slice(8),24)}<div class="ph-perio-chart lower"><svg viewBox="0 0 1000 220" preserveAspectRatio="none"><g class="grid">${[30,60,90,120,150,180].map((y) => `<line x1="0" y1="${y}" x2="1000" y2="${y}"/>`).join('')}</g><path id="lowerMarginLine" class="margin-line" d="M0 108 L1000 108"/><path id="lowerDepthLine" class="depth-line" d="M0 108 L1000 108"/></svg><div class="ph-perio-teeth">${lower.map((id) => toothSvg(id,'lower')).join('')}</div></div></div></section>`;
    bindPerio();
  }

  function bindPerio() {
    const update = () => {
      const inputs = [...view.querySelectorAll('[data-perio="depth"]')]; const margins = [...view.querySelectorAll('[data-perio="margin"]')]; const plaques = [...view.querySelectorAll('[data-perio="plaque"]')]; const bleeds = [...view.querySelectorAll('[data-perio="bleed"]')];
      const average = inputs.reduce((sum,input) => sum + Number(input.value),0) / Math.max(1,inputs.length); document.getElementById('depthAvg').textContent = `${average.toFixed(1)} mm`; document.getElementById('plaquePct').textContent = `${Math.round(plaques.filter((x) => x.checked).length / plaques.length * 100)}%`; document.getElementById('bleedPct').textContent = `${Math.round(bleeds.filter((x) => x.checked).length / bleeds.length * 100)}%`;
      [['upper',0,48],['lower',48,96]].forEach(([prefix,start,end]) => { const depthValues = inputs.slice(start,end); const marginValues = margins.slice(start,end); const points = (values, base, scale) => values.map((input,index) => `${index/(values.length-1)*1000},${base + Number(input.value)*scale}`).join(' '); document.getElementById(`${prefix}DepthLine`).setAttribute('d', `M${points(depthValues,110,7).replaceAll(' ', ' L')}`); document.getElementById(`${prefix}MarginLine`).setAttribute('d', `M${points(marginValues,110,-7).replaceAll(' ', ' L')}`); });
    };
    view.querySelectorAll('[data-perio]').forEach((input) => input.addEventListener('input', update)); view.querySelector('[data-save-perio]').addEventListener('click', () => notify('Periodontograma guardado en la demostración.')); update();
  }

  function renderGeneric(id) {
    const copy = { filiation:['Filiación','Datos personales, tutor y medios de contacto'], history:['Historia clínica','Antecedentes, alergias y evolución clínica'], ortho:['Ortodoncia','Diagnóstico, análisis y controles de aparatología'], account:['Estado de cuenta','Cargos, abonos y planes de pago'], prescriptions:['Prescripciones','Recetas e indicaciones clínicas'], files:['Archivos','Radiografías, consentimientos y documentos'] }[id];
    view.innerHTML = `<section class="ph-card ph-generic"><h2>${copy[0]}</h2><p>${copy[1]}</p><div class="ph-generic-grid"><article><b>Expediente</b><strong>${patient.record}</strong><span>Paciente activo</span></article><article><b>Última actualización</b><strong>18 sep 2026</strong><span>Dra. Samantha</span></article><article><b>Documentación</b><strong>Completa</strong><span>Consentimiento firmado</span></article></div><button data-notify="Formulario de ${copy[0]} abierto">＋ Agregar registro</button></section>`;
  }

  document.querySelector('.ph-record-nav').addEventListener('click', (event) => { const button = event.target.closest('[data-record-view]'); if (!button) return; document.querySelectorAll('[data-record-view]').forEach((item) => item.classList.toggle('active', item === button)); if (button.dataset.recordView === 'odontogram') renderOdontogram(); else if (button.dataset.recordView === 'perio') renderPeriodontogram(); else renderGeneric(button.dataset.recordView); });
  document.getElementById('phMoreButton').addEventListener('click', () => { const menu = document.getElementById('phMoreMenu'); menu.hidden = !menu.hidden; });
  document.addEventListener('click', (event) => { const trigger = event.target.closest('[data-notify]'); if (trigger) notify(trigger.dataset.notify); });
  function notify(message) { const toast = document.getElementById('phToast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove('show'),2800); }
  renderOdontogram();
})();
