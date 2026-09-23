const express = require('express');
const pool = require('../config/database');

const router = express.Router();

const appointmentStates = ['PROGRAMADA', 'POR_CONFIRMAR', 'CONFIRMADA', 'EN_SALA', 'FINALIZADA', 'CANCELADA', 'NO_ASISTIO'];
const validDateTime = (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}:00Z`));

router.patch('/citas/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    const { inicioAt, finAt, doctor, motivo, estado, comentario } = req.body || {};
    const start = String(inicioAt || '');
    const end = String(finAt || '');
    const professional = String(doctor ?? '').trim();
    const reason = String(motivo ?? '').trim();
    const note = String(comentario ?? '').trim();
    const status = String(estado || '').trim().toUpperCase();
    if (!Number.isSafeInteger(id) || id < 1 || !validDateTime(start) || !validDateTime(end)
        || Date.parse(`${end}:00Z`) <= Date.parse(`${start}:00Z`)
        || !reason || reason.length > 255 || professional.length > 160 || note.length > 4000
        || !appointmentStates.includes(status)) {
        return res.status(400).json({ ok: false, mensaje: 'Revisa la fecha, horario y datos de la cita.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT id_paciente, estado FROM citas WHERE id_cita = ? FOR UPDATE', [id]);
        if (!rows.length || rows[0].estado === 'CANCELADA') {
            await connection.rollback();
            return res.status(404).json({ ok: false, mensaje: 'La cita ya no está disponible.' });
        }
        await connection.query(
            `UPDATE citas SET inicio_at = ?, fin_at = ?, doctor = ?, motivo = ?, estado = ?, comentario = ?
             WHERE id_cita = ?`,
            [start.replace('T', ' '), end.replace('T', ' '), professional || null, reason, status, note || null, id]
        );
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle) VALUES ('pacientes', ?, 'EDITAR_CITA', ?)`,
            [rows[0].id_paciente, JSON.stringify({ idCita: id })]
        );
        await connection.commit();
        return res.json({ ok: true, mensaje: 'Cita actualizada.' });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        connection?.release();
    }
});

