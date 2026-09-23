const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../src/config/database');
const routes = require('../src/routes/clinica.routes');

test('el resumen clínico entrega métricas y citas consultadas a MySQL', async () => {
    const previousQuery = pool.query;
    const calls = [];
    pool.query = async (sql, params) => {
        calls.push({ sql, params });
        if (sql.includes('AS activos')) return [[{ activos: 3, ficticios: 2 }]];
        if (sql.includes('AS confirmadas')) return [[{ total: 2, confirmadas: 1 }]];
        if (sql.includes('AS pendientes')) return [[{ pendientes: 4 }]];
        if (sql.includes('AS vigentes')) return [[{ vigentes: 2 }]];
        if (sql.includes('FROM citas c')) return [[{ idCita: 1, paciente: 'Itzel Navarro Mejía' }]];
        return [[]];
    };
    const app = express();
    app.use('/api/clinica', routes);
    const server = app.listen(0);
    try {
        const port = server.address().port;
        const response = await fetch(`http://127.0.0.1:${port}/api/clinica/resumen?fecha=2026-09-23`);
        const result = await response.json();
        assert.equal(response.status, 200);
        assert.deepEqual(result.metricas, {
            pacientes: 3, pacientesFicticios: 2, citas: 2, confirmadas: 1, tareas: 4, historias: 2
        });
        assert.equal(result.citas[0].paciente, 'Itzel Navarro Mejía');
        assert.ok(calls.some(({ params }) => params?.[0] === '2026-09-23'));
    } finally {
        pool.query = previousQuery;
        await new Promise((resolve) => server.close(resolve));
    }
});

test('la agenda consulta citas de un periodo y rechaza rangos inválidos', async () => {
    const previousQuery = pool.query;
    const calls = [];
    pool.query = async (sql, params) => {
        calls.push({ sql, params });
        return [[{ idCita: 18, idPaciente: 4, paciente: 'Itzel Navarro Mejía', estado: 'CONFIRMADA' }]];
    };
    const app = express();
    app.use('/api/clinica', routes);
    const server = app.listen(0);
    try {
        const url = `http://127.0.0.1:${server.address().port}/api/clinica/citas`;
        const response = await fetch(`${url}?desde=2026-09-01&hasta=2026-09-30`);
        assert.equal(response.status, 200);
        assert.equal((await response.json()).items[0].paciente, 'Itzel Navarro Mejía');
        assert.deepEqual(calls[0].params, ['2026-09-01', '2026-09-30']);
        assert.equal((await fetch(`${url}?desde=2026-09-30&hasta=2026-09-01`)).status, 400);
        assert.equal((await fetch(`${url}?desde=2026-09-01&hasta=2026-12-01`)).status, 400);
        assert.equal(calls.length, 1);
    } finally {
        pool.query = previousQuery;
        await new Promise((resolve) => server.close(resolve));
    }
});
