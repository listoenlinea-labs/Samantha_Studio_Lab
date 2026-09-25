const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../src/config/database');
const routes = require('../src/routes/asistencias.routes');

function serve() {
    const app = express();
    app.use(express.json());
    app.use('/api/clinica/asistencias', routes);
    return app.listen(0);
}

test('la vista lee citas del día, incluidas las faltas, y valida la fecha', async () => {
    const original = pool.query;
    const calls = [];
    pool.query = async (sql, params) => {
        calls.push({ sql, params });
        return [[{ idCita: 8, estado: 'NO_ASISTIO', paciente: 'Itzel Navarro Mejía' }]];
    };
    const server = serve();
    try {
        const url = `http://127.0.0.1:${server.address().port}/api/clinica/asistencias`;
        assert.equal((await fetch(`${url}?fecha=2026-02-30`)).status, 400);
        const response = await fetch(`${url}?fecha=2026-09-23`);
        assert.equal(response.status, 200);
        assert.equal((await response.json()).items[0].estado, 'NO_ASISTIO');
        assert.deepEqual(calls[0].params, ['2026-09-23', '2026-09-23']);
        assert.match(calls[0].sql, /c\.estado <> 'CANCELADA'/);
    } finally {
        pool.query = original;
        await new Promise((resolve) => server.close(resolve));
    }
});

test('registrar llegada actualiza la cita y crea auditoría; protege las citas finalizadas', async () => {
    const original = pool.getConnection;
    const calls = [];
    let status = 'CONFIRMADA';
    pool.getConnection = async () => ({
        beginTransaction: async () => calls.push('begin'),
        commit: async () => calls.push('commit'),
        rollback: async () => calls.push('rollback'),
        release: () => calls.push('release'),
        query: async (sql, params) => {
            calls.push({ sql, params });
            if (sql.includes('FOR UPDATE')) return [[{ idPaciente: 7, estado: status, fecha: '2026-09-23' }]];
            return [{ affectedRows: 1 }];
        }
    });
    const server = serve();
    try {
        const url = `http://127.0.0.1:${server.address().port}/api/clinica/asistencias/9`;
        const patch = (estado) => fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) });
        assert.equal((await patch('CANCELADA')).status, 400);
        const result = await patch('EN_SALA');
        assert.equal(result.status, 200);
        assert.equal((await result.json()).estado, 'EN_SALA');
        assert.ok(calls.some((call) => call.sql?.startsWith('UPDATE citas SET estado') && call.params[0] === 'EN_SALA'));
        assert.ok(calls.some((call) => call.sql?.includes('REGISTRAR_ASISTENCIA') && call.params[0] === 7));
        status = 'FINALIZADA';
        assert.equal((await patch('NO_ASISTIO')).status, 409);
        assert.equal(calls.filter((call) => call === 'commit').length, 1);
    } finally {
        pool.getConnection = original;
        await new Promise((resolve) => server.close(resolve));
    }
});
