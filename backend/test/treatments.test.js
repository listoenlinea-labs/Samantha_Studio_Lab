const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const routeSource = fs.readFileSync(path.join(root, 'backend/src/routes/tratamientos.routes.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'backend/src/app.js'), 'utf8');
const frontendSource = fs.readFileSync(path.join(root, 'docs/assets/js/treatments.js'), 'utf8');

test('la API usa catalogo_tratamientos sin datos de demostración', () => {
    assert.match(routeSource, /FROM catalogo_tratamientos/);
    assert.match(routeSource, /INSERT INTO catalogo_tratamientos/);
    assert.match(routeSource, /UPDATE catalogo_tratamientos/);
    assert.match(appSource, /app\.use\('\/api\/tratamientos', tratamientosRoutes\)/);
});

test('el frontend consulta la API y permite crear y editar', () => {
    assert.match(frontendSource, /api\('\/tratamientos\?incluirInactivos=true'\)/);
    assert.match(frontendSource, /method: isEditing \? 'PATCH' : 'POST'/);
    assert.doesNotMatch(frontendSource, /Procedimiento demo/);
});

test('la consulta conserva los campos reales del catálogo', () => {
    for (const field of ['duracion_minutos', 'sesiones_sugeridas', 'costo_calculado', 'precio_venta', 'activo']) {
        assert.match(routeSource, new RegExp(field));
    }
});
