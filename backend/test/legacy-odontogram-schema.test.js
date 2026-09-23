const test = require('node:test');
const assert = require('node:assert/strict');
const ensureSchema = require('../src/config/ensure-schema');

test('la migración permite nuevos hallazgos y conserva la referencia antigua', async () => {
    const statements = [];
    const pool = {
        async query(sql) {
            statements.push(sql);
            if (sql.includes('information_schema.tables')) return [[{ existe: 1 }]];
            if (sql.includes('information_schema.columns') && sql.includes('column_name = ?')) {
                return [[{ existe: 1 }]];
            }
            if (sql.includes("column_name = 'id_hallazgo_catalogo'")) {
                return [[{ columnType: 'int(10) unsigned', isNullable: 'NO', columnDefault: null }]];
            }
            return [[]];
        }
    };
    await ensureSchema(pool);
    assert.ok(statements.includes(
        'ALTER TABLE odontograma_hallazgos MODIFY COLUMN id_hallazgo_catalogo int(10) unsigned NULL DEFAULT NULL'
    ));
    assert.ok(!statements.some((sql) => /DROP (?:TABLE|FOREIGN KEY)|DELETE FROM odontograma_hallazgos/i.test(sql)));
});

test('una instalación nueva no necesita modificar la columna antigua', async () => {
    const statements = [];
    const pool = {
        async query(sql) {
            statements.push(sql);
            if (sql.includes('information_schema.tables')) return [[{ existe: 1 }]];
            if (sql.includes('information_schema.columns') && sql.includes('column_name = ?')) {
                return [[{ existe: 1 }]];
            }
            return [[]];
        }
    };
    await ensureSchema(pool);
    assert.ok(!statements.some((sql) => sql.includes('MODIFY COLUMN id_hallazgo_catalogo')));
});
