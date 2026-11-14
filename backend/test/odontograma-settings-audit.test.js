'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Ejecuta el handler auténtico con una conexión simulada, sin tocar MySQL ni expedientes.
const source = fs.readFileSync(path.resolve(__dirname, '../src/routes/odontogramas.routes.js'), 'utf8');

function getHandler(connection) {
    const routes = new Map();
    const router = {};
    for (const method of ['get', 'post', 'patch', 'delete']) {
        router[method] = (route, handler) => {
            routes.set(method.toUpperCase() + ' ' + route, handler);
            return router;
        };
    }
    const pool = { getConnection: async () => connection };
    const fakeRequire = (name) => {
        if (name === 'express') return { Router: () => router };
        if (name === '../config/database') return pool;
        throw new Error('Dependencia inesperada: ' + name);
    };
    vm.runInNewContext(source, {
        module: { exports: {} },
        require: fakeRequire
    }, { filename: 'odontogramas.routes.js' });
    const handler = routes.get('PATCH /:id');
    assert.equal(typeof handler, 'function');
    return handler;
}

for (const dentition of ['ADULTO', 'MIXTO', 'NINO']) {
    test('Cambiar dentición a ' + dentition + ' guarda cambios y auditoría sin 500', async () => {
        const queries = [];
        const events = [];
        const connection = {
            beginTransaction: async () => { events.push('begin'); },
            query: async (sql, params) => {
                queries.push({ sql, params });
                if (/UPDATE odontogramas/.test(sql)) return [{ affectedRows: 1 }];
                if (/INSERT INTO auditoria/.test(sql)) return [{ affectedRows: 1 }];
                throw new Error('Consulta inesperada: ' + sql);
            },
            commit: async () => { events.push('commit'); },
            rollback: async () => { events.push('rollback'); },
            release: () => { events.push('release'); }
        };
        const handler = getHandler(connection);
        const response = {
            statusCode: 200,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; }
        };
        let nextError = null;
        await handler({
            params: { id: '42' },
            body: { tipoDenticion: dentition, nomenclatura: 'FDI', observaciones: 'Sin cambios' }
        }, response, (error) => { nextError = error; });
        assert.equal(nextError, null, 'No debe ocurrir ReferenceError');
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.ok, true);
        assert.deepEqual(events, ['begin', 'commit', 'release']);
        assert.equal(queries.length, 2);
        assert.equal(queries[0].params[0], dentition);
        assert.equal(queries[0].params[1], 'FDI');
        const audit = JSON.parse(queries[1].params[1]);
        assert.equal(audit.tipoDenticion, dentition);
        assert.equal(audit.nomenclatura, 'FDI');
    });
}

test('Nomenclatura ADA también se registra correctamente', async () => {
    let audit = null;
    const connection = {
        beginTransaction: async () => {},
        query: async (sql, params) => {
            if (/INSERT INTO auditoria/.test(sql)) audit = JSON.parse(params[1]);
            return [{ affectedRows: 1 }];
        },
        commit: async () => {},
        rollback: async () => {},
        release: () => {}
    };
    const handler = getHandler(connection);
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    let error = null;
    await handler({ params: { id: '42' }, body: { tipoDenticion: 'MIXTO', nomenclatura: 'ADA' } }, response, (value) => { error = value; });
    assert.equal(error, null);
    assert.equal(response.statusCode, 200);
    assert.equal(audit.nomenclatura, 'ADA');
});

test('No modifica odontogramas finalizados', async () => {
    let rolledBack = false, committed = false, audited = false;
    const connection = {
        beginTransaction: async () => {},
        query: async (sql) => {
            if (/UPDATE odontogramas/.test(sql)) return [{ affectedRows: 0 }];
            if (/INSERT INTO auditoria/.test(sql)) audited = true;
            return [{ affectedRows: 1 }];
        },
        commit: async () => { committed = true; },
        rollback: async () => { rolledBack = true; },
        release: () => {}
    };
    const handler = getHandler(connection);
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ params: { id: '42' }, body: { tipoDenticion: 'NINO', nomenclatura: 'FDI' } }, res, () => {});
    assert.equal(res.statusCode, 409);
    assert.equal(rolledBack, true);
    assert.equal(committed, false);
    assert.equal(audited, false);
});
