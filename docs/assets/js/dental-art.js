/* Dientes y símbolos SVG del expediente clínico de Samantha Studio Lab.
   Las formas son ayudas visuales ilustrativas y deben validarse clínicamente. */
(() => {
  'use strict';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  const glyphs = {
    sano: '<path d="m5 12 4 4L19 6"/>',
    ausente: '<path d="m5 5 14 14M19 5 5 19"/>',
    superficie: '<path d="M5 5h14v14H5zM5 5l14 14M19 5 5 19"/>',
    extraccion: '<path d="m5 5 14 14M19 5 5 19"/>',
    endodoncia: '<path d="M8 3v12q0 6 5 6h4M12 3v11"/>',
    corona: '<path d="M4 9 7 4l5 5 5-5 3 5-2 11H6z"/>',
    fractura: '<path d="m15 2-7 8 7 3-6 9"/>',
    'lesion-cervical': '<path d="M3 15q9-12 18 0M5 18h14"/>',
    'defecto-esmalte': '<circle cx="7" cy="8" r="2"/><circle cx="16" cy="7" r="2"/><circle cx="12" cy="16" r="3"/>',
    impactacion: '<path d="M3 19h18M6 15l4-10 8 4-4 8zM3 3l3 3M21 3l-3 3"/>',
    implante: '<path d="M6 4h12M8 7h8l-2 14h-4zM6 10h12M7 14h10M8 18h8"/>',
    linea: '<path d="M2 12h20"/>',
    gingivitis: '<path d="M2 17q10-15 20 0"/><text x="12" y="11">G</text>',
    erupcion: '<path d="M3 19h18M7 14l5-11 5 11M12 4v13"/>',
    fisura: '<path d="m15 3-7 7 4 4-5 7"/>',
    remanente: '<path d="m5 5 3 15 4-9 4 9 3-15M4 5h16"/>',
    periodontitis: '<path d="M2 18q10-13 20 0"/><text x="12" y="10">P</text>',
    'perno-fibra': '<path d="m12 3 6 18H6zM12 9v8"/>',
    frenillo: '<path d="M3 5v7q3 9 6 0V5m6 0v7q3 9 6 0V5"/>',
    ffp: '<path d="m3 7 5 11 4-11 4 11 5-11"/>',
    'aparato-fijo': '<path d="M1 12h22M3 7h6v10H3zM15 7h6v10h-6z"/>',
    fusion: '<path d="M12 7C2-2 1 20 9 20h6C23 20 22-2 12 7ZM12 7v10"/>',
    'aparato-removible': '<path d="M3 17 7 5h10l4 12M5 12h14"/>',
    geminacion: '<path d="M12 8C0-5 1 21 10 21h4C23 21 24-5 12 8ZM12 8V3"/>',
    bolsa: '<path d="M3 4v13q2 6 6 0V9M13 5v14M17 5v14M21 5v14"/>',
    gingivectomia: '<path d="M2 17q10-12 20 0M6 3l12 9M18 3 6 12"/>',
    carilla: '<path d="M8 3h9l-2 18H8z"/>',
    carillas: '<path d="M3 4h7L9 20H3zM14 4h7l-1 16h-6z"/>',
    giroversion: '<path d="M5 15a8 8 0 1 1 13 3M2 14l4 4 4-4"/>',
    furca: '<path d="M12 3v8M12 11 4 21M12 11l8 10M7 6h10"/>',
    diastema: '<path d="M4 3q10 9 0 18M20 3q-10 9 0 18"/>',
    'perno-metalico': '<path d="M7 3h10v5h-3v13h-4V8H7zM7 12h10M7 16h10"/>',
    'flecha-arriba': '<path d="M12 21V3M5 10l7-7 7 7"/>',
    ectopica: '<path d="M3 17h18M8 11l3-8 7 3-3 8zM3 4l3 3"/>',
    clavija: '<path d="m12 3 8 18H4z"/>',
    'flecha-abajo': '<path d="M12 3v18M5 14l7 7 7-7"/>',
    puente: '<path d="M4 21V5h16v16M4 10h16"/>',
    pulpectomia: '<path d="M7 3v12q0 6 6 6h4M12 3v13M17 3v8"/>',
    pulpotomia: '<path d="M5 4h14v9H5zM9 13v8M15 13v8M5 8h14"/>',
    sellante: '<path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18"/>',
    conducto: '<path d="M12 2v20"/>',
    caries: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
    restauracion: '<path d="m12 3 9 9-9 9-9-9z" fill="currentColor" stroke="none"/>',
    punto: '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>'
  };

  function findingGlyph(icon, visualState, compact = false) {
    const normalizedState = String(visualState || 'NEUTRO').toUpperCase();
    const stateClass = ['MALO', 'BUENO', 'NEUTRO'].includes(normalizedState)
      ? normalizedState.toLowerCase()
      : 'neutro';
    const key = Object.hasOwn(glyphs, icon) ? icon : 'punto';
    return `<span class="ph-symbol ${stateClass} icon-${escapeHtml(key)} ${compact ? 'compact' : ''}" aria-hidden="true"><svg class="ph-finding-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">${glyphs[key]}</svg></span>`;
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
    const primary = quadrant >= 5;
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
    return `<svg viewBox="0 0 54 84" aria-hidden="true" class="ph-tooth-art ${arch}"><g>${roots}<path class="crown" d="${crown}"/></g></svg>`;
  }

  window.SamanthaDentalArt = { toothType, toothArtwork, findingGlyph };
})();
