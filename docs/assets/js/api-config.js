// Configuración de API del consultorio. GitHub Pages solo aloja el frontend.
// Si se despliega la API en otro dominio, define window.SSL_API_BASE_URL
// en este archivo (ejemplo de formato: 'https://TU-SERVIDOR/api').
// Nunca incluir contraseñas, tokens o credenciales MySQL en el navegador.
// Pegar aquí, una sola vez, la URL pública REAL del backend Node.js en Hostinger.
// No está desplegada ni verificada desde GitHub Pages; dejar vacío hasta confirmarla.
const configuredApiOrigin = '';
const backendUrl = String(window.SSL_API_BASE_URL || configuredApiOrigin).trim();
window.APP_CONFIG = Object.freeze({
  IS_CONFIGURED: Boolean(backendUrl),
  API_URL: backendUrl ||
    (['localhost', '127.0.0.1'].includes(location.hostname)
      ? 'http://localhost:3000/api' : location.origin + '/api')
});
