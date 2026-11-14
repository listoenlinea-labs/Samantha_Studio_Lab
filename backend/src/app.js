require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');
const errorHandler = require('./middleware/error-handler');

const app = express();

// En Hostinger pueden existir uno o más proxies entre el navegador y Node.js.
// Solo confiar en X-Forwarded-For cuando el número de saltos se haya confirmado
// en la infraestructura; nunca confiar en todos los proxies sin validación.
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (Number.isInteger(proxyHops) && proxyHops >= 1 && proxyHops <= 4) {
    app.set('trust proxy', proxyHops);
}
// Protección temporal de todo el sitio hasta conectar el login a usuarios y roles.
if (process.env.NODE_ENV === 'production') {
    const username = process.env.SITE_USER;
    const password = process.env.SITE_PASSWORD;
    if (!username || !password) {
        throw new Error('Configura SITE_USER y SITE_PASSWORD para publicar datos clínicos.');
    }
    app.use((req, res, next) => {
        const header = req.get('authorization') || '';
        const encoded = header.startsWith('Basic ') ? header.slice(6) : '';
        const credentials = Buffer.from(encoded, 'base64').toString('utf8');
        const separator = credentials.indexOf(':');
        const suppliedUser = separator < 0 ? '' : credentials.slice(0, separator);
        const suppliedPassword = separator < 0 ? '' : credentials.slice(separator + 1);
        const matches = (actual, expected) => {
            const a = crypto.createHash('sha256').update(actual).digest();
            const b = crypto.createHash('sha256').update(expected).digest();
            return crypto.timingSafeEqual(a, b);
        };
        if (matches(suppliedUser, username) && matches(suppliedPassword, password)) return next();
        res.set('WWW-Authenticate', 'Basic realm="Samantha Studio Lab"');
        res.status(401).send('Acceso restringido');
    });
}
const allowedOrigins = (process.env.FRONTEND_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(helmet({
    // El frontend y la API usan puertos/dominios distintos; permite mostrar
    // las fotos servidas por el endpoint de pacientes.
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors((req, callback) => {
    const origin = req.get('origin');
    let sameOrigin = false;
    if (origin) {
        try {
            const parsed = new URL(origin);
            sameOrigin = parsed.host === req.get('host')
                && (process.env.NODE_ENV !== 'production' || parsed.protocol === 'https:');
        } catch (_) {
            // Un Origin inválido se rechaza como cualquier otro origen no autorizado.
        }
    }
    callback(null, {
        origin(requestOrigin, done) {
            if (!requestOrigin || sameOrigin || allowedOrigins.includes(requestOrigin)) {
                return done(null, true);
            }
            return done(new Error('Origen no permitido por CORS'));
        }
    });
}));
app.use(express.json({ limit: '1mb' }));
// Muestra cada solicitud atendida y su resultado en la consola.
app.use((req, res, next) => {
    const inicio = Date.now();

    res.on('finish', () => {
        const duracion = Date.now() - inicio;
        const estado = res.statusCode >= 400 ? 'ERROR' : 'OK';

        console.log(
            `[${estado}] ${req.method} ${req.path} → ${res.statusCode} (${duracion} ms)`
        );
    });

    next();
});
// El límite anterior (300/15 min) se aplicaba también a HTML, CSS, JS,
// imágenes y peticiones de API: al agotarse devolvía 429 para TODO el sitio.
// Proteger solo /api y dejar los recursos estáticos fuera del contador.
const configuredLimit = Number(process.env.API_RATE_LIMIT_MAX || 1200);
const apiLimit = Number.isSafeInteger(configuredLimit) && configuredLimit >= 100 && configuredLimit <= 10000
    ? configuredLimit : 1200;
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: apiLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
        res.status(429).json({
            ok: false,
            mensaje: 'Se alcanzó el límite temporal de consultas a la API. Intenta nuevamente en unos minutos.'
        });
    }
}));

app.get('/api/health', async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT 1 AS database_ok');
        res.json({ ok: true, database: rows[0].database_ok === 1 });
    } catch (error) {
        next(error);
    }
});

const authRoutes = require('./routes/auth.routes');
const pacientesClinicosRoutes = require('./routes/pacientes-clinicos.routes');
const pacientesRoutes = require('./routes/pacientes.routes');
const odontogramasRoutes = require('./routes/odontogramas.routes');
const periodontogramasRoutes = require('./routes/periodontogramas.routes');
const archivosRoutes = require('./routes/archivos.routes');
const archivosClinicosRoutes = require('./routes/archivos-clinicos.routes');
const tratamientosRoutes = require('./routes/tratamientos.routes');
const clinicaRoutes = require('./routes/clinica.routes');
const asistenciasRoutes = require('./routes/asistencias.routes');
const busquedaRoutes = require('./routes/busqueda.routes');
const recetasRoutes = require('./routes/recetas.routes');
const recordatoriosRoutes = require('./routes/recordatorios.routes');
app.use('/api/clinica', clinicaRoutes);
app.use('/api/clinica/asistencias', asistenciasRoutes);
app.use('/api/busqueda', busquedaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesClinicosRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/odontogramas', odontogramasRoutes);
app.use('/api/periodontogramas', periodontogramasRoutes);
app.use('/api/archivos', archivosRoutes);
app.use('/api/pacientes', archivosClinicosRoutes);
app.use('/api/tratamientos', tratamientosRoutes);
app.use('/api/recetas', recetasRoutes);
app.use('/api/recordatorios', recordatoriosRoutes);

// En producción la interfaz y la API comparten origen; no necesita CORS ni
// direcciones localhost configuradas en el navegador del visitante.
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, '../../docs')));
    app.get('/', (req, res) => {
        res.redirect('/login.html');
    });
}

app.use(errorHandler);

module.exports = app;
