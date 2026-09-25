const express = require('express');
const pool = require('../config/database');

const router = express.Router();
const attendanceStates = new Set(['EN_SALA', 'NO_ASISTIO', 'CONFIRMADA']);
const mutableStates = new Set(['PROGRAMADA', 'POR_CONFIRMAR', 'CONFIRMADA', 'EN_SALA', 'NO_ASISTIO']);
const mexicoToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

router.get('/', async (req, res, next) => {
    const fecha = String(req.query.fecha || mexicoToday());
    if (!validDate(fecha)) return res.status(400).json({ ok: false, mensaje: 'Selecciona una fecha válida.' });
    try {
        const [items] = await pool.query(
            `SELECT c.id_cita AS idCita, c.id_paciente AS idPaciente,
                    CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS paciente,
                    DATE_FORMAT(c.inicio_at, '%Y-%m-%d') AS fecha,
                    DATE_FORMAT(c.inicio_at, '%H:%i') AS hora,
                    c.motivo, c.doctor, c.estado
             FROM citas c INNER JOIN pacientes p ON p.id_paciente = c.id_paciente
             WHERE c.inicio_at >= ? AND c.inicio_at < DATE_ADD(?, INTERVAL 1 DAY)
               AND c.estado <> 'CANCELADA'
             ORDER BY c.inicio_at, c.id_cita LIMIT 500`, [fecha, fecha]
        );
        return res.json({ fecha, items });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    const estado = String(req.body?.estado || '').trim().toUpperCase();
    if (!Number.isSafeInteger(id) || id < 1 || !attendanceStates.has(estado)) {
        return res.status(400).json({ ok: false, mensaje: 'Selecciona una cita y un estado de asistencia válidos.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [rows] = await connection.query(
            `SELECT id_paciente AS idPaciente, estado,
                    DATE_FORMAT(inicio_at, '%Y-%m-%d') AS fecha
             FROM citas WHERE id_cita = ? FOR UPDATE`, [id]
        );
        const cita = rows[0];
        if (!cita || !mutableStates.has(cita.estado)) {
            await connection.rollback();
            return res.status(409).json({ ok: false, mensaje: 'La cita ya no permite registrar asistencia.' });
        }
        if (cita.fecha > mexicoToday() && estado !== 'CONFIRMADA') {
            await connection.rollback();
            return res.status(400).json({ ok: false, mensaje: 'La asistencia se registra el día de la cita o después.' });
        }
        if (cita.estado !== estado) {
            await connection.query('UPDATE citas SET estado = ? WHERE id_cita = ?', [estado, id]);
            await connection.query(
                `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
                 VALUES ('pacientes', ?, 'REGISTRAR_ASISTENCIA', ?)`,
                [cita.idPaciente, JSON.stringify({ idCita: id, anterior: cita.estado, estado })]
            );
        }
        await connection.commit();
        return res.json({ ok: true, idCita: id, estado, mensaje: 'Asistencia guardada en la cita.' });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        connection?.release();
    }
});

module.exports = router;
