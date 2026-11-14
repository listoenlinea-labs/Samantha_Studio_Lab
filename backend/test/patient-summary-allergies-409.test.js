'use strict';
// Regresión: guardar alergias desde el resumen debe funcionar incluso cuando
// una base histórica rechaza INSERTs duplicados en historias_clinicas.
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

async function withFakeDatabase(run) {
    const operations = [];
    let currentAllergies = 'Sin antecedentes declarados';
    const connection = {
        beginTransaction: async () => operations.push('BEGIN'),
        commit: async () => operations.push('COMMIT'),
        rollback: async () => operations.push('ROLLBACK'),
        release: () => operations.push('RELEASE'),
        query: async (sql, values = []) => {
            const query = String(sql).replace(/\s+/g, ' ').trim();
            operations.push(query);
            if (/INSERT INTO historias_clinicas/i.test(query)) {
                // Si se intenta versionar con el editor breve, simular un
                // UNIQUE legado en MySQL; la prueba debe fallar.
                throw Object.assign(new Error('Índice UNIQUE de prueba'), {
                    code: 'ER_DUP_ENTRY', errno: 1062
                });
            }
            if (/^SELECT id_paciente FROM pacientes /i.test(query))
                return [[{ id_paciente: 5 }]];
            if (/^UPDATE pacientes SET alergias/i.test(query)) {
                currentAllergies = values[0];
                return [{ affectedRows: 1 }];
            }
            if (/^SELECT id_paciente FROM expedientes_paciente /i.test(query))
                return [[{ id_paciente: 5 }]];
            if (/^UPDATE expedientes_paciente SET nota_general/i.test(query))
                return [{ affectedRows: 1 }];
            if (/^INSERT INTO auditoria/i.test(query))
                return [{ insertId: 42 }];
            throw new Error('Consulta no simulada: ' + query.slice(0, 85));
        }
    };
    const fakePool = {
        getConnection: async () => connection,
        query: async (sql, values) => {
            const query = String(sql).replace(/\s+/g, ' ').trim();
            operations.push(query);
            if (/FROM pacientes p LEFT JOIN historias_clinicas h/i.test(query)) {
                return [[{
                    idHistoria: 17, motivoConsulta: 'Control preventivo',
                    antecedentesMedicos: null, antecedentesOdontologicos: null,
                    medicamentosActuales: null, diagnosticoGeneral: null,
                    observaciones: null, vigente: 1,
                    alergiasActuales: currentAllergies
                }]];
            }
            throw new Error('Consulta de lectura no simulada: ' + query.slice(0, 85));
        }
    };
    const dbPath = require.resolve('../src/config/database');
    const routePath = require.resolve('../src/routes/pacientes-clinicos.routes');
    const dbPrevious = require.cache[dbPath];
    const routePrevious = require.cache[routePath];
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakePool };
    delete require.cache[routePath];
    let router;
    try { router = require(routePath); } finally {
        if (dbPrevious) require.cache[dbPath] = dbPrevious;
        else delete require.cache[dbPath];
        if (routePrevious) require.cache[routePath] = routePrevious;
        else delete require.cache[routePath];
    }
    const app = express();
    app.use(express.json());
    app.use('/api/pacientes', router);
    app.use((error, _req, res, _next) => res.status(500).json({ ok: false, mensaje: error.message }));
    const server = app.listen(0, '127.0.0.1');
    try {
        await new Promise((resolve, reject) => {
            if (server.listening) return resolve();
            server.once('listening', resolve);
            server.once('error', reject);
        });
        const base = 'http://127.0.0.1:' + server.address().port;
        await run({ base, operations, getAllergies: () => currentAllergies });
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
}

test('editar alergias del resumen actualiza solo pacientes y auditoría, sin insertar historia', async () => {
    await withFakeDatabase(async ({ base, operations }) => {
        const response = await fetch(base + '/api/pacientes/5/resumen', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ alergias: 'Alergia de prueba' })
        });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).ok, true);
        assert.ok(operations.some(sql => /^UPDATE pacientes SET alergias/i.test(sql)));
        assert.ok(operations.some(sql => /^INSERT INTO auditoria/i.test(sql)));
        assert.equal(operations.includes('COMMIT'), true);
        assert.equal(operations.includes('ROLLBACK'), false);
        assert.equal(operations.some(sql => /INSERT INTO historias_clinicas/i.test(sql)), false);
        assert.equal(operations.some(sql => /UPDATE historias_clinicas/i.test(sql)), false);
    });
});

test('historia clínica presenta alergias actuales, conservando la versión existente', async () => {
    await withFakeDatabase(async ({ base, operations }) => {
        const response = await fetch(base + '/api/pacientes/5/historia-clinica');
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.historia.alergias, 'Sin antecedentes declarados');
        assert.equal(data.historia.idHistoria, 17);
        assert.equal(operations.some(sql => /UPDATE historias_clinicas|INSERT INTO historias_clinicas/i.test(sql)), false);
    });
});

test('editar una nota no genera versiones ni modifica alergias', async () => {
    await withFakeDatabase(async ({ base, operations }) => {
        const response = await fetch(base + '/api/pacientes/5/resumen', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ notaGeneral: 'Nota de seguimiento de prueba' })
        });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).ok, true);
        assert.equal(operations.some(sql => /^UPDATE pacientes SET alergias/i.test(sql)), false);
        assert.equal(operations.some(sql => /^UPDATE expedientes_paciente SET nota_general/i.test(sql)), true);
    });
});
