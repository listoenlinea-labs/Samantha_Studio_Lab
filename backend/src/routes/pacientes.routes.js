const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/pacientes?buscar=&pagina=1&limite=20
router.get('/', async (req, res, next) => {
    try {
        const buscar = String(req.query.buscar || '').trim();
        const pagina = Math.max(Number(req.query.pagina) || 1, 1);
        const limite = Math.min(Math.max(Number(req.query.limite) || 20, 1), 100);
        const offset = (pagina - 1) * limite;

        // Temporalmente solo confirmamos que esta ruta responde.
        res.json({
            mensaje: 'Endpoint de pacientes conectado correctamente',
            buscar,
            pagina,
            limite,
            offset
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;