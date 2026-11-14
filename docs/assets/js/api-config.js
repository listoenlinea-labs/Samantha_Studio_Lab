// Configuración de API del consultorio. GitHub Pages solo aloja el frontend.
// Si se despliega la API en otro dominio, define window.SSL_API_BASE_URL
// en este archivo (ejemplo de formato: 'https://TU-SERVIDOR/api').
// Nunca incluir contraseñas, tokens o credenciales MySQL en el navegador.
const backendUrl = String(window.SSL_API_BASE_URL || '').trim();
window.APP_CONFIG = Object.freeze({
  API_URL: backendUrl ||
    (['localhost', '127.0.0.1'].includes(location.hostname)
      ? 'http://localhost:3000/api' : location.origin + '/api')
});
