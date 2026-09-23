const express = require('express');
const pool = require('../config/database');

const router = express.Router();

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
