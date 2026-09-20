require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');
const errorHandler = require('./middleware/error-handler');

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(helmet({
    // El frontend y la API usan puertos/dominios distintos; permite mostrar
    // las fotos servidas por el endpoint de pacientes.
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origen no permitido por CORS'));
    }
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
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

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
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesClinicosRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/odontogramas', odontogramasRoutes);
app.use('/api/periodontogramas', periodontogramasRoutes);
app.use('/api/archivos', archivosRoutes);

app.use(errorHandler);

module.exports = app;
