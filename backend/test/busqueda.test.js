const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const pool = require('../src/config/database');
const routes = require('../src/routes/busqueda.routes');

test('busca registros reales con parámetros y limita los resultados', async () => {
    const original = pool.query;
    const queries = [];
    pool.query = async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes('FROM pacientes p WHERE')) return [[{ idPaciente: 7, nombre: 'Itzel Navarro Mejía' }]];
        if (sql.includes('FROM citas c INNER JOIN')) return [[{ idCita: 9, fecha: '2026-09-25', paciente: 'Itzel Navarro Mejía' }]];
        return [[{ idTratamiento: 3, nombre: 'Limpieza' }]];
    };
    const app = express();
    app.use('/api/busqueda', routes);
    const server = app.listen(0);
    try {
        const url = `http://127.0.0.1:${server.address().port}/api/busqueda`;
        assert.deepEqual(await (await fetch(`${url}?q=i`)).json(), { pacientes: [], citas: [], tratamientos: [] });
        assert.equal(queries.length, 0);
        const response = await fetch(`${url}?q=Itzel`);
        const data = await response.json();
        assert.equal(response.status, 200);
        assert.equal(data.pacientes[0].idPaciente, 7);
        assert.equal(data.citas[0].idCita, 9);
        assert.equal(data.tratamientos[0].idTratamiento, 3);
        assert.equal(queries.length, 3);
        assert.ok(queries.every((query) => query.sql.includes('LIMIT 5') && query.params.every((param) => param === '%Itzel%')));
    } finally {
        pool.query = original;
        await new Promise((resolve) => server.close(resolve));
    }
});
