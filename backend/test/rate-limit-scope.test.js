'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

// Comprobar que los recursos estáticos no heredan la cuota de peticiones API.
// El proceso de pruebas de Node ejecuta cada archivo en su propio contexto.
process.env.NODE_ENV = 'production';
process.env.SITE_USER = 'rate-test-user';
process.env.SITE_PASSWORD = 'rate-test-password';
process.env.API_RATE_LIMIT_MAX = '100';
const app = require('../src/app');

test('API limitada sin bloquear HTML o logos', { timeout: 20000 }, async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const headers = { Authorization: 'Basic ' + Buffer.from('rate-test-user:rate-test-password').toString('base64') };
    const staticPath = '/assets/img/logo-ssl.svg';

    const initial = await fetch(origin + staticPath, { headers });
    assert.equal(initial.status, 200);
    await initial.arrayBuffer();

    // 100 solicitudes API consumen la cuota de prueba; la 101 debe recibir 429.
    for (let i = 0; i < 100; i++) {
        const response = await fetch(origin + '/api/__rate_limit_probe', { headers });
        assert.equal(response.status, 404);
        await response.arrayBuffer();
    }
    const limited = await fetch(origin + '/api/__rate_limit_probe', { headers });
    assert.equal(limited.status, 429);
    assert.match(limited.headers.get('content-type') || '', /application\/json/);
    const data = await limited.json();
    assert.equal(data.ok, false);

    // La navegación y las imágenes deben seguir respondiendo aunque la API esté limitada.
    for (const url of ['/index.html', '/pacientes.html', staticPath]) {
        const response = await fetch(origin + url, { headers });
        assert.equal(response.status, 200, url);
        await response.arrayBuffer();
    }
});
