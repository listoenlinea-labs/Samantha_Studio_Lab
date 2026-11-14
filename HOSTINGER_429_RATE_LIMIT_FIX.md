# Corrección de HTTP 429 en Hostinger — Samantha Studio Lab

## Por qué sucedía
El middleware global de `backend/src/app.js` permitía solo **300 peticiones cada 15 minutos** y se ejecutaba antes de `express.static`. Por eso las rutas HTML, CSS, JavaScript, logos y las llamadas a API consumían **la misma cuota**. Una vez agotada, cualquier navegación mostraba `Too many requests, please try again later.`.

## Qué cambia
- Solo se limita el prefijo `/api` con **1,200 solicitudes cada 15 minutos por cliente/IP detectado** (valor predeterminado configurable mediante `API_RATE_LIMIT_MAX`).
- Las páginas HTML, hojas de estilo, scripts e imágenes no consumen cuota de API. **Esto no elimina la autenticación HTTP Basic** del entorno productivo.
- Los 429 de API responden JSON y cabeceras de límite y reintento, para que el frontend pueda tratar el error de manera diferenciada.
- `TRUST_PROXY_HOPS` es opcional: solo se establece si el administrador conoce y verificó el número de proxies confiables delante de Node.js (entre 1 y 4). No establecer `true` sin conocer la infraestructura.

## Despliegue y verificación
1. Fusionar este PR a la rama desplegada, publicar Hostinger y **reiniciar Node.js**. El almacén en memoria de solicitudes se reinicia con el proceso.
2. Abrir `/index.html`, `/pacientes.html` y `/assets/img/logo-ssl.svg`. Ninguno debería devolver 429 por el middleware de Express.
3. Consultar las peticiones `/api/...` en la pestaña Red del navegador. Bajo uso normal deben funcionar; si se excede el límite, la respuesta JSON incluirá información de reintento.
4. Si los registros muestran `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`, verificar la cadena de proxies Hostinger y configurar `TRUST_PROXY_HOPS` con un valor **confirmado** (por ejemplo `1` solo si realmente hay un salto). Un proxy mal configurado puede convertir un límite por IP en uno compartido por todos los usuarios.
5. Si los archivos estáticos continúan devolviendo 429 con el nuevo código ejecutándose, inspeccionar también límites del proxy, CDN o firewall de Hostinger, pues el middleware de Express ya no los limita.

## Comprobación automatizada
`npm test` en la raíz incluye `backend/test/rate-limit-scope.test.js`, que agota la cuota de prueba para `/api` y confirma que HTML y SVG siguen respondiendo 200. La prueba utiliza servidor local y credenciales ficticias; no conecta con los datos clínicos de producción.
