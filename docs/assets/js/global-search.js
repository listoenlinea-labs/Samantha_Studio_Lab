(function () {
  'use strict';

  function init() {
  if (!document.getElementById('globalSearchBackdrop')) {
    document.body.insertAdjacentHTML('beforeend', '<div class="global-search-backdrop" id="globalSearchBackdrop" hidden><section class="global-search-panel" id="globalSearchPanel" role="dialog" aria-label="Buscar en la aplicación"><div class="global-search-head"><label for="globalSearchInput">Buscar en el consultorio</label><button type="button" id="globalSearchClose" aria-label="Cerrar búsqueda">×</button></div><input id="globalSearchInput" type="search" autocomplete="off" placeholder="Paciente, cita, tratamiento o sección"><div id="globalSearchResults" class="global-search-results" role="status" aria-live="polite"></div></section></div>');
  }

  const toggle = document.getElementById('globalSearchToggle');
  const backdrop = document.getElementById('globalSearchBackdrop');
  const input = document.getElementById('globalSearchInput');
  const results = document.getElementById('globalSearchResults');
  if (!toggle || !backdrop || !input || !results) return;

  const api = window.APP_CONFIG?.API_URL ||
    (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:3000/api' : `${location.origin}/api`);
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  let timer;
  let controller;
  let sequence = 0;

  const actions = () => {
    const links = [...document.querySelectorAll('#appSidebar a[href], .ph-header nav a[href]')];
    const items = links.map((link) => ({
      label: link.textContent.trim(),
      href: link.getAttribute('href'),
      category: 'Secciones'
    }));
    if (!document.getElementById('appSidebar')) {
      const role = localStorage.getItem('ssl-active-role') || 'Administrador';
      const sections = [
        ['Inicio', 'index.html'], ['Agenda', 'agenda.html'], ['Pacientes', 'pacientes.html'],
        ['Jornada clínica', 'operacion.html'], ['Tratamientos', 'tratamientos.html'],
        ['Seguimientos', 'seguimientos.html'], ['Rayos X', 'radiografias.html'],
        ['Inventario', 'inventario.html'], ['Finanzas', 'finanzas.html'],
        ['Reportes', 'reportes.html'], ['Configuración', 'configuracion.html']
      ];
      for (const [label, href] of sections) {
        if (role === 'Recepcionista' && ['Jornada clínica', 'Rayos X', 'Inventario'].includes(label)) continue;
        if (role !== 'Administrador' && ['Finanzas', 'Reportes', 'Configuración'].includes(label)) continue;
        if (!items.some((item) => item.href === href)) items.push({ label, href, category: 'Secciones' });
      }
    }
    items.push({ label: 'Citas de hoy', href: `agenda.html?fecha=${today()}`, category: 'Acciones' });
    return items;
  };

  function renderGroups(groups) {
    const html = groups.map(([heading, items]) => items.length ?
      `<div class="global-search-group"><h3>${safe(heading)}</h3>${items.map((item) =>
        `<a class="global-search-result" href="${safe(item.href)}"><span><strong>${safe(item.label)}</strong>${item.detail ? `<small>${safe(item.detail)}</small>` : ''}</span><span aria-hidden="true">↗</span></a>`).join('')}</div>` : '').join('');
    results.innerHTML = html || '<p class="global-search-empty">No se encontraron resultados.</p>';
  }

  function close() {
    clearTimeout(timer);
    controller?.abort();
    sequence += 1;
    backdrop.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }

  function refresh() {
    const q = input.value.trim().slice(0, 80);
    const matches = actions().filter((item) => !q || normalize(item.label).includes(normalize(q)));
    const sections = matches.filter((item) => item.category === 'Secciones').slice(0, 6);
    const shortcuts = matches.filter((item) => item.category === 'Acciones');
    renderGroups([['Acciones', shortcuts], ['Secciones', sections]]);
    clearTimeout(timer);
    controller?.abort();
    const request = ++sequence;
    if (q.length < 2) return;
    timer = setTimeout(async () => {
      controller = new AbortController();
      try {
        const response = await fetch(`${api}/busqueda?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('No se pudieron consultar los registros.');
        const data = await response.json();
        if (request !== sequence || backdrop.hidden) return;
        renderGroups([
          ['Acciones', shortcuts], ['Secciones', sections],
          ['Pacientes', (data.pacientes || []).map((p) => ({
            label: p.nombre, detail: p.telefono || 'Abrir expediente',
            href: `historial-paciente.html?id=${Number(p.idPaciente)}`
          }))],
          ['Citas', (data.citas || []).map((c) => ({
            label: c.paciente, detail: `${c.fecha} · ${c.hora} · ${c.motivo || 'Cita'}`,
            href: `agenda.html?fecha=${encodeURIComponent(c.fecha)}&cita=${Number(c.idCita)}`
          }))],
          ['Tratamientos', (data.tratamientos || []).map((t) => ({
            label: t.nombre, detail: t.categoria || 'Tratamiento',
            href: `tratamientos.html?buscar=${encodeURIComponent(t.nombre)}`
          }))]
        ]);
      } catch (error) {
        if (error.name === 'AbortError' || request !== sequence) return;
        results.insertAdjacentHTML('beforeend', '<p class="global-search-error" role="alert">No se pudieron consultar los registros. Intenta de nuevo.</p>');
      }
    }, 250);
  }

  function open() {
    backdrop.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    input.value = '';
    refresh();
    input.focus();
  }

  toggle.addEventListener('click', () => backdrop.hidden ? open() : close());
  document.getElementById('globalSearchClose')?.addEventListener('click', close);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
  input.addEventListener('input', refresh);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      results.querySelector('a')?.focus();
    }
    if (event.key === 'Enter') results.querySelector('a')?.click();
  });
  results.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const links = [...results.querySelectorAll('a')];
    const next = links.indexOf(document.activeElement) + (event.key === 'ArrowDown' ? 1 : -1);
    if (next < 0) input.focus();
    else links[Math.min(next, links.length - 1)]?.focus();
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      backdrop.hidden ? open() : input.focus();
    }
    if (event.key === 'Escape' && !backdrop.hidden) close();
  });
  }
  if (document.getElementById('globalSearchToggle')) init();
  else window.addEventListener('ssl:ready', init, { once: true });
})();
