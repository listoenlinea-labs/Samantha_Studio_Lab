const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const routeSource = fs.readFileSync(path.join(root, 'backend/src/routes/pacientes-clinicos.routes.js'), 'utf8');
const schemaSource = fs.readFileSync(path.join(root, 'backend/src/config/clinical-schema.js'), 'utf8');
const ensureSource = fs.readFileSync(path.join(root, 'backend/src/config/ensure-schema.js'), 'utf8');
const frontendSource = fs.readFileSync(path.join(root, 'docs/assets/js/patient-experience.js'), 'utf8');

test('las rutas del panel rápido consultan y guardan datos reales', () => {
    for (const route of ['citas', 'filiacion', 'presupuestos', 'tareas']) {
        assert.match(routeSource, new RegExp(`router\\.get\\('/:\\id/${route}'`));
    }
    for (const route of ['citas', 'presupuestos', 'tareas']) {
        assert.match(routeSource, new RegExp(`router\\.post\\('/:\\id/${route}'`));
    }
    assert.match(routeSource, /router\.patch\('\/:id\/filiacion'/);
});

test('el esquema compatible conserva las tablas clínicas existentes', () => {
    assert.match(schemaSource, /CREATE TABLE IF NOT EXISTS citas/);
    assert.match(schemaSource, /CREATE TABLE IF NOT EXISTS presupuestos/);
    assert.match(schemaSource, /CREATE TABLE IF NOT EXISTS tareas_paciente/);
    assert.match(ensureSource, /\['pacientes', 'linea_negocio'/);
});

test('el panel muestra las cuatro pestañas y sus formularios', () => {
    for (const label of ['Citas', 'Filiación', 'Presupuestos', 'Tareas']) {
        assert.match(frontendSource, new RegExp(label));
    }
    assert.match(frontendSource, /data-px-form="filiacion"/);
    assert.match(frontendSource, /quickModal/);
    assert.match(frontendSource, /loadDrawerTab/);
});
