'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../src/config/database');
const routes = require('../src/routes/odontogramas.routes');

async function withFakeDatabase(run) {
    const original = pool.getConnection;
    const calls = [];
    const events = [];
    pool.getConnection = async () => ({
        beginTransaction: async () => events.push('begin'),
        commit: async () => events.push('commit'),
        rollback: async () => events.push('rollback'),
        release: () => events.push('release'),
        query: async (sql, params = []) => {
            const normalized = String(sql).replace(/\s+/g, ' ').trim();
            calls.push({ sql: normalized, params });
            if (normalized.includes('SELECT estado FROM odontogramas')) return [[{ estado: 'BORRADOR' }]];
            if (normalized.includes('FROM catalogo_hallazgos')) {
                return [[{
                    id_catalogo_hallazgo: 3,
                    clasificacion: 'BUENO',
                    variantes: 'BUENO',
                    requiere_superficie: 1
                }]];
            }
            if (normalized.includes("table_name = 'odontograma_hallazgos'")) return [[]];
            if (normalized.startsWith('DELETE FROM odontograma_hallazgos')) return [{ affectedRows: 3 }];
            return [{ affectedRows: 1, insertId: 1 }];
        }
    });

    const app = express();
    app.use(express.json());
    app.use('/api/odontogramas', routes);
    app.use((error, _req, res, _next) => res.status(500).json({ ok: false, mensaje: error.message }));
    const server = app.listen(0, '127.0.0.1');
    try {
        await new Promise((resolve, reject) => {
            if (server.listening) return resolve();
            server.once('listening', resolve);
            server.once('error', reject);
        });
        await run({ base: `http://127.0.0.1:${server.address().port}`, calls, events });
    } finally {
        pool.getConnection = original;
        await new Promise((resolve) => server.close(resolve));
    }
}

test('restauración elimina los hallazgos de las piezas y registra el reemplazo en una transacción', async () => {
    await withFakeDatabase(async ({ base, calls, events }) => {
        const response = await fetch(`${base}/api/odontogramas/9/hallazgos`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                piezas: ['16', '26'],
                codigoHallazgo: 'RESTAURACION',
                estadoVisual: 'BUENO',
                superficie: 'OCLUSAL'
            })
        });
        assert.equal(response.status, 201);
        assert.deepEqual(await response.json(), {
            ok: true,
            insertados: 2,
            eliminados: 3,
            reemplazo: true
        });
        const deleteIndex = calls.findIndex((call) => call.sql.startsWith('DELETE FROM odontograma_hallazgos'));
        const insertIndex = calls.findIndex((call) => call.sql.startsWith('INSERT INTO odontograma_hallazgos'));
        assert.ok(deleteIndex >= 0);
        assert.ok(insertIndex > deleteIndex);
        assert.deepEqual(calls[deleteIndex].params, [9, ['16', '26']]);
        const audit = calls.find((call) => call.sql.includes("VALUES ('odontogramas', ?, ?, ?)"));
        assert.equal(audit.params[1], 'REEMPLAZAR_HALLAZGOS');
        assert.equal(JSON.parse(audit.params[2]).hallazgosEliminados, 3);
        assert.deepEqual(events, ['begin', 'commit', 'release']);
    });
});

test('otros hallazgos se agregan sin borrar indicadores existentes', async () => {
    await withFakeDatabase(async ({ base, calls }) => {
        const response = await fetch(`${base}/api/odontogramas/9/hallazgos`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                piezas: ['16'],
                codigoHallazgo: 'CARIES',
                estadoVisual: 'BUENO',
                superficie: 'OCLUSAL'
            })
        });
        assert.equal(response.status, 201);
        assert.equal((await response.json()).reemplazo, false);
        assert.equal(calls.some((call) => call.sql.startsWith('DELETE FROM odontograma_hallazgos')), false);
    });
});
