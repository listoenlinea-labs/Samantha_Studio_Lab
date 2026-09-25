const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/', async (req, res, next) => {
    const q = String(req.query.q ?? '').trim().slice(0, 80);
    if (q.length < 2) return res.json({ pacientes: [], citas: [], tratamientos: [] });

    // Escape LIKE metacharacters so a typed % or _ remains a literal search.
    const term = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    try {
        const [[pacientes], [citas], [tratamientos]] = await Promise.all([
            pool.query(`SELECT p.id_paciente AS idPaciente,
                    CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS nombre,
                    p.telefono
                FROM pacientes p WHERE p.activo = 1 AND
                (CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) LIKE ?
                 OR p.telefono LIKE ? OR p.correo LIKE ?)
                ORDER BY p.nombres, p.apellido_paterno LIMIT 5`, [term, term, term]),
            pool.query(`SELECT c.id_cita AS idCita, c.id_paciente AS idPaciente,
                    CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS paciente,
                    DATE_FORMAT(c.inicio_at, '%Y-%m-%d') AS fecha,
                    DATE_FORMAT(c.inicio_at, '%H:%i') AS hora, c.motivo
                FROM citas c INNER JOIN pacientes p ON p.id_paciente = c.id_paciente
                WHERE c.estado NOT IN ('CANCELADA', 'NO_ASISTIO')
                  AND c.inicio_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                  AND c.inicio_at < DATE_ADD(CURDATE(), INTERVAL 180 DAY)
                  AND (CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) LIKE ?
                       OR c.motivo LIKE ? OR DATE_FORMAT(c.inicio_at, '%Y-%m-%d') LIKE ?)
                ORDER BY c.inicio_at LIMIT 5`, [term, term, term]),
            pool.query(`SELECT id_tratamiento AS idTratamiento, nombre, categoria
                FROM catalogo_tratamientos WHERE activo = 1
                  AND (nombre LIKE ? OR categoria LIKE ?)
                ORDER BY nombre LIMIT 5`, [term, term])
        ]);
        res.json({ pacientes, citas, tratamientos });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
