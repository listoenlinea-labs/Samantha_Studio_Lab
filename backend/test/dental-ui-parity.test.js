const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const catalog = require('../src/config/odontogram-catalog');

const frontendPath = path.join(__dirname, '../../docs/assets/js/patient-history.js');
const artPath = path.join(__dirname, '../../docs/assets/js/dental-art.js');
const periodontogramRoutePath = path.join(__dirname, '../src/routes/periodontogramas.routes.js');
const frontend = fs.readFileSync(frontendPath, 'utf8');
const routeSource = fs.readFileSync(periodontogramRoutePath, 'utf8');

function loadDentalArt() {
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(artPath, 'utf8'), context);
    return context.window.SamanthaDentalArt;
}

test('todos los hallazgos del catálogo tienen un símbolo SVG propio', () => {
    const art = loadDentalArt();
    assert.equal(typeof art.findingGlyph, 'function');
    catalog.forEach((item) => {
        item.variantes.split(',').forEach((variant) => {
            const glyph = art.findingGlyph(item.icono, variant, true);
            assert.match(glyph, /<svg class="ph-finding-glyph"/);
            assert.match(glyph, new RegExp(`icon-${item.icono.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
            assert.doesNotMatch(glyph, /icon-punto/, `Falta el símbolo ${item.icono}`);
        });
    });
});

test('el odontograma muestra tres símbolos, excedente y detalle completo', () => {
    assert.match(frontend, /findings\.slice\(0, 3\)/);
    assert.match(frontend, /ph-tooth-overflow/);
    assert.match(frontend, /function selectedToothDetails/);
    assert.match(frontend, /normalize\('NFD'\)/);
    assert.match(frontend, /aria-modal="true"/);
});

test('el periodontograma modela seis sitios por diente sin ceros artificiales', () => {
    assert.match(frontend, /tres vestibulares y tres linguales o palatinos/);
    assert.match(frontend, /value="LINGUAL">Lingual \/ palatina/);
    assert.doesNotMatch(frontend, /<option>PALATINA<\/option>/);
    assert.match(frontend, /function measurementHasData/);
    assert.match(frontend, /placeholder="—"/);
    assert.match(frontend, /state\.dirtyMeasurements/);
    assert.match(frontend, /function perioGraphPath/);
});

test('la API permite limpiar todas las mediciones de un borrador', () => {
    assert.doesNotMatch(routeSource, /!measurements\.length/);
    assert.match(routeSource, /!Array\.isArray\(req\.body\?\.mediciones\)/);
    assert.match(routeSource, /if \(values\.length\) \{/);
});
