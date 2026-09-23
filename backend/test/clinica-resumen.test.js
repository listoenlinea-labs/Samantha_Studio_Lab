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

test('editar y eliminar una cita persiste cambios y conserva auditoría', async () => {
    const previousConnection = pool.getConnection;
    const calls = [];
    pool.getConnection = async () => ({
        beginTransaction: async () => calls.push('begin'),
        commit: async () => calls.push('commit'),
        rollback: async () => calls.push('rollback'),
        release: () => calls.push('release'),
        query: async (sql, params) => {
            calls.push({ sql, params });
            if (sql.includes('FOR UPDATE')) return [[{ id_paciente: 7, estado: 'CONFIRMADA' }]];
            return [{ affectedRows: 1 }];
        }
    });
    const app = express();
    app.use(express.json());
    app.use('/api/clinica', routes);
    const server = app.listen(0);
    try {
        const url = `http://127.0.0.1:${server.address().port}/api/clinica/citas/9`;
        const edited = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inicioAt: '2026-10-01T10:00', finAt: '2026-10-01T10:45',
                motivo: 'Control de higiene', estado: 'CONFIRMADA', doctor: 'Dra. Sofía', comentario: 'Prueba' }) });
        assert.equal(edited.status, 200);
        assert.ok(calls.some((call) => call.sql?.startsWith('UPDATE citas SET inicio_at')
            && call.params[0] === '2026-10-01 10:00' && call.params.at(-1) === 9));
        assert.ok(calls.some((call) => call.sql?.includes('EDITAR_CITA')));
        const removed = await fetch(url, { method: 'DELETE' });
        assert.equal(removed.status, 200);
        assert.ok(calls.some((call) => call.sql?.includes("estado = 'CANCELADA'") && call.params[0] === 9));
        assert.ok(calls.some((call) => call.sql?.includes('CANCELAR_CITA')));
        assert.equal(calls.filter((call) => call === 'commit').length, 2);
        assert.equal((await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inicioAt: '2026-10-01T11:00', finAt: '2026-10-01T10:00',
                motivo: 'Error', estado: 'PROGRAMADA' }) })).status, 400);
    } finally {
        pool.getConnection = previousConnection;
        await new Promise((resolve) => server.close(resolve));
    }
});