router.delete('/citas/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ ok: false, mensaje: 'El identificador de cita no es válido.' });
    }
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT id_paciente, estado FROM citas WHERE id_cita = ? FOR UPDATE', [id]);
        if (!rows.length || rows[0].estado === 'CANCELADA') {
            await connection.rollback();
            return res.status(404).json({ ok: false, mensaje: 'La cita ya no está disponible.' });
        }
        // Conserva el historial de la cita y la auditoría; las vistas omiten las canceladas.
        await connection.query("UPDATE citas SET estado = 'CANCELADA' WHERE id_cita = ?", [id]);
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle) VALUES ('pacientes', ?, 'CANCELAR_CITA', ?)`,
            [rows[0].id_paciente, JSON.stringify({ idCita: id })]
        );
        await connection.commit();
        return res.json({ ok: true, mensaje: 'Cita eliminada de la agenda.' });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        connection?.release();
    }
});

router.get('/citas', async (req, res, next) => {
    try {
        const from = String(req.query.desde || '');
        const to = String(req.query.hasta || '');
        const valid = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)
            && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
        const days = (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000;
        if (!valid(from) || !valid(to) || days < 0 || days > 62) {
            return res.status(400).json({ ok: false, mensaje: 'Selecciona un periodo válido de hasta 63 días.' });
        }
        const [items] = await pool.query(
            `SELECT c.id_cita AS idCita, c.id_paciente AS idPaciente,
                    CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS paciente,
                    c.inicio_at AS inicio, c.fin_at AS fin, c.doctor, c.motivo, c.estado,
                    c.comentario,
                    (p.correo LIKE '%@ejemplo.invalid') AS esFicticio
             FROM citas c INNER JOIN pacientes p ON p.id_paciente = c.id_paciente
             WHERE c.inicio_at >= ? AND c.inicio_at < DATE_ADD(?, INTERVAL 1 DAY)
               AND c.estado NOT IN ('CANCELADA', 'NO_ASISTIO')
             ORDER BY c.inicio_at LIMIT 500`,
            [from, to]
        );
        return res.json({ items });
    } catch (error) {
        next(error);
    }
});

router.get('/resumen', async (req, res, next) => {
    try {
        const date = String(req.query.fecha || '').trim();
        if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)))) {
            return res.status(400).json({ ok: false, mensaje: 'La fecha debe tener formato AAAA-MM-DD.' });
        }
        const selectedDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

        const [[patients], [appointments], [tasks], [histories], [schedule], [pendingTasks], [budgets]] = await Promise.all([
            pool.query(`SELECT COUNT(*) AS activos,
                COALESCE(SUM(correo LIKE '%@ejemplo.invalid'), 0) AS ficticios
                FROM pacientes WHERE activo = 1`),
            pool.query(`SELECT COUNT(*) AS total,
                COALESCE(SUM(estado = 'CONFIRMADA'), 0) AS confirmadas
                FROM citas WHERE inicio_at >= ? AND inicio_at < DATE_ADD(?, INTERVAL 1 DAY)
                AND estado NOT IN ('CANCELADA', 'NO_ASISTIO')`, [selectedDate, selectedDate]),
            pool.query(`SELECT COUNT(*) AS pendientes FROM tareas_paciente
                WHERE estado IN ('PENDIENTE', 'EN_PROCESO')`),
            pool.query(`SELECT COUNT(*) AS vigentes FROM historias_clinicas WHERE vigente = 1`),
            pool.query(`SELECT c.id_cita AS idCita, c.id_paciente AS idPaciente,
                    CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS paciente,
                    c.inicio_at AS inicio, c.fin_at AS fin, c.doctor, c.motivo, c.estado,
                    c.comentario, (p.correo LIKE '%@ejemplo.invalid') AS esFicticio
                FROM citas c INNER JOIN pacientes p ON p.id_paciente = c.id_paciente
                WHERE c.inicio_at >= ? AND c.inicio_at < DATE_ADD(?, INTERVAL 1 DAY)
                AND c.estado NOT IN ('CANCELADA', 'NO_ASISTIO')
                ORDER BY c.inicio_at LIMIT 100`, [selectedDate, selectedDate]),
            pool.query(`SELECT t.id_tarea AS idTarea, t.id_paciente AS idPaciente,
                    CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS paciente,
                    t.nombre, t.descripcion, t.estado, t.fecha_envio AS fechaEnvio,
                    (p.correo LIKE '%@ejemplo.invalid') AS esFicticio
                FROM tareas_paciente t INNER JOIN pacientes p ON p.id_paciente = t.id_paciente
                WHERE t.estado IN ('PENDIENTE', 'EN_PROCESO')
                ORDER BY t.fecha_envio, t.id_tarea LIMIT 30`),
            pool.query(`SELECT pr.id_presupuesto AS idPresupuesto, pr.id_paciente AS idPaciente,
                    CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS paciente,
                    pr.concepto, pr.total, pr.estado,
                    (p.correo LIKE '%@ejemplo.invalid') AS esFicticio
                FROM presupuestos pr INNER JOIN pacientes p ON p.id_paciente = pr.id_paciente
                ORDER BY pr.id_presupuesto DESC LIMIT 30`)
        ]);

        res.json({
            fecha: selectedDate,
            metricas: {
                pacientes: Number(patients[0].activos),
                pacientesFicticios: Number(patients[0].ficticios),
                citas: Number(appointments[0].total),
                confirmadas: Number(appointments[0].confirmadas),
                tareas: Number(tasks[0].pendientes),
                historias: Number(histories[0].vigentes)
            },
            citas: schedule,
            tareas: pendingTasks,
            presupuestos: budgets
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
