window.APP_CONFIG = Object.freeze({
    // El backend sirve esta página y /api bajo el mismo dominio en producción.
    API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'
        : `${window.location.origin}/api`
});
