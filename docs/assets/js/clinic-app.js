(function () {
  'use strict';

  const seed = window.SSL_SEED || {};
  const page = document.body.dataset.page || 'dashboard';
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const number = new Intl.NumberFormat('es-MX');

  const nav = [
    { section: 'Operación' },
    { id: 'dashboard', label: 'Inicio', href: 'index.html', icon: '⌂', permissions: ['Administrador', 'Asistente', 'Recepcionista'] },
    { id: 'agenda', label: 'Agenda', href: 'agenda.html', icon: '▣', badge: '8', permissions: ['Administrador', 'Asistente', 'Recepcionista'] },
    { id: 'pacientes', label: 'Pacientes', href: 'pacientes.html', icon: '●', permissions: ['Administrador', 'Asistente', 'Recepcionista'] },
    { id: 'operacion', label: 'Jornada clínica', href: 'operacion.html', icon: '✓', permissions: ['Administrador', 'Asistente'] },
    { id: 'tratamientos', label: 'Tratamientos', href: 'tratamientos.html', icon: '✦', permissions: ['Administrador', 'Asistente', 'Recepcionista'] },
    { id: 'seguimientos', label: 'Seguimientos', href: 'seguimientos.html', icon: '✉', badge: '3', permissions: ['Administrador', 'Asistente', 'Recepcionista'] },
    { id: 'inventario', label: 'Inventario', href: 'inventario.html', icon: '▦', badge: '!', permissions: ['Administrador', 'Asistente'] },
    { id: 'radiografias', label: 'Rayos X', href: 'radiografias.html', icon: '◉', permissions: ['Administrador', 'Asistente'] },
    { section: 'Administración' },
    { id: 'finanzas', label: 'Finanzas y CxC', href: 'finanzas.html', icon: '$', permissions: ['Administrador'] },
    { id: 'reportes', label: 'Reportes', href: 'reportes.html', icon: '↗', permissions: ['Administrador'] },
    { id: 'configuracion', label: 'Configuración', href: 'configuracion.html', icon: '⚙', permissions: ['Administrador'] },
  ];

  const pageMeta = {
    dashboard: ['Panel general', 'Resumen del consultorio'],
    agenda: ['Operación', 'Agenda y confirmaciones'],
    pacientes: ['Expediente único', 'Pacientes y familias'],
    operacion: ['Flujo del día', 'Jornada clínica'],
    tratamientos: ['Catálogo clínico', 'Tratamientos y costos'],
    seguimientos: ['Comunicación', 'Seguimientos automáticos'],
    inventario: ['Insumos', 'Inventario inteligente'],
    radiografias: ['Samantha Studio RX', 'Estudios radiográficos'],
    finanzas: ['Acceso administrador', 'Finanzas y cuentas por cobrar'],
    reportes: ['Metas configurables', 'Reportes operativos'],
    configuracion: ['Seguridad', 'Usuarios y permisos'],
  };

  const demoAppointments = [
    { time: '09:00', minutes: 45, patient: 'Paciente demo A', treatment: 'Procedimiento preventivo', doctor: 'Profesional A', state: 'Confirmada', kind: 'normal' },
    { time: '10:00', minutes: 90, patient: 'Paciente demo B', treatment: 'Procedimiento clínico demo', doctor: 'Profesional A', state: 'Confirmada', kind: 'complex', note: 'Paciente sensible · reservar tiempo adicional' },
    { time: '11:45', minutes: 30, patient: 'Paciente demo C', treatment: 'Revisión especializada', doctor: 'Profesional B', state: 'Por confirmar', kind: 'pending' },
    { time: '12:30', minutes: 60, patient: 'Paciente demo D', treatment: 'Procedimiento demo', doctor: 'Profesional C', state: 'Confirmada', kind: 'normal' },
    { time: '14:30', minutes: 40, patient: 'Paciente demo E', treatment: 'Valoración inicial', doctor: 'Profesional A', state: 'Por confirmar', kind: 'pending' },
    { time: '15:30', minutes: 60, patient: 'Paciente demo F', treatment: 'Procedimiento restaurativo', doctor: 'Profesional A', state: 'Confirmada', kind: 'normal' },
  ];

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const status = (label, tone = 'info') => `<span class="status ${tone}"><span class="dot"></span>${esc(label)}</span>`;
  const kpi = (label, value, note, color) => `<article class="card kpi" style="--kpi:${color}"><span class="kpi-label">${label}</span><strong class="kpi-value">${value}</strong><div class="kpi-note">${note}</div></article>`;
  const button = (label, className = 'secondary', attrs = '') => `<button class="button ${className}" ${attrs}>${label}</button>`;

  function currentRole() {
    return localStorage.getItem('ssl-active-role') || 'Administrador';
  }

  function navigation(role) {
    return nav.filter((item) => item.id && item.permissions.includes(role)).map((item) =>
      `<a href="${item.href}" class="${page === item.id ? 'active' : ''}" data-module="${item.id}"><span class="nav-icon">${item.icon}</span><span>${item.label}</span>${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}</a>`
    ).join('');
  }

  function shell(content) {
    const role = currentRole();
    const meta = pageMeta[page] || pageMeta.dashboard;
    const allowed = nav.find((item) => item.id === page)?.permissions?.includes(role) ?? true;
    document.getElementById('app').innerHTML = `
      <div class="app-shell">
        <header class="dc-header">
          <a class="brand" href="index.html"><img src="assets/img/logo-ssl.svg" alt="Logo Samantha's Studio Lab"><div><strong>samantha's studio lab</strong><span>odontopediatría</span></div></a>
          <button class="dc-menu-button" id="menuButton" aria-label="Abrir navegación" aria-controls="appSidebar">☰</button>
          <nav class="app-nav" id="appSidebar" aria-label="Navegación principal">${navigation(role)}</nav>
          <div class="dc-header-tools">
            <button class="dc-search" data-toast="La búsqueda global se conectará al expediente clínico.">⌕ <span>Buscar</span></button>
            <button class="dc-create" data-modal="appointment">＋ Crear</button>
            <button class="dc-notification" data-toast="No tienes alertas críticas nuevas." aria-label="Notificaciones">♧<span></span></button>
            <div class="dc-profile"><span class="dc-avatar">SS</span><span class="dc-profile-copy"><strong>Samantha Studio</strong><small>${role}</small></span></div>
          </div>
        </header>
        <div class="sidebar-scrim" id="sidebarScrim"></div>
        <main class="app-main">
          <header class="app-topbar">
            <div class="page-identity"><small>${meta[0]}</small><strong>${meta[1]}</strong></div>
            <div class="top-actions"><span class="dc-live"><i></i> Sistema operativo</span><label class="dc-role"><span>Vista</span><select id="activeRole"><option ${role === 'Administrador' ? 'selected' : ''}>Administrador</option><option ${role === 'Asistente' ? 'selected' : ''}>Asistente</option><option ${role === 'Recepcionista' ? 'selected' : ''}>Recepcionista</option></select></label><button class="button primary" data-modal="appointment">＋ <span class="top-label">Nueva cita</span></button></div>
          </header>
          <div class="content">${allowed ? content : accessDenied(role)}</div>
        </main>
      </div>
      <div class="modal-backdrop" id="modalBackdrop" aria-hidden="true"><div class="modal" id="modal"></div></div>
      <div class="toast" id="toast" role="status"></div>`;
  }

  function accessDenied(role) {
    return `<section class="hero"><div class="hero-copy"><p class="eyebrow">Acceso restringido</p><h1>Este módulo no corresponde al rol ${esc(role)}.</h1><p>Cambia a una vista autorizada desde el menú o solicita el permiso al administrador.</p></div></section>`;
  }

  function hero(kicker, title, description, actions = '', mark = '') {
    return `<section class="hero"><div class="hero-copy"><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="hero-actions">${actions}</div>` : ''}${mark ? `<img class="hero-mark" src="${mark}" alt="">` : ''}</section>`;
  }

  function appointmentRows(items = demoAppointments, clinical = false) {
    return `<div class="agenda-day">${items.map((a) => `<article class="appointment ${a.kind}"><div class="appointment-time"><strong>${a.time}</strong><span>${a.minutes} min</span></div><div class="appointment-copy"><strong>${a.patient}</strong><span>${a.treatment} · ${a.doctor}</span>${a.note ? `<span class="negative">● ${a.note}</span>` : ''}</div><div class="appointment-actions">${status(a.state, a.state === 'Confirmada' ? 'success' : 'warning')}${clinical ? button('Registrar', 'soft', `data-modal="procedure" data-patient="${esc(a.patient)}"`) : button('WhatsApp', 'soft', 'data-toast="Recordatorio preparado; requiere conectar WhatsApp Business API."')}</div></article>`).join('')}</div>`;
  }

  function renderDashboard() {
    const monthlyTarget = seed.goals?.monthlyIncomeTarget || 95000;
    shell(
      hero('Vista integral · Septiembre', 'La clínica, sin perder ningún detalle.', 'Agenda, expediente, cobro, materiales y seguimiento conectados alrededor de cada paciente.', `${button('Nueva cita', 'primary', 'data-modal="appointment"')}${button('Registrar paciente', 'secondary', 'data-modal="patient"')}`, 'assets/img/logo-ssl.svg') +
      `<section class="grid kpis">
        ${kpi('Pacientes del último mes', number.format(seed.meta?.patientsLastMonth || 128), '<span class="positive">Datos ficticios</span>', 'var(--lilac-200)')}
        ${kpi('Citas de hoy', '8', '6 confirmadas · 2 pendientes', 'var(--peach-200)')}
        ${kpi('Meta mensual', money.format(monthlyTarget), 'Objetivo del Excel anual', 'var(--gold-400)')}
        ${kpi('Inventario por atender', '12', '<span class="negative">4 compras críticas</span>', 'var(--sage-500)')}
      </section>
      <section class="grid layout">
        <article class="card"><div class="card-head"><div><h2>Agenda de hoy</h2><p>Ordenada por horario, duración y complejidad.</p></div><a class="button soft" href="agenda.html">Abrir agenda</a></div>${appointmentRows(demoAppointments.slice(0, 4))}</article>
        <aside class="grid">
          <article class="card"><div class="card-head"><div><h2>Meta de ingresos</h2><p>Seguimiento contra las metas 2026.</p></div>${status('En curso', 'info')}</div>
            <div class="metric-row"><div class="metric-label"><span>Ingreso estimado</span><strong>$68,000 / $95,000</strong></div><div class="progress"><span style="width:72%"></span></div></div>
            <div class="metric-row"><div class="metric-label"><span>Gasto en materiales</span><strong>18% / máx. 25%</strong></div><div class="progress"><span style="width:72%;background:linear-gradient(90deg,var(--gold-400),var(--peach-500))"></span></div></div>
            <a class="button secondary" href="reportes.html">Ver reporte anual</a>
          </article>
          <article class="card"><div class="card-head"><div><h2>Acciones prioritarias</h2><p>Lo que requiere atención.</p></div></div><div class="list">
            <a class="list-item" href="inventario.html"><span class="list-icon">▦</span><span class="list-copy"><strong>4 insumos en compra</strong><span>Inventario por debajo del mínimo</span></span>${status('Hoy', 'danger')}</a>
            <a class="list-item" href="finanzas.html"><span class="list-icon">$</span><span class="list-copy"><strong>3 pagos vencidos</strong><span>Cuentas por cobrar</span></span>${status('CxC', 'warning')}</a>
            <a class="list-item" href="seguimientos.html"><span class="list-icon">✉</span><span class="list-copy"><strong>8 mensajes programados</strong><span>Citas e indicaciones</span></span>${status('Automático', 'success')}</a>
          </div></article>
        </aside>
      </section>`
    );
  }

  function renderAgenda() {
    const monthDays = [
      { day: 31, muted: true }, { day: 1 }, { day: 2 }, { day: 3 }, { day: 4 }, { day: 5 }, { day: 6 },
      { day: 7 }, { day: 8 }, { day: 9 }, { day: 10 }, { day: 11 }, { day: 12 }, { day: 13 },
      { day: 14, events: [['09:00 · Paciente demo A', 'lilac']] },
      { day: 15, events: [['10:00 · Paciente demo B', 'coral']] },
      { day: 16, events: [['12:00 · Paciente demo C', 'sage']] },
      { day: 17, today: true, events: [['09:00 · Paciente demo D', 'gold'], ['13:00 · Paciente demo E', 'lilac']] },
      { day: 18, events: [['11:00 · Paciente demo F', 'coral']] },
      { day: 19, events: [['10:00 · Paciente demo G', 'sage']] }, { day: 20 },
      { day: 21 }, { day: 22 }, { day: 23 }, { day: 24 }, { day: 25 }, { day: 26 }, { day: 27 },
      { day: 28 }, { day: 29 }, { day: 30 }, { day: 1, muted: true }, { day: 2, muted: true }, { day: 3, muted: true }, { day: 4, muted: true },
    ];
    shell(
      `<section class="dc-agenda-toolbar"><div class="dc-date-nav"><button class="icon-button">‹</button><button class="button secondary">Hoy</button><button class="icon-button">›</button><div><strong id="agendaPeriodTitle">14 – 19 septiembre 2026</strong><small id="agendaPeriodSubtitle">Semana clínica · 38 citas</small></div></div><div class="toolbar"><input class="input search" id="agendaSearch" placeholder="Buscar paciente o tratamiento"><select class="select" id="agendaView" aria-label="Vista de agenda"><option value="week">Semana</option><option value="day">Día</option><option value="month">Mes</option></select><button class="button secondary" data-toast="Integración preparada: falta autorizar Google Calendar.">Sincronizar Google</button></div></section>
      <section class="dc-agenda-view" data-agenda-view="week"><section class="dc-agenda-layout"><article class="dc-calendar card"><div class="dc-calendar-head"><div class="dc-time-label">Hora</div><div>Lun <strong>14</strong></div><div>Mar <strong>15</strong></div><div>Mié <strong>16</strong></div><div class="today">Jue <strong>17</strong></div><div>Vie <strong>18</strong></div><div>Sáb <strong>19</strong></div></div><div class="dc-calendar-body">
        ${['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map((time) => `<div class="dc-hour"><span>${time}</span></div>`).join('')}
        <button class="dc-event lilac" style="--day:1;--start:1;--span:2" data-modal="appointment"><b>09:00</b><strong>Paciente demo A</strong><span>Profilaxis · 45 min</span></button>
        <button class="dc-event coral complex" style="--day:2;--start:2;--span:3" data-modal="appointment"><b>10:00</b><strong>Paciente demo B</strong><span>Tiempo extra · nota clínica</span></button>
        <button class="dc-event sage" style="--day:3;--start:4;--span:2" data-modal="appointment"><b>12:00</b><strong>Paciente demo C</strong><span>Revisión ortopedia</span></button>
        <button class="dc-event gold" style="--day:4;--start:1;--span:2" data-modal="appointment"><b>09:00</b><strong>Paciente demo D</strong><span>Por confirmar</span></button>
        <button class="dc-event lilac" style="--day:4;--start:5;--span:2" data-modal="appointment"><b>13:00</b><strong>Paciente demo E</strong><span>Primera consulta</span></button>
        <button class="dc-event coral" style="--day:5;--start:3;--span:2" data-modal="appointment"><b>11:00</b><strong>Paciente demo F</strong><span>Resina · 60 min</span></button>
        <button class="dc-event sage" style="--day:6;--start:2;--span:2" data-modal="appointment"><b>10:00</b><strong>Paciente demo G</strong><span>Estudio RX</span></button>
      </div></article><aside class="dc-agenda-rail"><article class="card"><div class="card-head"><div><h2>Profesionales</h2><p>Visibilidad en agenda</p></div></div><label class="dc-doctor"><span class="avatar">SA</span><span><strong>Samantha</strong><small>5 citas hoy</small></span><input type="checkbox" checked></label><label class="dc-doctor"><span class="avatar peach">AS</span><span><strong>Asistente</strong><small>3 apoyos</small></span><input type="checkbox" checked></label><label class="dc-doctor"><span class="avatar sage">RX</span><span><strong>Samantha RX</strong><small>2 estudios</small></span><input type="checkbox" checked></label></article><article class="card"><div class="card-head"><div><h2>Estado de hoy</h2><p>Jueves 17</p></div></div><div class="dc-legend"><span><i class="lilac"></i>Confirmadas <b>6</b></span><span><i class="gold"></i>Por confirmar <b>2</b></span><span><i class="coral"></i>Complejas <b>1</b></span><span><i class="sage"></i>RX / apoyo <b>2</b></span></div><div class="callout warning"><strong>Atención:</strong> una cita requiere 90 minutos y manejo especial.</div></article></aside></section></section>
      <section class="dc-agenda-view dc-day-view" data-agenda-view="day" hidden><article class="card"><div class="card-head"><div><h2>Jueves 17 de septiembre</h2><p>Citas ordenadas por hora, duración y complejidad.</p></div>${status('8 citas', 'info')}</div>${appointmentRows(demoAppointments)}</article><aside class="dc-day-summary"><article class="card"><div class="card-head"><div><h2>Resumen del día</h2><p>Estado operativo</p></div></div><div class="dc-legend"><span><i class="lilac"></i>Confirmadas <b>6</b></span><span><i class="gold"></i>Por confirmar <b>2</b></span><span><i class="coral"></i>Complejas <b>1</b></span><span><i class="sage"></i>RX / apoyo <b>2</b></span></div></article><div class="callout warning"><strong>Atención:</strong> una cita requiere 90 minutos y manejo especial.</div></aside></section>
      <section class="dc-agenda-view dc-month-view card" data-agenda-view="month" hidden><div class="dc-month-head">${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((day) => `<span>${day}</span>`).join('')}</div><div class="dc-month-grid">${monthDays.map((item) => `<div class="dc-month-day${item.muted ? ' muted' : ''}${item.today ? ' today' : ''}"><strong>${item.day}</strong>${(item.events || []).map(([label, tone]) => `<button class="dc-month-chip ${tone}" data-modal="appointment">${label}</button>`).join('')}</div>`).join('')}</div></section>`
    );
  }

  function teeth() {
    const upper = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
    const lower = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
    const tooth = (id) => `<button class="tooth ${id === 54 ? 'caries' : id === 64 ? 'treated' : ''}" data-tooth="${id}" aria-label="Diente ${id}">${id}</button>`;
    return `<div class="odontogram"><div class="tooth-row">${upper.map(tooth).join('')}</div><div class="tooth-row">${[55,54,53,52,51,61,62,63,64,65].map(tooth).join('')}</div><div class="tooth-row">${[85,84,83,82,81,71,72,73,74,75].map(tooth).join('')}</div><div class="tooth-row">${lower.map(tooth).join('')}</div><div class="odontogram-legend"><span>○ Sano</span><span style="color:#b34d5d">● Caries</span><span style="color:#497d6b">● Tratado</span><span style="opacity:.5">╳ Ausente</span></div></div>`;
  }

  function renderPatients() {
    shell(
      hero('Expediente clínico único', 'Pacientes, tutores y familias conectados.', 'Foto de perfil, responsable, hermanos, historial, odontograma, pagos y estudios en un solo expediente.', `${button('＋ Nuevo paciente', 'primary', 'data-modal="patient"')}${button('Importar expediente', 'secondary', 'data-toast="La importación segura se habilitará al conectar la base de datos."')}`) +
      `<section class="grid layout"><aside class="card"><div class="card-head"><div><h2>Directorio</h2><p>Datos demostrativos; el repositorio no contiene pacientes reales.</p></div></div><div class="toolbar"><input class="input search" id="patientSearch" placeholder="Nombre, tutor o teléfono"></div><div class="list" id="patientList">
        <button class="list-item active" style="width:100%;text-align:left"><span class="avatar">PA</span><span class="list-copy"><strong>Paciente demo A</strong><span>Familia Rivera · 8 años</span></span>${status('Activo', 'success')}</button>
        <button class="list-item" style="width:100%;text-align:left"><span class="avatar">PB</span><span class="list-copy"><strong>Paciente demo B</strong><span>Familia Rivera · 11 años</span></span></button>
        <button class="list-item" style="width:100%;text-align:left"><span class="avatar">PC</span><span class="list-copy"><strong>Paciente demo C</strong><span>Familia Rivera · 5 años</span></span></button>
        <button class="list-item" style="width:100%;text-align:left"><span class="avatar">PD</span><span class="list-copy"><strong>Paciente demo D</strong><span>Tutor individual · 13 años</span></span></button>
      </div></aside>
      <article class="card"><header class="patient-header"><div class="patient-photo">PA</div><div><h2>Paciente demo A</h2><p>Expediente SSL-DEM-001 · 8 años · Tutor: Familia Rivera</p><div class="patient-meta">${status('Sin alergias', 'success')}${status('Hermano de PB y PC', 'info')}${status('Saldo $0', 'success')}</div></div></header>
        <div class="tabs"><button class="tab active" data-tab="summary">Resumen</button><button class="tab" data-tab="history">Historial</button><button class="tab" data-tab="odontogram">Odontograma</button><button class="tab" data-tab="rx">Rayos X</button><button class="tab" data-tab="documents">Documentos</button></div>
        <div class="tab-panel active" data-panel="summary"><div class="grid two"><div><div class="card-head"><div><h3>Próxima cita</h3><p>Viernes 18 · 10:00</p></div></div><div class="callout"><strong>Procedimiento clínico demo</strong><br>Duración estimada 90 min · nota de manejo especial.</div></div><div><div class="card-head"><div><h3>Familia / tutor</h3><p>Un contacto, tres pacientes vinculados.</p></div></div><div class="list"><div class="list-item"><span class="avatar">FD</span><span class="list-copy"><strong>Familia demo</strong><span>Responsable de PA, PB y PC</span></span></div></div></div></div></div>
        <div class="tab-panel" data-panel="history"><div class="timeline"><div class="timeline-item"><strong>17 sep 2026 · Procedimiento demo</strong><p>Procedimiento finalizado. Indicaciones preventivas enviadas por WhatsApp.</p></div><div class="timeline-item"><strong>02 sep 2026 · Valoración inicial</strong><p>Valoración, odontograma y estudio vinculados al expediente.</p></div></div></div>
        <div class="tab-panel" data-panel="odontogram"><div class="callout"><strong>Odontograma interactivo:</strong> selecciona un diente para cambiar su condición. Cada cambio deberá generar una entrada auditada en el expediente.</div>${teeth()}<div id="toothDetail" class="callout">Selecciona un diente para registrar diagnóstico, superficie y plan.</div></div>
        <div class="tab-panel" data-panel="rx"><div class="list"><a class="list-item" href="radiografias.html"><span class="list-icon">RX</span><span class="list-copy"><strong>Panorámica · 02 sep 2026</strong><span>Vinculada a primera consulta</span></span>${status('Disponible', 'success')}</a></div></div>
        <div class="tab-panel" data-panel="documents"><div class="list"><div class="list-item"><span class="list-icon">PDF</span><span class="list-copy"><strong>Consentimiento informado</strong><span>Firmado · 02 sep 2026</span></span></div><div class="list-item"><span class="list-icon">PDF</span><span class="list-copy"><strong>Política de cancelaciones</strong><span>Aceptada por el tutor</span></span></div></div></div>
      </article></section>`
    );
  }

  function renderOperation() {
    shell(
      hero('Vista de asistentes', 'Los pacientes del día, listos en orden.', 'Sin buscar en toda la base: abre la cita, registra el procedimiento, materiales, odontograma e indicaciones.', `${button('Registrar procedimiento', 'primary', 'data-modal="procedure"')}${button('Ver sólo pendientes', 'secondary', 'data-toast="Filtro de pendientes aplicado en la siguiente conexión de datos."')}`) +
      `<section class="grid layout"><article class="card"><div class="card-head"><div><h2>Pacientes de hoy</h2><p>Ordenados por horario · filtra por nombre, fecha o estado.</p></div>${status('6 por atender', 'info')}</div><div class="toolbar"><input class="input search" placeholder="Buscar paciente"><input class="input" type="date" value="2026-09-17" style="width:auto"></div>${appointmentRows(demoAppointments, true)}</article>
      <aside class="grid"><article class="card"><div class="card-head"><div><h2>Flujo de captura</h2><p>Información clínica con trazabilidad.</p></div></div><div class="list"><div class="list-item"><span class="list-icon">1</span><span class="list-copy"><strong>Abrir cita</strong><span>Identidad, alertas y motivo</span></span></div><div class="list-item"><span class="list-icon">2</span><span class="list-copy"><strong>Procedimiento</strong><span>Diente, diagnóstico y materiales</span></span></div><div class="list-item"><span class="list-icon">3</span><span class="list-copy"><strong>Indicaciones</strong><span>Receta y recordatorios</span></span></div><div class="list-item"><span class="list-icon">4</span><span class="list-copy"><strong>Cerrar atención</strong><span>Firma, cobro y próxima cita</span></span></div></div></article><div class="callout warning"><strong>Permisos:</strong> recepción registra datos básicos y el procedimiento seleccionado; asistentes agregan detalle clínico. Sólo el administrador ve importes globales.</div></aside></section>`
    );
  }

  function matchPrice(name) {
    const normalized = String(name).toLowerCase();
    const aliases = { 'profilaxis': 'profilaxis / limpieza', 'consulta': 'consulta general', 'agenda primera vez': '1ra. consulta', 'urgencia': 'cita de emergencia', 'cementación aparato': 'cementar aparato' };
    const target = aliases[normalized] || normalized;
    return seed.priceList?.find((item) => String(item.name).toLowerCase() === target)?.price || null;
  }

  function renderTreatments() {
    const treatmentRows = (seed.treatments || []).map((t) => {
      const price = matchPrice(t.name);
      return `<tr data-search-row><td><span class="table-title">${esc(t.name)}</span><span class="table-sub">${esc(t.category)}</span></td><td>${t.hours || 'Por definir'} h</td><td>${money.format(t.materialCost || 0)}</td><td>${price ? money.format(price) : 'Pendiente'}</td><td>${price ? status('Precio importado', 'success') : status('Costear', 'warning')}</td><td><button class="button soft" data-toast="Tratamiento seleccionado para editar materiales y tiempo.">Editar</button></td></tr>`;
    }).join('');
    shell(
      hero('52 tratamientos homologados', 'Catálogo clínico y precio en el mismo lugar.', 'El costo combina tiempo de consultorio, materiales por uso y margen deseado; el precio sugerido se recalcula sin perder el precio vigente.', `${button('＋ Nuevo tratamiento', 'primary', 'data-toast="Formulario de tratamiento listo para conectarse al backend."')}${button('Ver materiales', 'secondary', 'data-scroll="calculator"')}`) +
      `<section class="grid layout" id="calculator"><article class="card"><div class="card-head"><div><h2>Calculador de precio</h2><p>Misma lógica de SSL_Calculadora_Precios_2026.</p></div>${status('Fórmula activa', 'success')}</div><div class="form-grid">
        <div class="field"><label>Tratamiento</label><select class="select" id="calcTreatment">${(seed.treatments || []).map((t) => `<option>${esc(t.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Tiempo de sillón (horas)</label><input class="input" id="calcHours" type="number" min="0" step="0.25" value="1"></div>
        <div class="field"><label>Costo por hora de consultorio</label><input class="input" id="calcHourly" type="number" min="0" step="10" value="450"></div>
        <div class="field"><label>Margen deseado</label><input class="input" id="calcMargin" type="number" min="1" max="90" value="30"></div>
        <div class="field"><label>Otros materiales</label><input class="input" id="calcMaterials" type="number" min="0" step=".01" value="80"></div>
        <div class="field"><label>Usos de consumible demo</label><input class="input" id="calcPlaque" type="number" min="0" step="1" value="1"></div>
      </div><div class="grid three" style="margin-top:16px"><div class="callout"><strong id="calcCost">$531.75</strong><br>Costo total</div><div class="callout"><strong id="calcSuggested">$759.64</strong><br>Precio mínimo sugerido</div><div class="callout"><strong>$1.75</strong><br>Costo ficticio del consumible demo</div></div></article>
      <aside class="card"><div class="card-head"><div><h2>Regla de cálculo</h2><p>Evita precios por debajo del costo.</p></div></div><div class="list"><div class="list-item"><span class="list-icon">1</span><span class="list-copy"><strong>Costo de consultorio</strong><span>Horas × costo por hora</span></span></div><div class="list-item"><span class="list-icon">2</span><span class="list-copy"><strong>Costo de materiales</strong><span>Costo unitario × cantidad usada</span></span></div><div class="list-item"><span class="list-icon">3</span><span class="list-copy"><strong>Precio sugerido</strong><span>Costo total ÷ (1 − margen)</span></span></div></div><div class="callout warning" style="margin-top:14px"><strong>Dato pendiente:</strong> los tiempos y consumos faltantes del Excel permanecen como “Por definir”; no se inventan valores clínicos.</div></aside></section>
      <article class="card" style="margin-top:16px"><div class="card-head"><div><h2>Catálogo completo</h2><p>Odontología, ortopedia, ortodoncia, cirugía, estética, diagnóstico y general.</p></div><span>${seed.treatments?.length || 0} registros</span></div><div class="toolbar"><input class="input search" id="treatmentSearch" placeholder="Buscar tratamiento o categoría"></div><div class="table-wrap" style="max-height:620px"><table><thead><tr><th>Tratamiento</th><th>Tiempo</th><th>Materiales</th><th>Precio base</th><th>Estado</th><th></th></tr></thead><tbody id="treatmentTable">${treatmentRows}</tbody></table></div></article>`
    );
  }

  function renderFollowups() {
    shell(
      hero('Mensajería clínica', 'Recordatorios que cuidan la cita y el tratamiento.', 'Programa confirmaciones, medicamentos, curaciones e indicaciones según la fecha y el procedimiento.', `${button('＋ Nuevo seguimiento', 'primary', 'data-toast="Seguimiento creado en modo borrador."')}${button('Plantillas', 'secondary', 'data-toast="Catálogo de plantillas abierto en el siguiente sprint de integración."')}`) +
      `<section class="grid kpis">${kpi('Programados hoy', '8', 'Citas e indicaciones', 'var(--lilac-200)')}${kpi('Confirmaciones', '6', '75% de respuesta', 'var(--sage-500)')}${kpi('Sin respuesta', '2', '<span class="negative">Requieren llamada</span>', 'var(--peach-200)')}${kpi('Tratamientos activos', '14', 'Con recordatorio clínico', 'var(--gold-400)')}</section>
      <section class="grid layout"><article class="card"><div class="card-head"><div><h2>Cola de mensajes</h2><p>WhatsApp Business · consentimiento y bitácora obligatorios.</p></div>${status('API pendiente', 'warning')}</div><div class="list"><div class="list-item"><span class="list-icon">09</span><span class="list-copy"><strong>Paciente demo A · Medicamento</strong><span>“Recuerda seguir la indicación de tu profesional…”</span></span><div class="list-end"><strong>09:00</strong><span>día 2 de 5</span></div></div><div class="list-item"><span class="list-icon">12</span><span class="list-copy"><strong>Paciente demo C · Confirmación</strong><span>Cita mañana a las 11:45 · Revisión demo</span></span><div class="list-end"><strong>12:00</strong><span>18 h antes</span></div></div><div class="list-item"><span class="list-icon">18</span><span class="list-copy"><strong>Paciente demo D · Cuidados</strong><span>Indicaciones posteriores al procedimiento</span></span><div class="list-end"><strong>18:00</strong><span>día 1 de 3</span></div></div></div></article>
      <aside class="grid"><article class="card"><div class="card-head"><div><h2>Automatizaciones base</h2><p>Configurables por tratamiento.</p></div></div><div class="list"><div class="list-item"><span class="list-icon">36</span><span class="list-copy"><strong>Recordatorio de cita</strong><span>Ejemplo: 36 horas antes</span></span>${status('Activa', 'success')}</div><div class="list-item"><span class="list-icon">18</span><span class="list-copy"><strong>Solicitar confirmación</strong><span>Ejemplo: 18 horas antes</span></span>${status('Activa', 'success')}</div><div class="list-item"><span class="list-icon">Rx</span><span class="list-copy"><strong>Indicaciones clínicas</strong><span>Frecuencia según procedimiento</span></span>${status('Por regla', 'info')}</div></div></article><div class="callout warning"><strong>Importante:</strong> la interfaz no envía mensajes todavía. Se necesita una cuenta aprobada de WhatsApp Business, plantillas autorizadas, consentimiento y backend con reintentos/auditoría.</div></aside></section>`
    );
  }

  function inventoryTone(item) {
    const text = String(item.sourceStatus || '').toLowerCase();
    if (text.includes('comprar')) return ['Comprar', 'danger'];
    if (text.includes('bajo')) return ['Bajo', 'warning'];
    if (typeof item.current === 'number' && typeof item.minimum === 'number' && item.current <= item.minimum) return [item.current === 0 ? 'Comprar' : 'Bajo', item.current === 0 ? 'danger' : 'warning'];
    if (typeof item.current !== 'number') return ['Revisar unidad', 'info'];
    return ['OK', 'success'];
  }

  function renderInventory() {
    const rows = (seed.inventory || []).map((item) => {
      const [label, tone] = inventoryTone(item);
      return `<tr data-search-row data-tone="${tone}"><td><span class="table-title">${esc(item.product)}</span><span class="table-sub">${esc(item.category || 'Sin categoría')}</span></td><td>${esc(item.current ?? '—')} <span class="table-sub">${esc(item.unit || '')}</span></td><td>${esc(item.minimum ?? '—')}</td><td>${esc(item.optimal ?? '—')}</td><td>${esc(item.supplier || 'Por definir')}</td><td>${item.approximateCost ? money.format(item.approximateCost) : '—'}</td><td>${status(label, tone)}</td><td><button class="button soft" data-toast="Consumo registrado en borrador; el backend descontará por tratamiento.">Registrar uso</button></td></tr>`;
    }).join('');
    const counts = (seed.inventory || []).reduce((acc, item) => { acc[inventoryTone(item)[1]] = (acc[inventoryTone(item)[1]] || 0) + 1; return acc; }, {});
    shell(
      hero('Mayor oportunidad operativa', 'Inventario descontado desde cada procedimiento.', 'Cada material conserva unidad, mínimo, óptimo, proveedor y punto de reposición. El 25% es el valor inicial y puede ajustarse por insumo.', `${button('Registrar conteo semanal', 'primary', 'data-toast="Conteo semanal guardado localmente en modo demostración."')}${button('Generar orden de compra', 'secondary', 'data-toast="Orden preparada con insumos críticos y bajos."')}`) +
      `<section class="grid kpis">${kpi('Insumos importados', number.format(seed.inventory?.length || 0), '6 categorías del Excel', 'var(--lilac-200)')}${kpi('Compra inmediata', counts.danger || 0, 'Cantidad en cero o marcada comprar', 'var(--peach-200)')}${kpi('Nivel bajo', counts.warning || 0, 'En o debajo del mínimo', 'var(--gold-400)')}${kpi('Unidad por validar', counts.info || 0, 'Texto como ¼ o mezcla de piezas', 'var(--sage-500)')}</section>
      <div class="callout" style="margin-bottom:16px"><strong>Automatización propuesta:</strong> al cerrar un procedimiento, el sistema descuenta la receta de materiales (por pieza, cartucho, caja, frasco o fracción). El conteo físico semanal corrige diferencias. Si el remanente llega al mínimo configurado o al 25% del óptimo, genera alerta y borrador de compra.</div>
      <article class="card"><div class="card-head"><div><h2>Inventario maestro</h2><p>Importado de la pestaña “Inventario”; los valores ambiguos se conservan para revisión humana.</p></div></div><div class="toolbar"><input class="input search" id="inventorySearch" placeholder="Producto, categoría o proveedor"><select class="select" id="inventoryFilter" style="width:auto"><option value="">Todos los estados</option><option value="danger">Comprar</option><option value="warning">Bajo</option><option value="info">Revisar unidad</option><option value="success">OK</option></select></div><div class="table-wrap" style="max-height:680px"><table><thead><tr><th>Producto</th><th>Actual</th><th>Mínimo</th><th>Óptimo</th><th>Proveedor</th><th>Costo</th><th>Estado</th><th></th></tr></thead><tbody id="inventoryTable">${rows}</tbody></table></div></article>`
    );
  }

  function renderFinance() {
    shell(
      hero('Sólo administrador', 'Cobros, gastos y compromisos visibles a tiempo.', 'Cuentas por cobrar, calendario de pagos, comisiones, laboratorio, nómina y ventas en una sola lectura.', `${button('Registrar ingreso', 'primary', 'data-toast="Ingreso preparado con los campos del Registro Diario."')}${button('Exportar cierre', 'secondary', 'data-toast="El cierre se exportará cuando exista una base de datos conectada."')}`) +
      `<section class="grid kpis">${kpi('Ingresos del mes', '$72,000', '72% de meta demo', 'var(--lilac-200)')}${kpi('Por cobrar', '$14,500', '<span class="negative">$2,400 vencidos</span>', 'var(--peach-200)')}${kpi('Gastos', '$26,000', 'Datos ficticios', 'var(--gold-400)')}${kpi('Utilidad estimada', '$46,000', '<span class="positive">Escenario demostrativo</span>', 'var(--sage-500)')}</section>
      <div class="tabs"><button class="tab active" data-tab="cxc">Cuentas por cobrar</button><button class="tab" data-tab="payments">Calendario de pagos</button><button class="tab" data-tab="lab">Laboratorio externo</button><button class="tab" data-tab="payroll">Nómina y especialistas</button><button class="tab" data-tab="sales">Ventas</button></div>
      <div class="tab-panel active" data-panel="cxc"><article class="card"><div class="card-head"><div><h2>Planes de pago</h2><p>Paciente, tutor, tratamiento, total, anticipo, saldo, próxima fecha y estado.</p></div>${button('Nuevo plan', 'soft', 'data-toast="Nuevo plan de pago en borrador."')}</div><div class="table-wrap"><table><thead><tr><th>Paciente</th><th>Tratamiento</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Próximo pago</th><th>Estado</th></tr></thead><tbody><tr><td>Paciente demo B<span class="table-sub">Tutor demo</span></td><td>Plan demo A</td><td>$8,400</td><td>$4,200</td><td>$4,200</td><td>12 sep 2026</td><td>${status('Vencido', 'danger')}</td></tr><tr><td>Paciente demo E</td><td>Plan demo B</td><td>$13,600</td><td>$8,000</td><td>$5,600</td><td>19 sep 2026</td><td>${status('Esta semana', 'warning')}</td></tr><tr><td>Paciente demo F</td><td>Plan demo C</td><td>$7,200</td><td>$6,400</td><td>$800</td><td>30 sep 2026</td><td>${status('Al corriente', 'success')}</td></tr></tbody></table></div></article></div>
      <div class="tab-panel" data-panel="payments"><article class="card"><div class="card-head"><div><h2>Calendario de pagos</h2><p>Fechas, importes y seguimiento por plan.</p></div></div><div class="callout">Los abonos actualizan automáticamente el acumulado pagado, saldo restante y estado del plan.</div></article></div>
      <div class="tab-panel" data-panel="lab"><article class="card"><div class="card-head"><div><h2>Laboratorio externo</h2><p>Remisión, trabajo, anticipos, saldos y entrega esperada.</p></div></div><div class="table-wrap"><table><thead><tr><th>Remisión</th><th>Paciente</th><th>Aparato / trabajo</th><th>Costo lab</th><th>Saldo lab</th><th>Entrega</th><th>Estado</th></tr></thead><tbody><tr><td>REM-DEM-01</td><td>Paciente demo C</td><td>Trabajo de laboratorio demo</td><td>$1,200</td><td>$600</td><td>22 sep 2026</td><td>${status('En proceso', 'info')}</td></tr></tbody></table></div></article></div>
      <div class="tab-panel" data-panel="payroll"><section class="grid two"><article class="card"><div class="card-head"><div><h2>Nómina semanal</h2><p>Categoría, cinco semanas, total pagado y notas.</p></div></div><div class="callout">Recepción/caja y asistente dental conservan captura semanal y consolidado mensual.</div></article><article class="card"><div class="card-head"><div><h2>Liquidación de especialistas</h2><p>Porcentajes de clínica/doctora, material y frecuencia de pago.</p></div></div><div class="callout">Los porcentajes deben versionarse por especialista para no cambiar liquidaciones históricas.</div></article></section></div>
      <div class="tab-panel" data-panel="sales"><article class="card"><div class="card-head"><div><h2>Venta de productos</h2><p>${seed.saleProducts?.length || 0} productos importados del catálogo.</p></div></div><div class="list">${(seed.saleProducts || []).slice(0, 8).map((p) => `<div class="list-item"><span class="list-icon">＋</span><span class="list-copy"><strong>${esc(p)}</strong><span>Precio y existencia por configurar</span></span></div>`).join('')}</div></article></div>`
    );
  }

  function renderRx() {
    shell(
      hero('Samantha Studio RX', 'Estudios enlazados al expediente correcto.', 'El archivo radiográfico aparece sólo en procedimientos que lo requieren, con fecha, tipo, técnico y solicitante.', `${button('Subir estudio', 'primary', 'data-toast="Carga DICOM preparada; requiere almacenamiento clínico seguro."')}${button('Abrir paciente', 'secondary', 'data-toast="Expediente de Paciente demo A abierto."')}`, 'assets/img/logo-ssrx.svg') +
      `<section class="grid layout"><article class="card"><div class="card-head"><div><h2>Visor clínico demostrativo</h2><p>Panorámica · Paciente demo A · 02 sep 2026</p></div>${status('Vinculada', 'success')}</div><div class="rx-viewer"><span class="rx-label">VISTA DEMOSTRATIVA · NO ES UNA RADIOGRAFÍA REAL</span><div class="rx-skull" id="rxSkull"></div><div class="rx-controls"><button data-rx="left" title="Girar izquierda">↶</button><button data-rx="right" title="Girar derecha">↷</button><button data-rx="reset" title="Restablecer">⌂</button></div></div></article>
      <aside class="grid"><article class="card"><div class="card-head"><div><h2>Metadatos</h2><p>Registro proveniente de Samantha RX.</p></div></div><div class="list"><div class="list-item"><span class="list-copy"><strong>Tipo</strong><span>Panorámica</span></span></div><div class="list-item"><span class="list-copy"><strong>Procedimiento relacionado</strong><span>Primera consulta / diagnóstico</span></span></div><div class="list-item"><span class="list-copy"><strong>Archivo</strong><span>DICOM + miniatura segura</span></span></div></div></article><div class="callout warning"><strong>3D real:</strong> requiere archivos DICOM/CBCT compatibles y un visor médico (p. ej. OHIF/Cornerstone), además de almacenamiento cifrado. Esta maqueta sólo valida el flujo y los controles.</div></aside></section>
      <article class="card" style="margin-top:16px"><div class="card-head"><div><h2>Registro de estudios</h2><p>Fecha, tipo, solicitante, técnico, importe, forma de pago, origen y comisión bancaria.</p></div></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Paciente</th><th>Tipo</th><th>Solicita</th><th>Técnico</th><th>Importe</th><th>Estado</th></tr></thead><tbody><tr><td>02 sep 2026</td><td>Paciente demo A</td><td>Panorámica</td><td>Odontopediatría</td><td>Técnico RX</td><td>$200</td><td>${status('Disponible', 'success')}</td></tr></tbody></table></div></article>`
    );
  }

  function renderReports() {
    const months = ['Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const values = [52,63,58,71,75,82,73,0,0,0];
    shell(
      hero('Dashboard Anual · Datos ficticios', 'Del dato diario a la decisión anual.', 'El vaciado mensual alimenta ingresos, gastos, utilidad, pacientes, ticket, crecimiento, proyección y punto de equilibrio.', `${button('Imprimir reporte', 'primary', 'onclick="window.print()"')}${button('Exportar Excel', 'secondary', 'data-toast="La exportación conservará la estructura homologada."')}`) +
      `<section class="grid kpis">${kpi('Ingreso mínimo mensual', money.format(seed.goals?.monthlyIncomeMinimum || 70000), 'Meta demo', 'var(--lilac-200)')}${kpi('Ingreso objetivo', money.format(seed.goals?.monthlyIncomeTarget || 95000), 'Meta demo', 'var(--peach-200)')}${kpi('Ticket objetivo', money.format(seed.goals?.ticketTarget || 700), 'Dato ficticio', 'var(--gold-400)')}${kpi('Utilidad neta mínima', money.format(seed.goals?.monthlyNetProfitMinimum || 35000), 'Dato ficticio', 'var(--sage-500)')}</section>
      <section class="grid layout"><article class="card"><div class="card-head"><div><h2>Avance mensual contra meta</h2><p>Marzo–diciembre, como en el archivo anual.</p></div>${status('73% septiembre', 'info')}</div><div class="bars">${months.map((m, i) => `<div class="bar-wrap"><div class="bar" style="height:${values[i]}%${values[i] === 0 ? ';opacity:.16' : ''}"></div><span>${m}</span></div>`).join('')}</div></article>
      <aside class="card"><div class="card-head"><div><h2>Parámetros personales</h2><p>Único conjunto editable en la pestaña Metas.</p></div></div><div class="metric-row"><div class="metric-label"><span>Pacientes por día</span><strong>6 mínimo · 10 objetivo</strong></div><div class="progress"><span style="width:70%"></span></div></div><div class="metric-row"><div class="metric-label"><span>Materiales / ingresos</span><strong>15–20%</strong></div><div class="progress"><span style="width:85%;background:var(--gold-400)"></span></div></div><div class="callout"><strong>Regla:</strong> las metas cambian a futuro; los resultados históricos conservan la meta vigente de su periodo.</div></aside></section>
      <article class="card" style="margin-top:16px"><div class="card-head"><div><h2>Mapa de archivos homologado</h2><p>Las pestañas se conservan como entidades o reportes equivalentes.</p></div></div><div class="grid three">${Object.entries(seed.sourceSheets || {}).map(([key, sheets]) => `<div class="callout"><strong>${esc(key)}</strong><br>${sheets.map(esc).join(' · ')}</div>`).join('')}</div></article>`
    );
  }

  function renderConfig() {
    const capabilities = [
      ['Agenda, pacientes e historial', true, true, true],
      ['Anotación básica de procedimiento', true, true, true],
      ['Detalle clínico y odontograma', true, true, false],
      ['Rayos X e inventario', true, true, false],
      ['Finanzas, metas y reportes', true, false, false],
      ['Usuarios, roles e integraciones', true, false, false],
    ];
    shell(
      hero('Tres roles claros', 'Cada persona ve sólo lo necesario.', 'Administrador, asistente y recepcionista con permisos acordes a la reunión y trazabilidad por usuario.', `${button('＋ Nuevo usuario', 'primary', 'data-modal="user"')}${button('Guardar permisos', 'secondary', 'data-toast="Matriz de permisos guardada en modo demostración."')}`) +
      `<section class="grid layout"><article class="card"><div class="card-head"><div><h2>Matriz de permisos</h2><p>Los controles reales deben validarse también en el servidor.</p></div></div><div class="table-wrap"><div class="permission-matrix"><div class="matrix-head">Capacidad</div><div class="matrix-head">Administrador</div><div class="matrix-head">Asistente</div><div class="matrix-head">Recepcionista</div>${capabilities.map((row) => row.map((value, i) => `<div>${i === 0 ? value : value ? '<span class="check">✓</span>' : '<span class="dash">—</span>'}</div>`).join('')).join('')}</div></div></article>
      <aside class="grid"><article class="card"><div class="card-head"><div><h2>Usuarios</h2><p>Sin contraseñas almacenadas en el navegador.</p></div></div><div class="list"><div class="list-item"><span class="avatar">SS</span><span class="list-copy"><strong>Administración SSL</strong><span>admin@clinica.example</span></span>${status('Administrador', 'info')}</div><div class="list-item"><span class="avatar">AS</span><span class="list-copy"><strong>Asistente demo</strong><span>asistente@clinica.example</span></span>${status('Asistente', 'success')}</div><div class="list-item"><span class="avatar">RE</span><span class="list-copy"><strong>Recepción demo</strong><span>recepcion@clinica.example</span></span>${status('Recepcionista', 'warning')}</div></div></article><div class="callout warning"><strong>Seguridad:</strong> el backend debe usar hash de contraseña, sesión segura, segundo factor para administración, bitácora y control por permiso; nunca guardar contraseñas en localStorage.</div></aside></section>
      <section class="grid three" style="margin-top:16px"><article class="card"><div class="card-head"><div><h2>Google Calendar</h2><p>Agenda y eventos.</p></div>${status('Pendiente', 'warning')}</div>${button('Autorizar cuenta', 'secondary', 'data-toast="Se requiere OAuth del consultorio."')}</article><article class="card"><div class="card-head"><div><h2>WhatsApp Business</h2><p>Recordatorios y confirmación.</p></div>${status('Pendiente', 'warning')}</div>${button('Configurar API', 'secondary', 'data-toast="Se requieren número, cuenta Meta y plantillas aprobadas."')}</article><article class="card"><div class="card-head"><div><h2>Almacenamiento clínico</h2><p>Fotos, PDF y DICOM.</p></div>${status('Pendiente', 'warning')}</div>${button('Configurar', 'secondary', 'data-toast="Se requiere almacenamiento cifrado y política de retención."')}</article></section>`
    );
  }

  const renderers = {
    dashboard: renderDashboard,
    agenda: renderAgenda,
    pacientes: renderPatients,
    operacion: renderOperation,
    tratamientos: renderTreatments,
    seguimientos: renderFollowups,
    inventario: renderInventory,
    finanzas: renderFinance,
    radiografias: renderRx,
    reportes: renderReports,
    configuracion: renderConfig,
  };

  function modalContent(type, trigger) {
    const close = '<button class="icon-button" data-close-modal aria-label="Cerrar">×</button>';
    const headers = {
      appointment: ['Nueva cita', 'Programa duración, complejidad y recordatorios.'],
      patient: ['Nuevo paciente', 'Crea el expediente y enlázalo a su tutor o familia.'],
      procedure: ['Registrar procedimiento', `Captura clínica de ${trigger?.dataset.patient || 'la cita seleccionada'}.`],
      user: ['Nuevo usuario', 'Asigna acceso según el rol acordado.'],
    };
    const [title, subtitle] = headers[type] || headers.appointment;
    let fields = '';
    if (type === 'appointment') fields = `<div class="field wide"><label>Paciente</label><input class="input" required placeholder="Buscar o registrar paciente"></div><div class="field"><label>Fecha</label><input class="input" type="date" required></div><div class="field"><label>Hora</label><input class="input" type="time" required></div><div class="field"><label>Tratamiento</label><select class="select">${(seed.treatments || []).map((t) => `<option>${esc(t.name)}</option>`).join('')}</select></div><div class="field"><label>Duración</label><select class="select"><option>30 minutos</option><option>45 minutos</option><option>60 minutos</option><option>90 minutos</option></select></div><div class="field wide"><label>Complejidad / nota roja</label><textarea class="textarea" placeholder="Manejo especial, tiempo extra o indicaciones para recepción"></textarea></div>`;
    if (type === 'patient') fields = `<div class="field"><label>Nombre(s)</label><input class="input" required></div><div class="field"><label>Apellidos</label><input class="input" required></div><div class="field"><label>Fecha de nacimiento</label><input class="input" type="date"></div><div class="field"><label>Familia / tutor</label><input class="input" placeholder="Buscar tutor existente"></div><div class="field"><label>Teléfono del tutor</label><input class="input" type="tel"></div><div class="field"><label>Foto de perfil</label><input class="input" type="file" accept="image/*"></div><div class="field wide"><label>Alertas clínicas</label><textarea class="textarea" placeholder="Alergias, medicamentos, manejo o antecedentes"></textarea></div>`;
    if (type === 'procedure') fields = `<div class="field"><label>Procedimiento</label><select class="select">${(seed.treatments || []).map((t) => `<option>${esc(t.name)}</option>`).join('')}</select></div><div class="field"><label>Diente / región</label><input class="input" placeholder="Ej. 54 · oclusal"></div><div class="field wide"><label>Detalle clínico</label><textarea class="textarea" placeholder="Diagnóstico, hallazgos y procedimiento realizado"></textarea></div><div class="field wide"><label>Indicaciones y seguimiento</label><textarea class="textarea" placeholder="Medicamento, curaciones y frecuencia de recordatorios"></textarea></div>`;
    if (type === 'user') fields = `<div class="field"><label>Nombre de usuario</label><input class="input" required></div><div class="field"><label>Correo</label><input class="input" type="email" required></div><div class="field"><label>Rol</label><select class="select"><option>Administrador</option><option>Asistente</option><option>Recepcionista</option></select></div><div class="field"><label>Invitación</label><select class="select"><option>Enviar enlace por correo</option><option>Copiar enlace seguro</option></select></div>`;
    return `<div class="modal-head"><div><h2>${title}</h2><p style="margin:5px 0 0;color:var(--muted);font-size:10px">${subtitle}</p></div>${close}</div><form id="demoForm"><div class="form-grid">${fields}</div><div class="form-actions"><button type="button" class="button secondary" data-close-modal>Cancelar</button><button class="button primary" type="submit">Guardar</button></div></form>`;
  }

  function bindCommon() {
    const body = document.body;
    const menu = document.getElementById('menuButton');
    const closeMenu = () => body.classList.remove('nav-open');
    menu?.addEventListener('click', () => body.classList.toggle('nav-open'));
    document.getElementById('sidebarScrim')?.addEventListener('click', closeMenu);
    document.getElementById('activeRole')?.addEventListener('change', (event) => { localStorage.setItem('ssl-active-role', event.target.value); window.location.href = 'index.html'; });

    let toastTimer;
    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
    }
    document.addEventListener('click', (event) => {
      const toastTrigger = event.target.closest('[data-toast]');
      if (toastTrigger) showToast(toastTrigger.dataset.toast);
      const scrollTrigger = event.target.closest('[data-scroll]');
      if (scrollTrigger) document.getElementById(scrollTrigger.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
      const modalTrigger = event.target.closest('[data-modal]');
      if (modalTrigger) {
        const backdrop = document.getElementById('modalBackdrop');
        document.getElementById('modal').innerHTML = modalContent(modalTrigger.dataset.modal, modalTrigger);
        backdrop.classList.add('open');
        backdrop.setAttribute('aria-hidden', 'false');
      }
      if (event.target.closest('[data-close-modal]') || event.target.id === 'modalBackdrop') closeModal();
    });
    document.addEventListener('submit', (event) => {
      if (event.target.id !== 'demoForm') return;
      event.preventDefault();
      closeModal();
      showToast('Registro guardado en la demostración. El backend persistirá y auditará el cambio.');
    });
    function closeModal() {
      const backdrop = document.getElementById('modalBackdrop');
      backdrop?.classList.remove('open');
      backdrop?.setAttribute('aria-hidden', 'true');
    }
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeModal(); closeMenu(); } });

    document.querySelectorAll('[data-tab]').forEach((tab) => tab.addEventListener('click', () => {
      const parent = tab.closest('.tabs');
      const name = tab.dataset.tab;
      parent.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item === tab));
      let next = parent.nextElementSibling;
      while (next?.classList.contains('tab-panel')) { next.classList.toggle('active', next.dataset.panel === name); next = next.nextElementSibling; }
    }));

    document.querySelectorAll('.tooth').forEach((tooth) => tooth.addEventListener('click', () => {
      const states = ['', 'caries', 'treated', 'absent'];
      const current = states.findIndex((state) => state && tooth.classList.contains(state));
      states.slice(1).forEach((state) => tooth.classList.remove(state));
      const next = states[(current + 1) % states.length];
      if (next) tooth.classList.add(next);
      const labels = { '': 'Sano', caries: 'Caries', treated: 'Tratado', absent: 'Ausente' };
      const detail = document.getElementById('toothDetail');
      if (detail) detail.innerHTML = `<strong>Diente ${tooth.dataset.tooth} · ${labels[next]}</strong><br>Agrega superficie, diagnóstico, evidencia y plan de tratamiento. El cambio quedará ligado al usuario y fecha.`;
    }));

    const calcInputs = ['calcHours', 'calcHourly', 'calcMargin', 'calcMaterials', 'calcPlaque'].map((id) => document.getElementById(id)).filter(Boolean);
    const calculate = () => {
      const hours = Number(document.getElementById('calcHours')?.value || 0);
      const hourly = Number(document.getElementById('calcHourly')?.value || 0);
      const margin = Math.min(90, Number(document.getElementById('calcMargin')?.value || 0)) / 100;
      const materials = Number(document.getElementById('calcMaterials')?.value || 0);
      const consumable = Number(document.getElementById('calcPlaque')?.value || 0) * 1.75;
      const cost = hours * hourly + materials + consumable;
      const suggested = margin < 1 ? cost / (1 - margin) : cost;
      if (document.getElementById('calcCost')) document.getElementById('calcCost').textContent = money.format(cost);
      if (document.getElementById('calcSuggested')) document.getElementById('calcSuggested').textContent = money.format(suggested);
    };
    calcInputs.forEach((input) => input.addEventListener('input', calculate));
    calculate();

    function bindTableSearch(inputId, tableId) {
      document.getElementById(inputId)?.addEventListener('input', (event) => {
        const query = event.target.value.trim().toLowerCase();
        document.querySelectorAll(`#${tableId} [data-search-row]`).forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(query); });
      });
    }
    bindTableSearch('treatmentSearch', 'treatmentTable');
    bindTableSearch('inventorySearch', 'inventoryTable');
    document.getElementById('inventoryFilter')?.addEventListener('change', (event) => {
      document.querySelectorAll('#inventoryTable [data-search-row]').forEach((row) => { row.hidden = Boolean(event.target.value) && row.dataset.tone !== event.target.value; });
    });
    document.getElementById('agendaSearch')?.addEventListener('input', (event) => {
      const q = event.target.value.toLowerCase();
      document.querySelectorAll('[data-agenda-view] .dc-event, [data-agenda-view] .appointment, [data-agenda-view] .dc-month-chip').forEach((item) => { item.hidden = !item.textContent.toLowerCase().includes(q); });
    });

    const agendaView = document.getElementById('agendaView');
    const setAgendaView = (view) => {
      const validView = ['week', 'day', 'month'].includes(view) ? view : 'week';
      const copy = {
        week: ['14 – 19 septiembre 2026', 'Semana clínica · 38 citas'],
        day: ['Jueves 17 septiembre 2026', 'Agenda del día · 8 citas'],
        month: ['Septiembre 2026', 'Vista mensual · 38 citas'],
      };
      document.querySelectorAll('[data-agenda-view]').forEach((panel) => { panel.hidden = panel.dataset.agendaView !== validView; });
      if (agendaView) agendaView.value = validView;
      if (document.getElementById('agendaPeriodTitle')) document.getElementById('agendaPeriodTitle').textContent = copy[validView][0];
      if (document.getElementById('agendaPeriodSubtitle')) document.getElementById('agendaPeriodSubtitle').textContent = copy[validView][1];
      localStorage.setItem('ssl-agenda-view', validView);
    };
    if (agendaView) {
      agendaView.addEventListener('change', (event) => setAgendaView(event.target.value));
      setAgendaView(localStorage.getItem('ssl-agenda-view') || 'week');
    }

    let rxRotation = 0;
    document.querySelectorAll('[data-rx]').forEach((control) => control.addEventListener('click', () => {
      if (control.dataset.rx === 'left') rxRotation -= 15;
      if (control.dataset.rx === 'right') rxRotation += 15;
      if (control.dataset.rx === 'reset') rxRotation = 0;
      const skull = document.getElementById('rxSkull');
      if (skull) skull.style.transform = `perspective(500px) rotateY(${rxRotation}deg)`;
    }));
  }

  (renderers[page] || renderDashboard)();
  bindCommon();
})();
