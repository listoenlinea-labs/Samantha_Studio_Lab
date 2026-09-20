const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../src/config/odontogram-catalog');
const odontogramRoutes = require('../src/routes/odontogramas.routes');
const periodontogramRoutes = require('../src/routes/periodontogramas.routes');

test('el catálogo visual contiene todos los hallazgos de referencia', () => {
    const expected = [
        'Diente sano', 'Pieza dentaria ausente', 'Superficie desgastada', 'Extracción',
        'Endodoncia', 'Corona', 'Fractura', 'Lesión cervical',
        'Defectos de desarrollo de esmalte', 'Impactación',
        'Implante dental en buen estado', 'Implante dental en mal estado',
        'Edéntulo total', 'Gingivitis', 'Pieza dentaria en erupción', 'Fisura',
        'Remanente radicular', 'Periodontitis', 'Perno de fibra', 'Frenillo corto',
        'Fosa y fisuras profundas', 'Aparato ortodóntico fijo', 'Fusión',
        'Aparato ortodóntico removible', 'Geminación', 'Bolsa periodontal',
        'Gingivectomía', 'Carilla', 'Carillas', 'Giroversión',
        'Compromiso de furca', 'Diastema', 'Perno metálico',
        'Pieza dental intruida - anquilosis', 'Pieza dentaria ectópica',
        'Pieza dentaria en clavija', 'Pieza dentaria extruida',
        'Pieza dentaria intruida', 'Prótesis dental completa',
        'Prótesis dental parcial fija', 'Prótesis removible', 'Pulpectomía',
        'Pulpotomía', 'Sellantes', 'Tratamiento de conducto'
    ];
    const names = new Set(catalog.map((item) => item.nombre));
    expected.forEach((name) => assert.ok(names.has(name), `Falta ${name}`));
});

test('códigos, orden y variantes son válidos y no se repiten', () => {
    const codes = catalog.map((item) => item.codigo);
    const orders = catalog.map((item) => item.orden);
    assert.equal(new Set(codes).size, codes.length);
    assert.equal(new Set(orders).size, orders.length);
    assert.deepEqual([...orders].sort((a, b) => a - b), orders);
    catalog.forEach((item) => {
        assert.match(item.codigo, /^[A-Z0-9_]+$/);
        assert.ok(item.icono);
        assert.ok(item.variantes.split(',').every((variant) => ['BUENO', 'MALO', 'NEUTRO'].includes(variant)));
        assert.ok([0, 1].includes(item.requiereSuperficie));
    });
});

test('las rutas de persistencia y corrección están registradas', () => {
    const registered = (router) => new Set(router.stack
        .filter((layer) => layer.route)
        .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`));
    const odontogram = registered(odontogramRoutes);
    const periodontogram = registered(periodontogramRoutes);
    [
        'GET /catalogo/hallazgos', 'POST /:id/hallazgos',
        'DELETE /:id/hallazgos/:hallazgoId', 'PATCH /:id', 'PATCH /:id/finalizar'
    ].forEach((route) => assert.ok(odontogram.has(route), `Falta ${route}`));
    ['PUT /:id/mediciones', 'PATCH /:id', 'PATCH /:id/finalizar']
        .forEach((route) => assert.ok(periodontogram.has(route), `Falta ${route}`));
});

test('el primer hallazgo crea el borrador automáticamente', () => {
    const frontend = fs.readFileSync(
        path.join(__dirname, '../../docs/assets/js/patient-history.js'),
        'utf8'
    );
    assert.doesNotMatch(frontend, /Primero crea el odontograma/);
    assert.match(frontend, /const odontogram = await ensureEditableOdontogram\(\)/);
    assert.match(frontend, /Odontograma borrador creado automáticamente/);
});
