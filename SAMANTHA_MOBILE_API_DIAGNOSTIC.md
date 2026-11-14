# Diagnóstico del menú y API — Samantha Studio Lab

## Fallo visible
- En la vista móvil, el menú conservaba el azul oscuro de los estilos antiguos aunque el encabezado ya era lavanda. Las reglas de enlaces provenientes de múltiples estilos y `!important` tenían bajo contraste. La hoja final `samantha-pastel.css` ahora unifica panel, enlaces, botones, overlay y posición debajo del encabezado.
- Desde `https://listoenlinea-labs.github.io/Samantha_Studio_Lab/`, el navegador solicitaba `https://listoenlinea-labs.github.io/api/clinica/resumen`: **GitHub Pages no ejecuta Node/Express ni MySQL**. El enlace no representa un backend.
- Se agregó diagnóstico específico en lugar de error genérico y un archivo de configuración común `docs/assets/js/api-config.js`.

## Paso pendiente necesario para hacer funcionar la API

**No se ha identificado ni validado una URL de backend en Hostinger.** No se inventó ni configuró ningún host.

1. Publicar `backend/` como app Node.js en Hostinger, con `npm ci` y `npm start`, conexión MySQL (secretos **solo en Hostinger**, nunca en `docs/`).
2. Verificar que `https://DOMINIO-REAL-DEL-BACKEND/api/health` devuelve JSON con `ok:true`, y que `/api/clinica/resumen` devuelve JSON para usuarios autorizados.
3. Establecer en `docs/assets/js/api-config.js` la constante pública **`configuredApiOrigin = 'https://DOMINIO-REAL-DEL-BACKEND/api'`**. Esto NO incluye secretos.
4. **Revisar seguridad de pacientes antes de habilitar la API cross-origin**: el frontend GitHub Pages es público, y el backend actual se protege con HTTP Basic en producción. Las solicitudes cross-origin no deben exponer datos clínicos a visitantes anónimos; preferir servir `docs/` y `/api` bajo el **mismo dominio de Hostinger**, con login, roles y autorización apropiada. No usar `CORS: *` ni desactivar el control de acceso para “resolver” el error.
5. Hacer merge, desplegar y actualizar caché de la página. Las hojas CSS/JS de la app tienen versión nueva.

## Comprobaciones
- Sintaxis validada en `clinic-app.js` y `api-config.js`.
- La rama está aislada; sin despliegues, sin cambios MySQL ni credenciales.
