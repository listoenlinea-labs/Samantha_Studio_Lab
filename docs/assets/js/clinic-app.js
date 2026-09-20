(function () {
  'use strict';

  const seed = window.SSL_SEED || {};
  const page = document.body.dataset.page || 'dashboard';
  const money = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });
  const number = new Intl.NumberFormat('es-MX');

  const nav = [{
    section: 'Operación'
  },
  {
    id: 'dashboard',
    label: 'Inicio',
    href: 'index.html',
    icon: '⌂',
    permissions: ['Administrador', 'Asistente', 'Recepcionista']
  },
  {
    id: 'agenda',
    label: 'Agenda',
    href: 'agenda.html',
    icon: '▣',
    badge: '8',
    permissions: ['Administrador', 'Asistente', 'Recepcionista']
  },
  {
    id: 'pacientes',
    label: 'Pacientes',
    href: 'pacientes.html',
    icon: '●',
    permissions: ['Administrador', 'Asistente', 'Recepcionista']
  },
  {
    id: 'operacion',
    label: 'Jornada clínica',
    href: 'operacion.html',
    icon: '✓',
    permissions: ['Administrador', 'Asistente']
  },
  {
    id: 'tratamientos',
    label: 'Tratamientos',
    href: 'tratamientos.html',
    icon: '✦',
    permissions: ['Administrador', 'Asistente', 'Recepcionista']
  },
  {
    id: 'seguimientos',
    label: 'Seguimientos',
    href: 'seguimientos.html',
    icon: '✉',
    badge: '3',
    permissions: ['Administrador', 'Asistente', 'Recepcionista']
  },
  {
    id: 'inventario',
    label: 'Inventario',
    href: 'inventario.html',
    icon: '▦',
    badge: '!',
    permissions: ['Administrador', 'Asistente']
  },
  {
    id: 'radiografias',
    label: 'Rayos X',
    href: 'radiografias.html',
    icon: '◉',
    permissions: ['Administrador', 'Asistente']
  },
  {
    section: 'Administración'
  },
  {
    id: 'finanzas',
    label: 'Finanzas y CxC',
    href: 'finanzas.html',
    icon: '$',
    permissions: ['Administrador']
  },
  {
    id: 'reportes',
    label: 'Reportes',
    href: 'reportes.html',
    icon: '↗',
    permissions: ['Administrador']
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    href: 'configuracion.html',
    icon: '⚙',
    permissions: ['Administrador']
  },
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

  const demoAppointments = [{
    time: '09:00',
    minutes: 45,
    patient: 'Paciente demo A',
    treatment: 'Camitas · procedimiento preventivo',
    doctor: 'Profesional A',
    chair: 'A',
    state: 'Confirmada',
    kind: 'normal'
  },
  {
    time: '10:00',
    minutes: 90,
    patient: 'Paciente demo B',
    treatment: 'Procedimiento clínico demo',
    doctor: 'Profesional A',
    chair: 'B',
    state: 'Confirmada',
    kind: 'complex',
    note: 'Paciente sensible · reservar tiempo adicional'
  },
  {
    time: '11:30',
    minutes: 30,
    patient: 'Paciente demo C',
    treatment: 'Revisión especializada',
    doctor: 'Profesional B',
    chair: 'C',
    state: 'Por confirmar',
    kind: 'pending'
  },
  {
    time: '12:30',
    minutes: 60,
    patient: 'Paciente demo D',
    treatment: 'Camitas · adaptación',
    doctor: 'Profesional C',
    chair: 'A',
    state: 'Confirmada',
    kind: 'normal'
  },
  {
    time: '14:30',
    minutes: 40,
    patient: 'Paciente demo E',
    treatment: 'Valoración inicial',
    doctor: 'Profesional A',
    chair: 'B',
    state: 'Por confirmar',
    kind: 'pending'
  },
  {
    time: '15:30',
    minutes: 60,
    patient: 'Paciente demo F',
    treatment: 'Procedimiento restaurativo',
    doctor: 'Profesional A',
    chair: 'C',
    state: 'Confirmada',
    kind: 'normal'
  },
  ];

  const dentalChairs = [{
    id: 'A',
    name: 'Silla A',
    specialty: 'Silla de camitas',
    rule: 'Exclusiva para citas de camitas',
    nextAvailable: '09:45',
    tone: 'camitas'
  }, {
    id: 'B',
    name: 'Silla B',
    specialty: 'Atención general',
    rule: 'No admite camitas',
    nextAvailable: '11:30',
    tone: 'general'
  }, {
    id: 'C',
    name: 'Silla C',
    specialty: 'Atención general',
    rule: 'No admite camitas',
    nextAvailable: '09:00',
    tone: 'general'
  }];

  const monthAppointmentEvents = [{ date: '2026-09-14', time: '09:00', patient: 'Paciente demo A', chair: 'A', tone: 'lilac' },
  { date: '2026-09-17', time: '13:00', patient: 'Paciente demo E', chair: 'B', tone: 'gold' },
  { date: '2026-09-23', time: '11:30', patient: 'Paciente demo C', chair: 'C', tone: 'sage' },
  { date: '2026-10-06', time: '10:00', patient: 'Paciente futura A', chair: 'A', tone: 'lilac' },
  { date: '2026-10-19', time: '12:30', patient: 'Paciente futura B', chair: 'B', tone: 'coral' },
  { date: '2026-11-12', time: '09:30', patient: 'Paciente futura C', chair: 'C', tone: 'sage' }];

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
  const status = (label, tone = 'info') => `<span class="status ${tone}"><span class="dot"></span>${esc(label)}</span>`;
  const kpi = (label, value, note, color) => `<article class="card kpi" style="--kpi:${color}"><span class="kpi-label">${label}</span><strong class="kpi-value">${value}</strong><div class="kpi-note">${note}</div></article>`;
  const button = (label, className = 'secondary', attrs = '') => `<button class="button ${className}" ${attrs}>${label}</button>`;

  function currentRole() {
    return localStorage.getItem('ssl-active-role') || 'Administrador';
  }

  function navigation(role) {
    const allowedItems = nav.filter((item) => item.id && item.permissions.includes(role));
    const directIds = ['dashboard', 'agenda', 'pacientes'];
    const groups = [{
      id: 'clinica',
      label: 'Clínica',
      icon: '✦',
      items: ['operacion', 'tratamientos', 'seguimientos', 'radiografias']
    }, {
      id: 'administracion',
      label: 'Administración',
      icon: '▦',
      items: ['finanzas', 'reportes', 'configuracion']
    }];
    const link = (item, child = false) =>
      `<a href="${item.href}" class="${page === item.id ? 'active' : ''}${child ? ' nav-child' : ''}" data-module="${item.id}"><span class="nav-icon">${item.icon}</span><span>${item.label}</span>${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}</a>`;
    const directLinks = directIds
      .map((id) => allowedItems.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => link(item))
      .join('');
    const groupedLinks = groups.map((group) => {
      const items = group.items
        .map((id) => allowedItems.find((item) => item.id === id))
        .filter(Boolean);

      if (!items.length) return '';

      const isActive = items.some((item) => item.id === page);
      return `<div class="nav-group${isActive ? ' active' : ''}">
        <button class="nav-group-trigger" type="button" aria-expanded="false">
          <span class="nav-icon">${group.icon}</span><span>${group.label}</span><span class="nav-chevron" aria-hidden="true"><svg viewBox="0 0 12 8" focusable="false"><path d="M1 1.5 6 6.5 11 1.5" /></svg></span>
        </button>
        <div class="nav-group-menu" role="menu" aria-label="${group.label}">
          ${items.map((item) => link(item, true)).join('')}
        </div>
      </div>`;
    }).join('');

    const inventory = allowedItems.find((item) => item.id === 'inventario');
    return `${directLinks}${groupedLinks}${inventory ? link(inventory) : ''}`;
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
            <button class="dc-notification" data-toast="No tienes alertas críticas nuevas." aria-label="Notificaciones">♧<span></span></button>
            <div class="dc-profile"><span class="dc-avatar">SS</span><span class="dc-profile-copy"><strong>Samantha Studio</strong><small>${role}</small></span></div>
          </div>
        </header>
        <div class="sidebar-scrim" id="sidebarScrim"></div>
        <main class="app-main">
          <header class="app-topbar">
            <div class="page-identity"><small>${meta[0]}</small><strong>${meta[1]}</strong></div>
            <div class="top-actions"><span class="dc-live"><i></i> Sistema operativo</span><label class="dc-role"><span>Vista</span><select id="activeRole"><option ${role === 'Administrador' ? 'selected' : ''}>Administrador</option><option ${role === 'Asistente' ? 'selected' : ''}>Asistente</option><option ${role === 'Recepcionista' ? 'selected' : ''}>Recepcionista</option></select></label></div>
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
    return `<div class="agenda-day">${items.map((a) => `<article class="appointment ${a.kind}"><div class="appointment-time"><strong>${a.time}</strong><span>${a.minutes} min</span></div><div class="appointment-copy"><strong>${a.patient}</strong><span>${a.treatment} · ${a.doctor}</span>${a.chair ? `<span class="appointment-chair chair-${a.chair.toLowerCase()}">Silla ${a.chair}${a.chair === 'A' ? ' · Camitas' : ' · General'}</span>` : ''}${a.note ? `<span class="negative">● ${a.note}</span>` : ''}</div><div class="appointment-actions">${status(a.state, a.state === 'Confirmada' ? 'success' : 'warning')}${clinical ? button('Registrar', 'soft', `data-modal="procedure" data-patient="${esc(a.patient)}"`) : button('WhatsApp', 'soft', 'data-toast="Recordatorio preparado; requiere conectar WhatsApp Business API."')}</div></article>`).join('')}</div>`;
  }

  function chairAvailabilityBoard() {
    return `<section class="dc-chair-section" aria-labelledby="chairAvailabilityTitle">
      <div class="dc-chair-section-head">
        <div><p class="eyebrow">Resumen de ocupación de hoy</p><h2 id="chairAvailabilityTitle">Reservas de las tres sillas</h2><p>Compara rápidamente las reservas de hoy y después consulta el detalle diario, semanal o mensual de cada silla.</p></div>
        ${status('3 sillas activas', 'success')}
      </div>
      <div class="dc-chair-grid">
        ${dentalChairs.map((chair) => {
      const appointments = demoAppointments.filter((appointment) => appointment.chair === chair.id);
      const availableSlots = Math.max(0, 6 - appointments.length);
      const usage = Math.round((appointments.length / 6) * 100);
      return `<article class="dc-chair-card ${chair.tone}">
            <div class="dc-chair-card-head">
              <div><span class="dc-chair-id">${chair.name}</span><h3>${chair.specialty}</h3></div>
              <span class="dc-chair-rule">${chair.id === 'A' ? 'Sólo camitas' : 'Sin camitas'}</span>
            </div>
            <p>${chair.rule}</p>
            <div class="dc-chair-capacity"><strong>${availableSlots} espacios disponibles</strong><span>${appointments.length} ${appointments.length === 1 ? 'reserva' : 'reservas'}</span></div>
            <div class="dc-chair-progress" aria-label="${usage}% de ocupación"><span style="width:${usage}%"></span></div>
            <div class="dc-chair-next"><span>Próximo espacio</span><strong>${chair.nextAvailable}</strong></div>
            <div class="dc-chair-slots">
              ${appointments.map((appointment) => `<div class="dc-chair-slot"><time>${appointment.time}</time><span><strong>${appointment.patient}</strong><small>${appointment.treatment}</small></span></div>`).join('')}
            </div>
          </article>`;
    }).join('')}
      </div>
    </section>`;
  }

  function chairModeView() {
    return `<section class="dc-agenda-mode-view dc-chair-mode" data-agenda-mode-view="chairs" hidden>
      ${chairAvailabilityBoard()}
      <section class="dc-chair-schedule card">
        <div class="dc-chair-schedule-head">
          <div><p class="eyebrow">Disponibilidad sin cálculos</p><h2>Agenda por silla</h2><p>Selecciona una silla y después usa Día, Semana o Mes para revisar únicamente sus citas.</p></div>
          <div class="dc-chair-tabs" role="tablist" aria-label="Seleccionar silla">
            ${dentalChairs.map((chair, index) => `<button class="dc-chair-tab${index === 0 ? ' active' : ''}" type="button" role="tab" data-chair-select="${chair.id}" aria-selected="${index === 0}"><strong>${chair.name}</strong><span>${chair.specialty}</span></button>`).join('')}
          </div>
        </div>
        <div id="chairScheduleTimeline" class="dc-chair-timeline" aria-live="polite"></div>
      </section>
    </section>`;
  }

  function renderDashboard() {
    const monthlyTarget = seed.goals?.monthlyIncomeTarget || 95000;
    shell(
      hero('Vista integral · Septiembre', 'La clínica, sin perder ningún detalle.', 'Agenda, expediente, cobro, materiales y seguimiento conectados alrededor de cada paciente.', `${button('Registrar paciente', 'secondary', 'data-modal="patient"')}`, 'assets/img/logo-ssl.svg') +
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
    const canCreateAppointment = ['Administrador', 'Recepcionista'].includes(currentRole());
    shell(
      `<section class="dc-agenda-toolbar">
        <div class="dc-date-nav">
          <button
            class="icon-button"
            id="agendaPrevious"
            type="button"
            aria-label="Periodo anterior"
          >
            ‹
          </button>

          <button
            class="button secondary"
            id="agendaToday"
            type="button"
          >
            Hoy
          </button>

          <button
            class="icon-button"
            id="agendaNext"
            type="button"
            aria-label="Periodo siguiente"
          >
            ›
          </button>

          <div>
            <strong id="agendaPeriodTitle">14 – 19 septiembre 2026</strong>
            <small id="agendaPeriodSubtitle">Semana clínica · 38 citas</small>
          </div>
        </div>

        <div class="dc-agenda-actions">
          ${canCreateAppointment ? button('+ Nueva cita', 'primary dc-agenda-create', 'data-modal="appointment"') : ''}
          <!-- Conservamos tu buscador -->
          <input
            class="input dc-agenda-search"
            id="agendaSearch"
            placeholder="Buscar paciente o tratamiento"
            autocomplete="off"
          >

          <!-- Selector Semana / Día / otras vistas -->
          <div class="dc-view-selector" aria-label="Seleccionar vista">
            <button
              class="dc-view-button active"
              type="button"
              data-agenda-set="week"
              title="Vista semanal"
            >
              S
            </button>

            <button
              class="dc-view-button"
              type="button"
              data-agenda-set="day"
              title="Vista diaria"
            >
              D
            </button>

            <div class="dc-view-dropdown">
              <button
                class="dc-view-button dc-dropdown-toggle"
                id="agendaViewMenuButton"
                type="button"
                aria-label="Más vistas"
                aria-expanded="false">
                <svg
                  class="dc-chevron-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true">
                  <path d="M7 9.5 12 14.5 17 9.5"></path>
                </svg>
              </button>

              <div class="dc-dropdown-menu dc-view-menu" id="agendaViewMenu" hidden>
                <span class="dc-menu-title">Selecciona una vista</span>

                <button type="button" data-agenda-set="month">
                  Por mes
                </button>

                <button type="button" data-agenda-set="day">
                  Por día
                </button>

                <button
                  type="button"
                  data-toast="La vista detallada por doctor estará disponible al conectar los profesionales."
                >
                  Detallado por doctor
                </button>

                <button
                  type="button"
                  data-toast="La vista diaria por consultorio estará disponible al conectar los consultorios."
                >
                  Diaria por consultorio
                </button>
              </div>
            </div>
          </div>

          <!-- Calendario y confirmaciones -->
          <div class="dc-agenda-button-group">
            <button
              class="dc-agenda-icon active"
              id="agendaCalendarMode"
              type="button"
              aria-label="Mostrar calendario"
              title="Mostrar calendario">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="5.5" width="17" height="15" rx="2"></rect>
                <path d="M7.5 3.5v4M16.5 3.5v4M3.5 9.5h17"></path>
                <path d="M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2"></path>
              </svg>
            </button>

            <button
              class="dc-agenda-icon"
              id="agendaFollowupMode"
              type="button"
              aria-label="Mostrar seguimientos"
              title="Mostrar seguimientos">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5"></circle>
                <path d="m8.2 12.2 2.5 2.5 5.4-5.8"></path>
              </svg>
            </button>

            <button
              class="dc-agenda-icon"
              id="agendaChairMode"
              type="button"
              aria-label="Mostrar agenda por sillas"
              title="Mostrar agenda por sillas">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 4.5h14v5H5zM4 13h4v6.5H4zM10 13h4v6.5h-4zM16 13h4v6.5h-4z"></path>
              </svg>
            </button>
          </div>

          <!-- Abre el modal de configuración -->
          <button
            class="dc-agenda-tool"
            type="button"
            data-modal="agendaConfig"
            aria-label="Configurar agenda"
            title="Configurar agenda">
            <span></span>
            <span></span>
            <span></span>
          </button>

          <!-- Menú de tres puntos -->
          <div class="dc-options-dropdown">
            <button
              class="dc-agenda-tool dc-kebab"
              id="agendaOptionsButton"
              type="button"
              aria-label="Más opciones"
              aria-expanded="false">
              ⋮
            </button>

            <div class="dc-dropdown-menu dc-options-menu" id="agendaOptionsMenu" hidden>
              <button
                type="button"
                data-toast="La descarga de la agenda se habilitará al conectar la base de datos.">
                <span>⇩</span>
                Descargar
              </button>

              <button
                type="button"
                data-toast="No existen citas eliminadas en esta demostración.">
                <span>▦</span>
                Citas eliminadas
              </button>
            </div>
          </div>
        </div>
      </section>
      <div class="dc-agenda-mode-view" data-agenda-mode-view="calendar">
      <section class="dc-agenda-view" data-agenda-view="week"><section class="dc-agenda-layout"><article class="dc-calendar card"><div class="dc-calendar-head"><div class="dc-time-label">Hora</div><div data-week-day="0">
  <span>Lun</span>
  <strong>14</strong>
</div>

<div data-week-day="1">
  <span>Mar</span>
  <strong>15</strong>
</div>

<div data-week-day="2">
  <span>Mié</span>
  <strong>16</strong>
</div>

<div data-week-day="3" class="today">
  <span>Jue</span>
  <strong>17</strong>
</div>

<div data-week-day="4">
  <span>Vie</span>
  <strong>18</strong>
</div>

<div data-week-day="5">
  <span>Sáb</span>
  <strong>19</strong>
</div></div><div class="dc-calendar-body">
        ${['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((time) => `<div class="dc-hour"><span>${time}</span></div>`).join('')}
        <button class="dc-event lilac" style="--day:1;--start:1;--span:2" data-modal="appointment"><b>09:00 · Silla A</b><strong>Paciente demo A</strong><span>Camitas · 45 min</span></button>
        <button class="dc-event coral complex" style="--day:2;--start:2;--span:3" data-modal="appointment"><b>10:00 · Silla B</b><strong>Paciente demo B</strong><span>General · tiempo extra</span></button>
        <button class="dc-event sage" style="--day:3;--start:4;--span:2" data-modal="appointment"><b>12:00 · Silla C</b><strong>Paciente demo C</strong><span>General · revisión ortopedia</span></button>
        <button class="dc-event gold" style="--day:4;--start:1;--span:2" data-modal="appointment"><b>09:00 · Silla A</b><strong>Paciente demo D</strong><span>Camitas · por confirmar</span></button>
        <button class="dc-event lilac" style="--day:4;--start:5;--span:2" data-modal="appointment"><b>13:00 · Silla B</b><strong>Paciente demo E</strong><span>General · primera consulta</span></button>
        <button class="dc-event coral" style="--day:5;--start:3;--span:2" data-modal="appointment"><b>11:00 · Silla C</b><strong>Paciente demo F</strong><span>General · resina · 60 min</span></button>
        <button class="dc-event sage" style="--day:6;--start:2;--span:2" data-modal="appointment"><b>10:00 · Silla B</b><strong>Paciente demo G</strong><span>General · estudio RX</span></button>
      </div></article><aside class="dc-agenda-rail"><article class="card"><div class="card-head"><div><h2>Profesionales</h2><p>Visibilidad en agenda</p></div></div><label class="dc-doctor"><span class="avatar">SA</span><span><strong>Samantha</strong><small>5 citas hoy</small></span><input type="checkbox" checked></label><label class="dc-doctor"><span class="avatar peach">AS</span><span><strong>Asistente</strong><small>3 apoyos</small></span><input type="checkbox" checked></label><label class="dc-doctor"><span class="avatar sage">RX</span><span><strong>Samantha RX</strong><small>2 estudios</small></span><input type="checkbox" checked></label></article><article class="card"><div class="card-head"><div><h2>Estado de hoy</h2><p>Jueves 17</p></div></div><div class="dc-legend"><span><i class="lilac"></i>Confirmadas <b>6</b></span><span><i class="gold"></i>Por confirmar <b>2</b></span><span><i class="coral"></i>Complejas <b>1</b></span><span><i class="sage"></i>RX / apoyo <b>2</b></span></div><div class="callout warning"><strong>Atención:</strong> una cita requiere 90 minutos y manejo especial.</div></article></aside></section></section>
      <section class="dc-agenda-view dc-day-view" data-agenda-view="day" hidden><article class="card"><div class="card-head"><div><h2 id="agendaDayTitle">Jueves 17 de septiembre</h2><p>Citas ordenadas por hora, duración y complejidad.</p></div>${status('8 citas', 'info')}</div>${appointmentRows(demoAppointments)}</article><aside class="dc-day-summary"><article class="card"><div class="card-head"><div><h2>Resumen del día</h2><p>Estado operativo</p></div></div><div class="dc-legend"><span><i class="lilac"></i>Confirmadas <b>6</b></span><span><i class="gold"></i>Por confirmar <b>2</b></span><span><i class="coral"></i>Complejas <b>1</b></span><span><i class="sage"></i>RX / apoyo <b>2</b></span></div></article><div class="callout warning"><strong>Atención:</strong> una cita requiere 90 minutos y manejo especial.</div></aside></section>
      <section class="dc-agenda-view dc-month-view card" data-agenda-view="month" hidden><div class="dc-month-context"><strong id="agendaMonthHeading">Septiembre 2026</strong><span>Usa ‹ y › para consultar y agendar meses futuros.</span></div><div class="dc-month-head">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => `<span>${day}</span>`).join('')}</div><div class="dc-month-grid" id="agendaMonthGrid"></div></section>
      </div>
      ${chairModeView()}
      <section
  class="dc-agenda-mode-view dc-followup-view"
  data-agenda-mode-view="followups"
  hidden
>
  <article class="card dc-followup-card">
    <div class="dc-followup-toolbar">
      <div>
        <h2>Seguimientos y tareas</h2>
        <p>Control de actividades relacionadas con pacientes y tratamientos.</p>
      </div>

      <button
        class="button primary"
        type="button"
        data-toast="Nuevo seguimiento preparado."
      >
        + Nuevo seguimiento
      </button>
    </div>

    <div class="table-wrap">
      <table class="dc-followup-table">
        <thead>
          <tr>
            <th>Fecha límite</th>
            <th>Paciente</th>
            <th>Tarea</th>
            <th>Estado</th>
            <th>Nota de seguimiento</th>
            <th>Responsable</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>18 sep 2026</td>
            <td>
              <strong>Paciente demo A</strong>
              <span class="table-sub">SSL-DEM-001</span>
            </td>
            <td>Confirmar próxima consulta</td>
            <td>
              ${status('Pendiente', 'warning')}
            </td>
            <td>Contactar al tutor por WhatsApp.</td>
            <td>Samantha</td>
          </tr>

          <tr>
            <td>19 sep 2026</td>
            <td>
              <strong>Paciente demo B</strong>
              <span class="table-sub">SSL-DEM-002</span>
            </td>
            <td>Revisar evolución</td>
            <td>
              ${status('En proceso', 'info')}
            </td>
            <td>Revisar respuesta posterior al tratamiento.</td>
            <td>Asistente</td>
          </tr>

          <tr>
            <td>22 sep 2026</td>
            <td>
              <strong>Paciente demo C</strong>
              <span class="table-sub">SSL-DEM-003</span>
            </td>
            <td>Programar estudio RX</td>
            <td>
              ${status('Confirmado', 'success')}
            </td>
            <td>Estudio solicitado por el profesional.</td>
            <td>Samantha RX</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</section>`
    );
  }

  function teeth() {
    const permanentUpper = [
      18, 17, 16, 15, 14, 13, 12, 11,
      21, 22, 23, 24, 25, 26, 27, 28,
    ];

    const permanentLower = [
      48, 47, 46, 45, 44, 43, 42, 41,
      31, 32, 33, 34, 35, 36, 37, 38,
    ];

    const temporaryUpper = [
      55, 54, 53, 52, 51,
      61, 62, 63, 64, 65,
    ];

    const temporaryLower = [
      85, 84, 83, 82, 81,
      71, 72, 73, 74, 75,
    ];

    /*
     * Alturas en porcentaje para formar las arcadas.
     * Los dientes centrales quedan más cerca del centro
     * y los molares se desplazan hacia los extremos.
     */
    const permanentUpperY = [
      68, 54, 42, 31, 23, 17, 12, 9,
      9, 12, 17, 23, 31, 42, 54, 68,
    ];

    const permanentLowerY = [
      14, 26, 38, 49, 58, 65, 71, 75,
      75, 71, 65, 58, 49, 38, 26, 14,
    ];

    const temporaryUpperY = [
      58, 36, 21, 12, 8,
      8, 12, 21, 36, 58,
    ];

    const temporaryLowerY = [
      18, 39, 57, 69, 75,
      75, 69, 57, 39, 18,
    ];

    function getToothType(id) {
      const position = Number(String(id).slice(-1));

      if (position === 1 || position === 2) {
        return {
          key: 'incisor',
          name: 'Incisivo',
          short: 'I',
        };
      }

      if (position === 3) {
        return {
          key: 'canine',
          name: 'Canino',
          short: 'C',
        };
      }

      /*
       * En dentición temporal las posiciones 4 y 5
       * corresponden a molares.
       */
      if (id >= 50 && (position === 4 || position === 5)) {
        return {
          key: 'molar',
          name: 'Molar temporal',
          short: 'M',
        };
      }

      if (position === 4 || position === 5) {
        return {
          key: 'premolar',
          name: 'Premolar',
          short: 'P',
        };
      }

      return {
        key: 'molar',
        name: 'Molar',
        short: 'M',
      };
    }

    function getRotation(index, total, arch) {
      const middle = (total - 1) / 2;
      const distance = index - middle;

      const rotation =
        distance * (total === 16 ? 2.6 : 4);

      return arch === 'upper'
        ? rotation
        : rotation * -1;
    }

    function createTooth(id, index, teethList, yPositions, arch) {
      const type = getToothType(id);

      /*
       * Dejamos espacio en ambos extremos para que los molares
       * no se corten ni tapen los textos laterales.
       */
      const x =
        teethList.length === 16
          ? 8 + index * (84 / 15)
          : 16 + index * (68 / 9);

      return `
    <button
      class="tooth dental-tooth ${type.key}"
      type="button"
      data-tooth="${id}"
      data-type="${type.name}"
      data-type-key="${type.key}"
      aria-label="Seleccionar diente ${id}, ${type.name}"
      aria-pressed="false"
      title="Diente ${id} · ${type.name}"
      style="
        --tooth-x:${x}%;
        --tooth-y:${yPositions[index]}%;
        --tooth-rotation:${getRotation(
        index,
        teethList.length,
        arch
      )}deg;
      "
    >
      <span class="tooth-number">${id}</span>

      <span class="tooth-shape" aria-hidden="true">
        <i class="tooth-surface surface-top"></i>
        <i class="tooth-surface surface-center"></i>
        <i class="tooth-surface surface-left"></i>
        <i class="tooth-surface surface-right"></i>
        <i class="tooth-surface surface-bottom"></i>
      </span>
    </button>
  `;
    }

    function createArch(
      title,
      subtitle,
      teethList,
      yPositions,
      arch
    ) {
      return `
    <section class="dental-arch dental-arch-${arch}">
      <div class="dental-arch-heading">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>

      <div class="dental-arch-stage">
        <span class="dental-side dental-side-right">
          Derecha
        </span>

        <span class="dental-side dental-side-left">
          Izquierda
        </span>

        <div class="dental-gum" aria-hidden="true"></div>

        ${teethList
          .map((id, index) =>
            createTooth(
              id,
              index,
              teethList,
              yPositions,
              arch
            )
          )
          .join('')}
      </div>
    </section>
  `;
    }

    return `
    <div class="odontogram-professional">
      <div class="dentition-selector">
        <button
          class="dentition-button active"
          type="button"
          data-dentition-button="permanent"
        >
          Dentición permanente
        </button>

        <button
          class="dentition-button"
          type="button"
          data-dentition-button="temporary"
        >
          Dentición temporal
        </button>
      </div>

      <div
        class="dentition-panel active"
        data-dentition-panel="permanent"
      >
        ${createArch(
      'Maxila',
      'Dentición permanente superior',
      permanentUpper,
      permanentUpperY,
      'upper'
    )}

        <div class="dental-midline">
          <span>Derecha del paciente</span>
          <i></i>
          <span>Izquierda del paciente</span>
        </div>

        ${createArch(
      'Mandíbula',
      'Dentición permanente inferior',
      permanentLower,
      permanentLowerY,
      'lower'
    )}
      </div>

      <div
        class="dentition-panel"
        data-dentition-panel="temporary"
        hidden
      >
        ${createArch(
      'Maxila temporal',
      'Dentición temporal superior',
      temporaryUpper,
      temporaryUpperY,
      'upper'
    )}

        <div class="dental-midline">
          <span>Derecha del paciente</span>
          <i></i>
          <span>Izquierda del paciente</span>
        </div>

        ${createArch(
      'Mandíbula temporal',
      'Dentición temporal inferior',
      temporaryLower,
      temporaryLowerY,
      'lower'
    )}
      </div>

      <div class="odontogram-selection-help">
        <span class="selection-help-sample"></span>

        <span>
          El contorno turquesa indica el diente seleccionado.
          Seleccionarlo no modifica su diagnóstico.
        </span>
      </div>

      <section class="dental-reference">
        <div class="dental-reference-head">
          <div>
            <h3>Tabla de referencia dental</h3>

            <p>
              Clasificación anatómica y numeración FDI.
            </p>
          </div>
        </div>

        <div class="dental-reference-grid">
          <article class="dental-type-card incisor">
            <span class="dental-type-letter">I</span>

            <div>
              <strong>Incisivos</strong>
              <p>Cortan los alimentos.</p>

              <small>
                Permanentes:
                11, 12, 21, 22, 31, 32, 41, 42
              </small>

              <small>
                Temporales:
                51, 52, 61, 62, 71, 72, 81, 82
              </small>
            </div>
          </article>

          <article class="dental-type-card canine">
            <span class="dental-type-letter">C</span>

            <div>
              <strong>Caninos</strong>
              <p>Desgarran los alimentos.</p>

              <small>
                Permanentes: 13, 23, 33, 43
              </small>

              <small>
                Temporales: 53, 63, 73, 83
              </small>
            </div>
          </article>

          <article class="dental-type-card premolar">
            <span class="dental-type-letter">P</span>

            <div>
              <strong>Premolares</strong>
              <p>Trituran y desgarran.</p>

              <small>
                14, 15, 24, 25, 34, 35, 44, 45
              </small>

              <small>
                No existen en la dentición temporal.
              </small>
            </div>
          </article>

          <article class="dental-type-card molar">
            <span class="dental-type-letter">M</span>

            <div>
              <strong>Molares</strong>
              <p>Trituran los alimentos.</p>

              <small>
                Permanentes:
                16–18, 26–28, 36–38, 46–48
              </small>

              <small>
                Temporales:
                54, 55, 64, 65, 74, 75, 84, 85
              </small>
            </div>
          </article>
        </div>
      </section>
    </div>
  `;
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
        <div class="tab-panel" data-panel="odontogram">
  <div class="callout">
    <strong>Odontograma interactivo:</strong>
    selecciona un diente para consultar o registrar su diagnóstico,
    superficies y plan de tratamiento.
  </div>

  ${teeth()}

  <div id="toothDetail" class="callout">
    Selecciona un diente para registrar diagnóstico, superficie y plan.
  </div>
</div>
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
    const aliases = {
      'profilaxis': 'profilaxis / limpieza',
      'consulta': 'consulta general',
      'agenda primera vez': '1ra. consulta',
      'urgencia': 'cita de emergencia',
      'cementación aparato': 'cementar aparato'
    };
    const target = aliases[normalized] || normalized;
    return seed.priceList?.find((item) => String(item.name).toLowerCase() === target)?.price || null;
  }

  function renderTreatments() {
    shell(
      hero('<span id="treatmentHeroCount">Catálogo conectado</span>', 'Catálogo clínico y precio en el mismo lugar.', 'Los tratamientos se consultan directamente desde catalogo_tratamientos; tiempo, costos, precio y estado reflejan la base de datos.', `${button('＋ Nuevo tratamiento', 'primary', 'id="newTreatmentButton"')}${button('Ver calculador', 'secondary', 'data-scroll="calculator"')}`) +
      `<div class="callout treatment-connection" id="treatmentConnection" role="status"><strong>Conectando con MySQL…</strong><span> Consultando el catálogo de tratamientos.</span></div>
      <section class="grid layout" id="calculator"><article class="card"><div class="card-head"><div><h2>Calculador de precio</h2><p>Usa los valores reales guardados para cada tratamiento.</p></div>${status('Fórmula activa', 'success')}</div><div class="form-grid">
        <div class="field"><label>Tratamiento</label><select class="select" id="calcTreatment"><option value="">Cargando catálogo…</option></select></div>
        <div class="field"><label>Tiempo de sillón (horas)</label><input class="input" id="calcHours" type="number" min="0" step="0.25" value="1"></div>
        <div class="field"><label>Costo por hora de consultorio</label><input class="input" id="calcHourly" type="number" min="0" step="10" value="450"></div>
        <div class="field"><label>Margen deseado</label><input class="input" id="calcMargin" type="number" min="1" max="90" value="30"></div>
        <div class="field"><label>Costo de materiales</label><input class="input" id="calcMaterials" type="number" min="0" step=".01" value="0"></div>
        <div class="field"><label>Otros consumibles</label><input class="input" id="calcPlaque" type="number" min="0" step=".01" value="0"></div>
      </div><div class="grid three" style="margin-top:16px"><div class="callout"><strong id="calcCost">$0</strong><br>Costo total</div><div class="callout"><strong id="calcSuggested">$0</strong><br>Precio mínimo sugerido</div><div class="callout"><strong id="currentTreatmentPrice">$0</strong><br>Precio de venta actual</div></div></article>
      <aside class="card"><div class="card-head"><div><h2>Regla de cálculo</h2><p>Evita precios por debajo del costo.</p></div></div><div class="list"><div class="list-item"><span class="list-icon">1</span><span class="list-copy"><strong>Costo de consultorio</strong><span>Horas × costo por hora</span></span></div><div class="list-item"><span class="list-icon">2</span><span class="list-copy"><strong>Costo de materiales</strong><span>Costo unitario × cantidad usada</span></span></div><div class="list-item"><span class="list-icon">3</span><span class="list-copy"><strong>Precio sugerido</strong><span>Costo total ÷ (1 − margen)</span></span></div></div><div class="callout warning" style="margin-top:14px"><strong>Dato pendiente:</strong> los tiempos y consumos faltantes del Excel permanecen como “Por definir”; no se inventan valores clínicos.</div></aside></section>
      <article class="card" style="margin-top:16px"><div class="card-head"><div><h2>Catálogo completo</h2><p>Información vigente de la tabla catalogo_tratamientos.</p></div><span id="treatmentCount">0 registros</span></div><div class="toolbar"><input class="input search" id="treatmentSearch" placeholder="Buscar tratamiento o categoría"><select class="select" id="treatmentStatusFilter" style="width:auto"><option value="">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></div><div class="table-wrap" style="max-height:620px"><table><thead><tr><th>Tratamiento</th><th>Tiempo</th><th>Sesiones</th><th>Costo calculado</th><th>Precio de venta</th><th>Estado</th><th></th></tr></thead><tbody id="treatmentTable"><tr><td colspan="7" class="treatment-empty">Cargando tratamientos reales…</td></tr></tbody></table></div></article>`
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
    const counts = (seed.inventory || []).reduce((acc, item) => {
      acc[inventoryTone(item)[1]] = (acc[inventoryTone(item)[1]] || 0) + 1;
      return acc;
    }, {});
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
    const months = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const values = [52, 63, 58, 71, 75, 82, 73, 0, 0, 0];
    const sourceFileCards = Object.entries(
      seed.sourceSheets || {}
    ).map(([key, sheets]) => {
      return `
    <div class="callout source-file-card">
      <strong>${esc(key)}</strong>

      <span>
        ${sheets.map((sheet) => esc(sheet)).join(' · ')}
      </span>
    </div>
  `;
    }).join('');
    shell(
      hero('Dashboard Anual · Datos ficticios', 'Del dato diario a la decisión anual.', 'El vaciado mensual alimenta ingresos, gastos, utilidad, pacientes, ticket, crecimiento, proyección y punto de equilibrio.', `${button('Imprimir reporte', 'primary', 'onclick="window.print()"')}${button('Exportar Excel', 'secondary', 'data-toast="La exportación conservará la estructura homologada."')}`) +
      `<section class="grid kpis">${kpi('Ingreso mínimo mensual', money.format(seed.goals?.monthlyIncomeMinimum || 70000), 'Meta demo', 'var(--lilac-200)')}${kpi('Ingreso objetivo', money.format(seed.goals?.monthlyIncomeTarget || 95000), 'Meta demo', 'var(--peach-200)')}${kpi('Ticket objetivo', money.format(seed.goals?.ticketTarget || 700), 'Dato ficticio', 'var(--gold-400)')}${kpi('Utilidad neta mínima', money.format(seed.goals?.monthlyNetProfitMinimum || 35000), 'Dato ficticio', 'var(--sage-500)')}</section>
      <section class="grid layout"><article class="card"><div class="card-head"><div><h2>Avance mensual contra meta</h2><p>Marzo–diciembre, como en el archivo anual.</p></div>${status('73% septiembre', 'info')}</div><div class="bars">${months.map((m, i) => `<div class="bar-wrap"><div class="bar" style="height:${values[i]}%${values[i] === 0 ? ';opacity:.16' : ''}"></div><span>${m}</span></div>`).join('')}</div></article>
      <aside class="card"><div class="card-head"><div><h2>Parámetros personales</h2><p>Único conjunto editable en la pestaña Metas.</p></div></div><div class="metric-row"><div class="metric-label"><span>Pacientes por día</span><strong>6 mínimo · 10 objetivo</strong></div><div class="progress"><span style="width:70%"></span></div></div><div class="metric-row"><div class="metric-label"><span>Materiales / ingresos</span><strong>15–20%</strong></div><div class="progress"><span style="width:85%;background:var(--gold-400)"></span></div></div><div class="callout"><strong>Regla:</strong> las metas cambian a futuro; los resultados históricos conservan la meta vigente de su periodo.</div></aside></section>
      <article class="card reports-source-map">
        <div class="card-head">
          <div>
            <h2>Mapa de archivos homologado</h2>

            <p>
              Las pestañas se conservan como entidades o reportes equivalentes.
            </p>
          </div>
        </div>

        <div class="grid three source-files-grid">
          ${sourceFileCards}
        </div>
      </article>`
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
      agendaConfig: ['Configuración de agenda', 'Define cómo quieres visualizar y organizar tu agenda.'],
    };

    const [title, subtitle] = headers[type] || headers.appointment;
    if (type === 'agendaConfig') {
      return `
    <div class="modal-head">
      <div>
        <h2>${title}</h2>

        <p class="modal-subtitle">
          ${subtitle}
        </p>
      </div>

      ${close}
    </div>

    <form id="agendaConfigForm">
        <div class="agenda-config-tabs">
          <button type="button">Generales</button>
          <button type="button" class="active">Mi vista</button>
          <button type="button">Horarios de trabajo</button>
          <button type="button">Agendamiento en línea</button>
          <button type="button">Motivos de consulta</button>
          <button type="button">Agendas</button>
        </div>

        <div class="agenda-config-content">
          <section class="agenda-config-days">
            <h3>Define cómo quieres ver tu agenda por defecto.</h3>
            <p>Selecciona los días que quieres ver.</p>

            ${[
          ['Lunes', true],
          ['Martes', true],
          ['Miércoles', true],
          ['Jueves', true],
          ['Viernes', true],
          ['Sábado', true],
          ['Domingo', false],
        ].map(([day, checked]) => `
            <label class="agenda-day-option">
              <input type="checkbox" ${checked ? 'checked' : ''}>
              <span>${day}</span>
            </label>
          `).join('')}
          </section>

          <section class="agenda-config-settings">
            <h3>Define un rango horario</h3>

            <div class="field">
              <label for="agendaStartTime">Inicio</label>
              <select class="select" id="agendaStartTime">
                <option>08:00 AM</option>
                <option selected>09:00 AM</option>
                <option>10:00 AM</option>
              </select>
            </div>

            <div class="field">
              <label for="agendaEndTime">Final</label>
              <select class="select" id="agendaEndTime">
                <option>06:00 PM</option>
                <option>08:00 PM</option>
                <option selected>09:00 PM</option>
              </select>
            </div>

            <div class="agenda-quick-hours">
              <button type="button" data-toast="Horario de mañana seleccionado.">
                Ver sólo mañana
              </button>

              <button type="button" data-toast="Horario de tarde seleccionado.">
                Ver sólo tarde
              </button>
            </div>

            <h3>Color de las citas</h3>
            <p>¿En base a qué deseas que cambie el color?</p>

            <div class="agenda-radio-row">
              <label>
                <input type="radio" name="appointmentColor" checked>
                  Agenda de doctores
              </label>

              <label>
                <input type="radio" name="appointmentColor">
                  Motivo de consulta
              </label>
            </div>

            <div class="field">
              <label for="defaultAgendaView">
                Vista seleccionada por defecto
              </label>

              <select class="select" id="defaultAgendaView">
                <option value="week">Por semana</option>
                <option value="day">Por día</option>
                <option value="month">Por mes</option>
              </select>
            </div>
          </section>
        </div>

        <label class="agenda-apply-all">
          <input type="checkbox">
            Quiero que estos cambios apliquen para todos los usuarios de mi equipo
        </label>

        <div class="form-actions agenda-config-footer">
          <button class="button primary" type="submit">
            Guardar
          </button>
        </div>
      </form>
  `;
    }
    let fields = '';

    if (type === 'appointment') {
      fields = `
    <div class="field wide">
      <label>Paciente</label>

      <input
        class="input"
        name="patient"
        required
        placeholder="Buscar o registrar paciente"
      >
    </div>

    <div class="field">
      <label>Fecha</label>

      <input
        class="input"
        name="date"
        type="date"
        required
      >
    </div>

    <div class="field">
      <label>Hora</label>

      <input
        class="input"
        name="time"
        type="time"
        required
      >
    </div>

    <div class="field">
      <label>Tratamiento</label>

      <select
        class="select"
        name="treatment"
        required
      >
        ${(seed.treatments || [])
          .map((t) => `
            <option value="${esc(t.name)}">
              ${esc(t.name)}
            </option>
          `)
          .join('')}
      </select>
    </div>

    <div class="field">
      <label>Duración</label>

      <select
        class="select"
        name="duration"
        required
      >
        <option value="30">30 minutos</option>
        <option value="45">45 minutos</option>
        <option value="60">60 minutos</option>
        <option value="90">90 minutos</option>
      </select>
    </div>

    <div class="field">
      <label for="appointmentType">Tipo de cita</label>
      <select class="select" id="appointmentType" name="appointmentType" required>
        <option value="general">Atención general</option>
        <option value="camitas">Camitas</option>
      </select>
    </div>

    <div class="field">
      <label for="appointmentChair">Silla</label>
      <select class="select" id="appointmentChair" name="chair" required>
        <option value="A" disabled>Silla A · sólo camitas</option>
        <option value="B" selected>Silla B · atención general</option>
        <option value="C">Silla C · atención general</option>
      </select>
      <small class="field-help" id="chairRestrictionHint">Las citas generales sólo pueden usar las sillas B o C.</small>
    </div>

    <div class="field wide">
      <label>Complejidad / nota roja</label>

      <textarea
        class="textarea"
        name="notes"
        placeholder="Manejo especial, tiempo extra o indicaciones para recepción"
      ></textarea>
    </div>
  `;
    } else if (type === 'patient') {
      fields = `
    <div class="field">
      <label>Nombre(s)</label>

      <input
        class="input"
        name="firstName"
        required
      >
    </div>

    <div class="field">
      <label>Apellidos</label>

      <input
        class="input"
        name="lastName"
        required
      >
    </div>

    <div class="field">
      <label>Fecha de nacimiento</label>

      <input
        class="input"
        name="birthDate"
        type="date"
      >
    </div>

    <div class="field">
      <label>Familia / tutor</label>

      <input
        class="input"
        name="guardian"
        placeholder="Buscar tutor existente"
      >
    </div>

    <div class="field">
      <label>Teléfono del tutor</label>

      <input
        class="input"
        name="guardianPhone"
        type="tel"
      >
    </div>

    <div class="field">
      <label>Foto de perfil</label>

      <input
        class="input"
        name="profilePhoto"
        type="file"
        accept="image/*"
      >
    </div>

    <div class="field wide">
      <label>Alertas clínicas</label>

      <textarea
        class="textarea"
        name="clinicalAlerts"
        placeholder="Alergias, medicamentos, manejo o antecedentes"
      ></textarea>
    </div>
  `;
    } else if (type === 'procedure') {
      fields = `
    <div class="field">
      <label>Procedimiento</label>

      <select
        class="select"
        name="procedure"
        required
      >
        ${(seed.treatments || [])
          .map((t) => `
            <option value="${esc(t.name)}">
              ${esc(t.name)}
            </option>
          `)
          .join('')}
      </select>
    </div>

    <div class="field">
      <label>Diente / región</label>

      <input
        class="input"
        name="toothRegion"
        placeholder="Ej. 54 · oclusal"
      >
    </div>

    <div class="field wide">
      <label>Detalle clínico</label>

      <textarea
        class="textarea"
        name="clinicalDetail"
        placeholder="Diagnóstico, hallazgos y procedimiento realizado"
      ></textarea>
    </div>

    <div class="field wide">
      <label>Indicaciones y seguimiento</label>

      <textarea
        class="textarea"
        name="followUp"
        placeholder="Medicamento, curaciones y frecuencia de recordatorios"
      ></textarea>
    </div>
  `;
    } else if (type === 'user') {
      fields = `
    <div class="field">
      <label>Nombre de usuario</label>

      <input
        class="input"
        name="username"
        required
      >
    </div>

    <div class="field">
      <label>Correo</label>

      <input
        class="input"
        name="email"
        type="email"
        required
      >
    </div>

    <div class="field">
      <label>Rol</label>

      <select
        class="select"
        name="role"
        required
      >
        <option value="Administrador">
          Administrador
        </option>

        <option value="Asistente">
          Asistente
        </option>

        <option value="Recepcionista">
          Recepcionista
        </option>
      </select>
    </div>

    <div class="field">
      <label>Invitación</label>

      <select
        class="select"
        name="invitation"
      >
        <option value="email">
          Enviar enlace por correo
        </option>

        <option value="copy">
          Copiar enlace seguro
        </option>
      </select>
    </div>
  `;
    }

    return `
  <div class="modal-head">
    <div>
      <h2>${title}</h2>

      <p class="modal-subtitle">
        ${subtitle}
      </p>
    </div>

    ${close}
  </div>

  <form id="demoForm">
    <div class="form-grid">
      ${fields}
    </div>

    <div class="form-actions">
      <button
        type="button"
        class="button secondary"
        data-close-modal
      >
        Cancelar
      </button>

      <button
        class="button primary"
        type="submit"
      >
        Guardar
      </button>
    </div>
  </form>
`;
  }

  function bindCommon() {
    const body = document.body;
    const menu = document.getElementById('menuButton');
    const closeMenu = () => body.classList.remove('nav-open');
    menu?.addEventListener('click', () => body.classList.toggle('nav-open'));
    document.getElementById('sidebarScrim')?.addEventListener('click', closeMenu);
    document.querySelectorAll('.nav-group-trigger').forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        const group = trigger.closest('.nav-group');
        const willOpen = !group.classList.contains('open');
        document.querySelectorAll('.nav-group.open').forEach((item) => {
          item.classList.remove('open');
          item.querySelector('.nav-group-trigger')?.setAttribute('aria-expanded', 'false');
        });
        group.classList.toggle('open', willOpen);
        trigger.setAttribute('aria-expanded', String(willOpen));
      });
    });
    document.addEventListener('click', (event) => {
      if (event.target.closest('.nav-group')) return;
      document.querySelectorAll('.nav-group.open').forEach((group) => {
        group.classList.remove('open');
        group.querySelector('.nav-group-trigger')?.setAttribute('aria-expanded', 'false');
      });
    });
    document.getElementById('activeRole')?.addEventListener('change', (event) => {
      localStorage.setItem('ssl-active-role', event.target.value);
      window.location.href = 'index.html';
    });

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
      if (scrollTrigger) document.getElementById(scrollTrigger.dataset.scroll)?.scrollIntoView({
        behavior: 'smooth'
      });
      const modalTrigger = event.target.closest('[data-modal]');
      if (modalTrigger) {
        const backdrop = document.getElementById('modalBackdrop');
        document.getElementById('modal').innerHTML = modalContent(modalTrigger.dataset.modal, modalTrigger);
        if (modalTrigger.dataset.modal === 'appointment') {
          const appointmentType = document.getElementById('appointmentType');
          const appointmentChair = document.getElementById('appointmentChair');
          const chairHint = document.getElementById('chairRestrictionHint');
          const appointmentDate = document.querySelector('#modal input[name="date"]');
          const appointmentTime = document.querySelector('#modal input[name="time"]');
          const requestedChair = modalTrigger.dataset.chair;

          if (appointmentDate && modalTrigger.dataset.date) appointmentDate.value = modalTrigger.dataset.date;
          if (appointmentTime && modalTrigger.dataset.time) appointmentTime.value = modalTrigger.dataset.time;
          if (appointmentType && requestedChair) appointmentType.value = requestedChair === 'A' ? 'camitas' : 'general';
          if (appointmentChair && requestedChair) appointmentChair.value = requestedChair;
          const syncChairRules = () => {
            const isCamitas = appointmentType?.value === 'camitas';
            Array.from(appointmentChair?.options || []).forEach((option) => {
              option.disabled = isCamitas ? option.value !== 'A' : option.value === 'A';
            });
            if (appointmentChair) appointmentChair.value = isCamitas ? 'A' : (appointmentChair.value === 'A' ? 'B' : appointmentChair.value);
            if (chairHint) chairHint.textContent = isCamitas ?
              'Camitas requiere la Silla A; las sillas B y C no están disponibles para este tipo de cita.' :
              'Las citas generales sólo pueden usar las sillas B o C.';
          };
          appointmentType?.addEventListener('change', syncChairRules);
          syncChairRules();
          if (appointmentChair && requestedChair) appointmentChair.value = requestedChair;
        }
        backdrop.classList.add('open');
        backdrop.setAttribute('aria-hidden', 'false');
      }
      if (event.target.closest('[data-close-modal]') || event.target.id === 'modalBackdrop') closeModal();
    });
    document.addEventListener('submit', (event) => {
      if (event.target.id === 'agendaConfigForm') {
        event.preventDefault();

        const defaultView =
          document.getElementById('defaultAgendaView')?.value || 'week';

        localStorage.setItem('ssl-agenda-view', defaultView);

        setAgendaView(defaultView);
        closeModal();

        showToast('Configuración de Agenda guardada correctamente.');
        return;
      }

      if (event.target.id !== 'demoForm') return;

      event.preventDefault();
      closeModal();

      showToast(
        'Registro guardado en la demostración. El backend persistirá y auditará el cambio.'
      );
    });
    document
      .querySelectorAll('[data-dentition-button]')
      .forEach((button) => {
        button.addEventListener('click', () => {
          const dentition = button.dataset.dentitionButton;

          document
            .querySelectorAll('[data-dentition-button]')
            .forEach((item) => {
              item.classList.toggle(
                'active',
                item === button
              );
            });

          document
            .querySelectorAll('[data-dentition-panel]')
            .forEach((panel) => {
              const isActive =
                panel.dataset.dentitionPanel === dentition;

              panel.hidden = !isActive;
              panel.classList.toggle('active', isActive);
            });
        });
      });

    function closeModal() {
      const backdrop = document.getElementById('modalBackdrop');
      backdrop?.classList.remove('open');
      backdrop?.setAttribute('aria-hidden', 'true');
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal();
        closeMenu();
      }
    });

    document.querySelectorAll('[data-tab]').forEach((tab) => tab.addEventListener('click', () => {
      const parent = tab.closest('.tabs');
      const name = tab.dataset.tab;
      parent.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item === tab));
      let next = parent.nextElementSibling;
      while (next?.classList.contains('tab-panel')) {
        next.classList.toggle('active', next.dataset.panel === name);
        next = next.nextElementSibling;
      }
    }));

    document.querySelectorAll('.dental-tooth').forEach((tooth) => {
      tooth.addEventListener('click', () => {
        const wasSelected = tooth.classList.contains('selected');

        /*
         * Solamente puede haber un diente seleccionado.
         * No cambiamos aquí su condición clínica.
         */
        document.querySelectorAll('.dental-tooth').forEach((item) => {
          item.classList.remove('selected');
          item.setAttribute('aria-pressed', 'false');
        });

        const detail = document.getElementById('toothDetail');

        /*
         * Si se pulsa nuevamente el mismo diente,
         * queda deseleccionado y recupera su aspecto normal.
         */
        if (wasSelected) {
          if (detail) {
            detail.innerHTML =
              'Selecciona un diente para registrar diagnóstico, superficie y plan.';
          }

          return;
        }

        tooth.classList.add('selected');
        tooth.setAttribute('aria-pressed', 'true');

        if (detail) {
          detail.innerHTML = `
        <div class="selected-tooth-detail">
          <span class="selected-tooth-number">
            ${tooth.dataset.tooth}
          </span>

          <div>
            <strong>
              Diente ${tooth.dataset.tooth}
              · ${tooth.dataset.type}
            </strong>

            <p>
              Diente seleccionado. Aquí podrás registrar
              su condición, superficies, diagnóstico,
              evidencia y plan de tratamiento.
            </p>
          </div>
        </div>
      `;
        }
      });
    });

    const calcInputs = ['calcHours', 'calcHourly', 'calcMargin', 'calcMaterials', 'calcPlaque'].map((id) => document.getElementById(id)).filter(Boolean);
    const calculate = () => {
      const hours = Number(document.getElementById('calcHours')?.value || 0);
      const hourly = Number(document.getElementById('calcHourly')?.value || 0);
      const margin = Math.min(90, Number(document.getElementById('calcMargin')?.value || 0)) / 100;
      const materials = Number(document.getElementById('calcMaterials')?.value || 0);
      const consumable = Number(document.getElementById('calcPlaque')?.value || 0);
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
        document.querySelectorAll(`#${tableId} [data-search-row]`).forEach((row) => {
          row.hidden = !row.textContent.toLowerCase().includes(query);
        });
      });
    }
    bindTableSearch('treatmentSearch', 'treatmentTable');
    bindTableSearch('inventorySearch', 'inventoryTable');
    document.getElementById('inventoryFilter')?.addEventListener('change', (event) => {
      document.querySelectorAll('#inventoryTable [data-search-row]').forEach((row) => {
        row.hidden = Boolean(event.target.value) && row.dataset.tone !== event.target.value;
      });
    });
    document.getElementById('agendaSearch')?.addEventListener('input', (event) => {
      const q = event.target.value.toLowerCase();
      document.querySelectorAll('[data-agenda-view] .dc-event, [data-agenda-view] .appointment, [data-agenda-view] .dc-month-chip').forEach((item) => {
        item.hidden = !item.textContent.toLowerCase().includes(q);
      });
    });

    const agendaDate = new Date(2026, 8, 17);

    let currentAgendaView =
      localStorage.getItem('ssl-agenda-view') || 'week';

    let currentAgendaMode =
      localStorage.getItem('ssl-agenda-mode') || 'calendar';

    let selectedChair = localStorage.getItem('ssl-agenda-chair') || 'A';

    const monthNames = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];

    const dayNames = [
      'domingo',
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
    ];

    const shortDayNames = [
      'Dom',
      'Lun',
      'Mar',
      'Mié',
      'Jue',
      'Vie',
      'Sáb',
    ];

    function capitalize(value) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function getMonday(date) {
      const result = new Date(date);
      const day = result.getDay();
      const difference = day === 0 ? -6 : 1 - day;

      result.setDate(result.getDate() + difference);

      return result;
    }

    function formatAgendaDate(date) {
      return `${capitalize(dayNames[date.getDay()])} ${date.getDate()} de ${monthNames[date.getMonth()]
        } de ${date.getFullYear()}`;
    }

    function toDateKey(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function renderMonthGrid() {
      const grid = document.getElementById('agendaMonthGrid');
      const heading = document.getElementById('agendaMonthHeading');
      if (!grid) return;

      const year = agendaDate.getFullYear();
      const month = agendaDate.getMonth();
      const first = new Date(year, month, 1);
      const mondayOffset = (first.getDay() + 6) % 7;
      const gridStart = new Date(year, month, 1 - mondayOffset);
      const todayKey = toDateKey(new Date());

      if (heading) heading.textContent = `${capitalize(monthNames[month])} ${year}`;

      grid.innerHTML = Array.from({ length: 42 }, (_, index) => {
        const cellDate = new Date(gridStart);
        cellDate.setDate(gridStart.getDate() + index);
        const dateKey = toDateKey(cellDate);
        const events = monthAppointmentEvents.filter((item) => item.date === dateKey);
        const muted = cellDate.getMonth() !== month;
        return `<div class="dc-month-day${muted ? ' muted' : ''}${dateKey === todayKey ? ' today' : ''}" data-calendar-date="${dateKey}">
          <strong>${cellDate.getDate()}</strong>
          ${events.map((item) => `<button class="dc-month-chip ${item.tone}" type="button" data-modal="appointment" data-date="${item.date}" data-time="${item.time}" data-chair="${item.chair}" title="${item.time} · ${item.patient} · Silla ${item.chair}"><span class="dc-month-chip-time">${item.time} · Silla ${item.chair}</span><span class="dc-month-chip-name">${item.patient}</span></button>`).join('')}
          ${!muted ? `<button class="dc-month-add" type="button" data-modal="appointment" data-date="${dateKey}" aria-label="Agendar cita el ${cellDate.getDate()} de ${monthNames[month]}">＋ Agendar</button>` : ''}
        </div>`;
      }).join('');
    }

    function chairAppointmentsForDate(chairId, dateKey) {
      if (dateKey === '2026-09-17') {
        return demoAppointments.filter((item) => item.chair === chairId);
      }

      return monthAppointmentEvents
        .filter((item) => item.chair === chairId && item.date === dateKey)
        .map((item) => ({
          ...item,
          minutes: 60,
          treatment: chairId === 'A' ? 'Camitas' : 'Atención general',
          state: 'Confirmada'
        }));
    }

    function renderChairSchedule() {
      const timeline = document.getElementById('chairScheduleTimeline');
      if (!timeline) return;

      const chair = dentalChairs.find((item) => item.id === selectedChair) || dentalChairs[0];
      const dateKey = toDateKey(agendaDate);
      const appointments = chairAppointmentsForDate(chair.id, dateKey);
      const slots = Array.from({ length: 20 }, (_, index) => 8 * 60 + index * 30);
      const minutesToTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

      const summary = `<div class="dc-chair-day-summary"><div><span>${chair.name}</span><strong>${chair.specialty}</strong><small>${chair.rule}</small></div><div><strong>Vista ${currentAgendaView === 'day' ? 'diaria' : currentAgendaView === 'month' ? 'mensual' : 'semanal'}</strong><span>Usa los controles de fecha para cambiar el periodo</span></div></div>`;

      if (currentAgendaView === 'week') {
        const monday = getMonday(agendaDate);
        const days = Array.from({ length: 6 }, (_, index) => {
          const date = new Date(monday);
          date.setDate(monday.getDate() + index);
          return date;
        });

        timeline.innerHTML = `${summary}<div class="dc-chair-week">${days.map((date) => {
          const key = toDateKey(date);
          const items = chairAppointmentsForDate(chair.id, key);
          return `<article class="dc-chair-week-day"><header><span>${shortDayNames[date.getDay()]}</span><strong>${date.getDate()} ${monthNames[date.getMonth()].slice(0, 3)}</strong><small>${items.length} ${items.length === 1 ? 'cita' : 'citas'}</small></header><div>${items.length ? items.map((item) => `<button type="button" class="dc-chair-week-appointment" data-modal="appointment" data-date="${key}" data-time="${item.time}" data-chair="${chair.id}"><time>${item.time}</time><strong>${item.patient}</strong><span>${item.treatment}</span></button>`).join('') : '<p class="dc-chair-empty">Día disponible</p>'}</div><button class="dc-chair-week-add" type="button" data-modal="appointment" data-date="${key}" data-chair="${chair.id}">＋ Agendar</button></article>`;
        }).join('')}</div>`;
        return;
      }

      if (currentAgendaView === 'month') {
        const year = agendaDate.getFullYear();
        const month = agendaDate.getMonth();
        const first = new Date(year, month, 1);
        const gridStart = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
        timeline.innerHTML = `${summary}<div class="dc-chair-month-head">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => `<span>${day}</span>`).join('')}</div><div class="dc-chair-month">${Array.from({ length: 42 }, (_, index) => {
          const date = new Date(gridStart);
          date.setDate(gridStart.getDate() + index);
          const key = toDateKey(date);
          const items = chairAppointmentsForDate(chair.id, key);
          const muted = date.getMonth() !== month;
          return `<button class="dc-chair-month-day${muted ? ' muted' : ''}${items.length ? ' reserved' : ''}" type="button" data-modal="appointment" data-date="${key}" data-chair="${chair.id}"><strong>${date.getDate()}</strong>${items.length ? `<span>${items.length} ${items.length === 1 ? 'reserva' : 'reservas'}</span><small>${items.map((item) => item.time).join(' · ')}</small>` : (!muted ? '<span>Disponible</span>' : '')}</button>`;
        }).join('')}</div>`;
        return;
      }

      timeline.innerHTML = `${summary}<div class="dc-chair-day-count"><strong>${appointments.length} citas</strong><span>${20 - appointments.reduce((total, item) => total + Math.ceil(item.minutes / 30), 0)} espacios de 30 min libres</span></div><div class="dc-chair-hours">${slots.map((slotMinutes) => {
          const startingAppointment = appointments.find((item) => {
            const [hours, minutes] = item.time.split(':').map(Number);
            return hours * 60 + minutes === slotMinutes;
          });
          const coveringAppointment = appointments.find((item) => {
            const [hours, minutes] = item.time.split(':').map(Number);
            const start = hours * 60 + minutes;
            return slotMinutes > start && slotMinutes < start + item.minutes;
          });
          const time = minutesToTime(slotMinutes);
          if (startingAppointment) return `<div class="dc-chair-hour occupied"><time>${time}</time><div><strong>${startingAppointment.patient}</strong><span>${startingAppointment.treatment} · ${startingAppointment.minutes} min</span></div><span class="dc-slot-state">Ocupado</span></div>`;
          if (coveringAppointment) return `<div class="dc-chair-hour occupied continuing"><time>${time}</time><div><strong>Continuación de cita</strong><span>${coveringAppointment.patient}</span></div><span class="dc-slot-state">Ocupado</span></div>`;
          return `<button class="dc-chair-hour available" type="button" data-modal="appointment" data-date="${dateKey}" data-time="${time}" data-chair="${chair.id}"><time>${time}</time><div><strong>Horario disponible</strong><span>Seleccionar para crear una cita</span></div><span class="dc-slot-state">＋ Agendar</span></button>`;
        }).join('')}</div>`;
    }

    function updateWeeklyHeader() {
      const monday = getMonday(agendaDate);

      document
        .querySelectorAll('[data-week-day]')
        .forEach((column, index) => {
          const columnDate = new Date(monday);

          columnDate.setDate(monday.getDate() + index);

          const dayLabel = column.querySelector('span');
          const dayNumber = column.querySelector('strong');

          if (dayLabel) {
            dayLabel.textContent =
              shortDayNames[columnDate.getDay()];
          }

          if (dayNumber) {
            dayNumber.textContent = columnDate.getDate();
          }

          const isSelectedDay =
            columnDate.toDateString() === agendaDate.toDateString();

          column.classList.toggle('today', isSelectedDay);
        });
    }

    function updateAgendaPeriod() {
      const periodTitle =
        document.getElementById('agendaPeriodTitle');

      const periodSubtitle =
        document.getElementById('agendaPeriodSubtitle');

      const dayTitle =
        document.getElementById('agendaDayTitle');

      if (!periodTitle || !periodSubtitle) return;

      if (currentAgendaView === 'day') {
        periodTitle.textContent = formatAgendaDate(agendaDate);
        periodSubtitle.textContent = currentAgendaMode === 'chairs' ?
          `Vista diaria · Silla ${selectedChair}` :
          'Agenda del día · 8 citas';

        if (dayTitle) {
          dayTitle.textContent = formatAgendaDate(agendaDate);
        }

        if (currentAgendaMode === 'chairs') renderChairSchedule();

        return;
      }

      if (currentAgendaView === 'month') {
        periodTitle.textContent = `${capitalize(
          monthNames[agendaDate.getMonth()]
        )} ${agendaDate.getFullYear()}`;

        periodSubtitle.textContent = currentAgendaMode === 'chairs' ?
          `Vista mensual · Silla ${selectedChair}` :
          'Vista mensual · 38 citas';

        if (currentAgendaMode === 'chairs') renderChairSchedule();
        else renderMonthGrid();

        return;
      }

      const monday = getMonday(agendaDate);
      const saturday = new Date(monday);

      saturday.setDate(monday.getDate() + 5);

      const sameMonth =
        monday.getMonth() === saturday.getMonth();

      if (sameMonth) {
        periodTitle.textContent =
          `${monday.getDate()} – ${saturday.getDate()} ` +
          `${monthNames[monday.getMonth()]} ` +
          `${monday.getFullYear()}`;
      } else {
        periodTitle.textContent =
          `${monday.getDate()} ${monthNames[monday.getMonth()]} – ` +
          `${saturday.getDate()} ${monthNames[saturday.getMonth()]} ` +
          `${saturday.getFullYear()}`;
      }

      periodSubtitle.textContent = currentAgendaMode === 'chairs' ?
        `Vista semanal · Silla ${selectedChair}` :
        'Semana clínica · 38 citas';

      updateWeeklyHeader();
      if (currentAgendaMode === 'chairs') renderChairSchedule();
    }

    const setAgendaView = (view) => {
      currentAgendaView = ['week', 'day', 'month'].includes(view) ?
        view :
        'week';

      document
        .querySelectorAll('[data-agenda-view]')
        .forEach((panel) => {
          panel.hidden =
            panel.dataset.agendaView !== currentAgendaView;
        });

      document
        .querySelectorAll('[data-agenda-set]')
        .forEach((button) => {
          button.classList.toggle(
            'active',
            button.dataset.agendaSet === currentAgendaView
          );
        });

      document.querySelectorAll('[data-chair-select]').forEach((tab) => {
        const active = tab.dataset.chairSelect === selectedChair;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
      });

      localStorage.setItem(
        'ssl-agenda-view',
        currentAgendaView
      );

      updateAgendaPeriod();
    };

    function moveAgendaPeriod(direction) {
      if (currentAgendaView === 'day') {
        agendaDate.setDate(
          agendaDate.getDate() + direction
        );
      } else if (currentAgendaView === 'week') {
        agendaDate.setDate(
          agendaDate.getDate() + direction * 7
        );
      } else if (currentAgendaView === 'month') {
        agendaDate.setDate(1);
        agendaDate.setMonth(agendaDate.getMonth() + direction);
      }

      updateAgendaPeriod();
    }

    document
      .getElementById('agendaPrevious')
      ?.addEventListener('click', () => {
        moveAgendaPeriod(-1);
      });

    document
      .getElementById('agendaNext')
      ?.addEventListener('click', () => {
        moveAgendaPeriod(1);
      });

    document
      .getElementById('agendaToday')
      ?.addEventListener('click', () => {
        const today = new Date();

        agendaDate.setFullYear(today.getFullYear());
        agendaDate.setMonth(today.getMonth());
        agendaDate.setDate(today.getDate());

        updateAgendaPeriod();
      });

    const agendaCalendarMode = document.getElementById(
      'agendaCalendarMode'
    );

    const agendaFollowupMode = document.getElementById(
      'agendaFollowupMode'
    );

    const agendaChairMode = document.getElementById(
      'agendaChairMode'
    );

    const agendaToolbar = document.querySelector(
      '.dc-agenda-toolbar'
    );

    function setAgendaMode(mode) {
      const selectedMode = ['calendar', 'followups', 'chairs'].includes(mode) ?
        mode :
        'calendar';

      currentAgendaMode = selectedMode;

      document
        .querySelectorAll('[data-agenda-mode-view]')
        .forEach((view) => {
          view.hidden =
            view.dataset.agendaModeView !== selectedMode;
        });

      agendaCalendarMode?.classList.toggle(
        'active',
        selectedMode === 'calendar'
      );

      agendaFollowupMode?.classList.toggle(
        'active',
        selectedMode === 'followups'
      );

      agendaChairMode?.classList.toggle(
        'active',
        selectedMode === 'chairs'
      );

      /*
       * En Seguimientos dejamos visibles los botones de modo,
       * pero ocultamos navegación, buscador y selector S/D.
       */
      agendaToolbar?.classList.toggle(
        'followup-mode',
        selectedMode === 'followups'
      );

      localStorage.setItem(
        'ssl-agenda-mode',
        selectedMode
      );

      updateAgendaPeriod();
    }

    agendaCalendarMode?.addEventListener('click', () => {
      setAgendaMode('calendar');
    });

    agendaFollowupMode?.addEventListener('click', () => {
      setAgendaMode('followups');
    });

    agendaChairMode?.addEventListener('click', () => {
      setAgendaMode('chairs');
    });

    if (agendaCalendarMode && agendaFollowupMode && agendaChairMode) {
      setAgendaMode(
        localStorage.getItem('ssl-agenda-mode') || 'calendar'
      );
    }

    document.querySelectorAll('[data-agenda-set]').forEach((button) => {
      button.addEventListener('click', () => {
        setAgendaView(button.dataset.agendaSet);

        document.getElementById('agendaViewMenu')?.setAttribute('hidden', '');
        document
          .getElementById('agendaViewMenuButton')
          ?.setAttribute('aria-expanded', 'false');
      });
    });

    document.querySelectorAll('[data-chair-select]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedChair = button.dataset.chairSelect;
        localStorage.setItem('ssl-agenda-chair', selectedChair);
        document.querySelectorAll('[data-chair-select]').forEach((tab) => {
          const active = tab.dataset.chairSelect === selectedChair;
          tab.classList.toggle('active', active);
          tab.setAttribute('aria-selected', String(active));
        });
        updateAgendaPeriod();
      });
    });

    const savedAgendaView =
      localStorage.getItem('ssl-agenda-view') || 'week';

    if (document.querySelector('[data-agenda-view]')) {
      setAgendaView(
        localStorage.getItem('ssl-agenda-view') || 'week'
      );
    }

    function bindAgendaDropdown(buttonId, menuId) {
      const button = document.getElementById(buttonId);
      const menu = document.getElementById(menuId);

      if (!button || !menu) return;

      button.addEventListener('click', (event) => {
        event.stopPropagation();

        const willOpen = menu.hidden;

        document.querySelectorAll('.dc-dropdown-menu').forEach((dropdown) => {
          dropdown.hidden = true;
        });

        document
          .querySelectorAll('[aria-expanded]')
          .forEach((control) => control.setAttribute('aria-expanded', 'false'));

        menu.hidden = !willOpen;
        button.setAttribute('aria-expanded', String(willOpen));
      });
    }

    bindAgendaDropdown('agendaViewMenuButton', 'agendaViewMenu');
    bindAgendaDropdown('agendaOptionsButton', 'agendaOptionsMenu');

    document.addEventListener('click', (event) => {
      if (event.target.closest('.dc-view-dropdown, .dc-options-dropdown')) {
        return;
      }

      document.querySelectorAll('.dc-dropdown-menu').forEach((menu) => {
        menu.hidden = true;
      });

      document
        .querySelectorAll('[aria-expanded]')
        .forEach((button) => button.setAttribute('aria-expanded', 'false'));
    });
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
