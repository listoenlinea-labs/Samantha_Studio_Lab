(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.YerenaRadiographControls = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STEP = 15;
  const BOUNDS = { minZoom: 0.5, maxZoom: 4 };

  function create() {
    let yaw = 0, pitch = 0, roll = 0, zoom = 1;
    const state = () => ({ yaw, pitch, roll, zoom });
    function change(action) {
      switch (action) {
        // Mismo eje horizontal que el visor demostrativo de Samantha (rotateY).
        case 'left': yaw -= STEP; break;
        case 'right': yaw += STEP; break;
        // Inclinación en el eje vertical (rotateX).
        case 'up': pitch -= STEP; break;
        case 'down': pitch += STEP; break;
        // Rotación plana adicional, útil para radiografías 2D reales.
        case 'turn-left': roll -= 90; break;
        case 'turn-right':
        case 'rotate': roll += 90; break;
        case 'plus': zoom = Math.min(BOUNDS.maxZoom, Math.round((zoom + 0.25) * 100) / 100); break;
        case 'minus': zoom = Math.max(BOUNDS.minZoom, Math.round((zoom - 0.25) * 100) / 100); break;
        case 'reset': yaw = 0; pitch = 0; roll = 0; zoom = 1; break;
        default: return false;
      }
      return true;
    }
    function cssTransform() {
      return 'perspective(900px) rotateX(' + pitch + 'deg) rotateY(' + yaw + 'deg) rotateZ(' + roll + 'deg) scale(' + zoom + ')';
    }
    return { change, state, cssTransform };
  }

  const icon = (body) => '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  const artwork = {
    left: icon('<path d="M4 10V4m0 6h6"/><path d="M5.5 16a8 8 0 1 0 1.2-9.8"/>'),
    right: icon('<path d="M20 10V4m0 6h-6"/><path d="M18.5 16a8 8 0 1 1-1.2-9.8"/>'),
    up: icon('<path d="m6 14 6-6 6 6"/><path d="M12 9v11"/>'),
    down: icon('<path d="m6 10 6 6 6-6"/><path d="M12 15V4"/>'),
    'turn-left': icon('<path d="M5 6v5h5"/><path d="M6.5 16a7 7 0 1 0 1-8"/>'),
    'turn-right': icon('<path d="M19 6v5h-5"/><path d="M17.5 16a7 7 0 1 1-1-8"/>'),
    plus: icon('<circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6M16 16l5 5"/>'),
    minus: icon('<circle cx="11" cy="11" r="7"/><path d="M8 11h6M16 16l5 5"/>'),
    reset: icon('<path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-7h6v7"/>')
  };
  const groups = [
    [['left', 'Girar hacia la izquierda en 3D'], ['right', 'Girar hacia la derecha en 3D']],
    [['up', 'Inclinar hacia arriba'], ['down', 'Inclinar hacia abajo']],
    [['turn-left', 'Rotar 90° a la izquierda'], ['turn-right', 'Rotar 90° a la derecha']],
    [['minus', 'Alejar imagen'], ['plus', 'Acercar imagen']],
    [['reset', 'Restablecer orientación y zoom']]
  ];

  function toolbarMarkup() {
    return '<div class="clinical-rx-controls" role="toolbar" aria-label="Controles de orientación del visor">' +
      groups.map((group, groupIndex) => '<div class="clinical-rx-control-group" role="group" aria-label="' +
        ['Giro lateral','Inclinación vertical','Giro plano','Zoom','Restablecer'][groupIndex] + '">' +
        group.map(([action, label]) => '<button type="button" class="clinical-rx-control" data-image="' + action +
          '" aria-label="' + label + '" title="' + label + '">' + artwork[action] + '</button>').join('') +
        '</div>').join('') + '</div>';
  }
  return { create, toolbarMarkup };
});
