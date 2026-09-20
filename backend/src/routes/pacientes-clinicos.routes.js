const express = require('express');
const pool = require('../config/database');

const router = express.Router();

function parsePositiveId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function invalidId(res, entity = 'paciente') {
    return res.status(400).json({
        ok: false,
        mensaje: `El id del ${entity} debe ser un número entero positivo.`
    });
}

async function patientExists(connection, patientId) {
    const [rows] = await connection.query(
        'SELECT id_paciente FROM pacientes WHERE id_paciente = ? LIMIT 1',
        [patientId]
    );
    return rows.length > 0;
}

function patientPhotoUrl(req, patientId, updatedAt) {
    if (!updatedAt) return null;
    const version = new Date(updatedAt).getTime();
    return `${req.protocol}://${req.get('host')}/api/pacientes/${patientId}/foto?v=${version}`;
}

router.get('/:id/resumen', async (req, res, next) => {
    try {
        const patientId = parsePositiveId(req.params.id);
        if (!patientId) return invalidId(res);

        const [rows] = await pool.query(
            `SELECT
                p.id_paciente AS idPaciente,
                p.nombres,
                p.apellido_paterno AS apellidoPaterno,
                p.apellido_materno AS apellidoMaterno,
                CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS nombreCompleto,
                p.fecha_nacimiento AS fechaNacimiento,
                TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad,
                p.sexo,
                p.telefono,
                p.correo,
                p.alergias,
                p.antecedentes_medicos AS antecedentesMedicos,
                p.notas_alerta AS notasAlerta,
                p.activo,
                p.created_at AS creadoAt,
                ep.numero_expediente AS numeroExpediente,
                ep.nota_general AS notaGeneral,
                pf.updated_at AS fotoActualizadaAt
             FROM pacientes p
             LEFT JOIN expedientes_paciente ep ON ep.id_paciente = p.id_paciente
             LEFT JOIN paciente_fotos pf ON pf.id_paciente = p.id_paciente
             WHERE p.id_paciente = ?
             LIMIT 1`,
            [patientId]
        );

        if (!rows.length) {
            return res.status(404).json({ ok: false, mensaje: 'Paciente no encontrado.' });
        }

        const [tags] = await pool.query(
            `SELECT e.id_etiqueta AS idEtiqueta, e.nombre,
                    e.color_fondo AS colorFondo, e.color_texto AS colorTexto
             FROM paciente_etiquetas pe
             INNER JOIN etiquetas e ON e.id_etiqueta = pe.id_etiqueta
             WHERE pe.id_paciente = ? AND e.activo = 1
             ORDER BY e.nombre`,
            [patientId]
        );

        const patient = rows[0];
        const { fotoActualizadaAt, ...summary } = patient;
        return res.json({
            ...summary,
            edad: patient.edad === null ? null : Number(patient.edad),
            activo: Boolean(patient.activo),
            fotoUrl: patientPhotoUrl(req, patientId, fotoActualizadaAt),
            etiquetas: tags
        });
    } catch (error) {
        next(error);
    }
});

router.get('/:id/historia-clinica', async (req, res, next) => {
    try {
        const patientId = parsePositiveId(req.params.id);
        if (!patientId) return invalidId(res);

        if (!(await patientExists(pool, patientId))) {
            return res.status(404).json({ ok: false, mensaje: 'Paciente no encontrado.' });
        }

        const [rows] = await pool.query(
            `SELECT id_historia AS idHistoria, motivo_consulta AS motivoConsulta,
                    alergias, antecedentes_medicos AS antecedentesMedicos,
                    antecedentes_odontologicos AS antecedentesOdontologicos,
                    medicamentos_actuales AS medicamentosActuales,
                    diagnostico_general AS diagnosticoGeneral, observaciones,
                    vigente, created_at AS creadoAt, updated_at AS actualizadoAt
             FROM historias_clinicas
             WHERE id_paciente = ? AND vigente = 1
             ORDER BY id_historia DESC LIMIT 1`,
            [patientId]
        );

        return res.json({ idPaciente: patientId, historia: rows[0] || null });
    } catch (error) {
        next(error);
    }
});

router.put('/:id/historia-clinica', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const patientId = parsePositiveId(req.params.id);
        if (!patientId) return invalidId(res);
        if (!(await patientExists(connection, patientId))) {
            return res.status(404).json({ ok: false, mensaje: 'Paciente no encontrado.' });
        }

        const fields = {
            motivoConsulta: String(req.body.motivoConsulta || '').trim() || null,
            alergias: String(req.body.alergias || '').trim() || null,
            antecedentesMedicos: String(req.body.antecedentesMedicos || '').trim() || null,
            antecedentesOdontologicos: String(req.body.antecedentesOdontologicos || '').trim() || null,
            medicamentosActuales: String(req.body.medicamentosActuales || '').trim() || null,
            diagnosticoGeneral: String(req.body.diagnosticoGeneral || '').trim() || null,
            observaciones: String(req.body.observaciones || '').trim() || null
        };

        await connection.beginTransaction();
        await connection.query(
            'UPDATE historias_clinicas SET vigente = 0 WHERE id_paciente = ? AND vigente = 1',
            [patientId]
        );
        const [result] = await connection.query(
            `INSERT INTO historias_clinicas
                (id_paciente, motivo_consulta, alergias, antecedentes_medicos,
                 antecedentes_odontologicos, medicamentos_actuales,
                 diagnostico_general, observaciones, vigente)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [patientId, fields.motivoConsulta, fields.alergias, fields.antecedentesMedicos,
                fields.antecedentesOdontologicos, fields.medicamentosActuales,
                fields.diagnosticoGeneral, fields.observaciones]
        );
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('historias_clinicas', ?, 'VERSIONAR', ?)`,
            [result.insertId, JSON.stringify({ idPaciente: patientId, mensaje: 'Nueva versión de historia clínica.' })]
        );
        await connection.commit();
        return res.status(201).json({ ok: true, idHistoria: result.insertId, historia: fields });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

router.get('/:id/tratamientos', async (req, res, next) => {
    try {
        const patientId = parsePositiveId(req.params.id);
        if (!patientId) return invalidId(res);
        const [items] = await pool.query(
            `SELECT id_tratamiento_paciente AS idTratamiento, nombre, descripcion,
                    estado, fecha_inicio AS fechaInicio, fecha_fin AS fechaFin,
                    created_at AS creadoAt
             FROM tratamientos_paciente WHERE id_paciente = ?
             ORDER BY created_at DESC`,
            [patientId]
        );
        return res.json({ items });
    } catch (error) {
        next(error);
    }
});

router.get('/:id/sesiones', async (req, res, next) => {
    try {
        const patientId = parsePositiveId(req.params.id);
        if (!patientId) return invalidId(res);
        const [items] = await pool.query(
            `SELECT id_sesion AS idSesion, id_tratamiento_paciente AS idTratamiento,
                    fecha_sesion AS fechaSesion, evolucion, indicaciones, created_at AS creadoAt
             FROM sesiones_tratamiento WHERE id_paciente = ?
             ORDER BY fecha_sesion DESC`,
            [patientId]
        );
        return res.json({ items });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/sesiones', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const patientId = parsePositiveId(req.params.id);
        if (!patientId) return invalidId(res);
        const evolution = String(req.body.evolucion || '').trim();
        if (!evolution) {
            return res.status(400).json({ ok: false, mensaje: 'La evolución es obligatoria.' });
        }
        if (!(await patientExists(connection, patientId))) {
            return res.status(404).json({ ok: false, mensaje: 'Paciente no encontrado.' });
        }
        const treatmentId = parsePositiveId(req.body.idTratamiento);
        const sessionDate = req.body.fechaSesion || new Date();
        const instructions = String(req.body.indicaciones || '').trim() || null;

        await connection.beginTransaction();
        const [result] = await connection.query(
            `INSERT INTO sesiones_tratamiento
                (id_paciente, id_tratamiento_paciente, fecha_sesion, evolucion, indicaciones)
             VALUES (?, ?, ?, ?, ?)`,
            [patientId, treatmentId, sessionDate, evolution, instructions]
        );
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('sesiones_tratamiento', ?, 'CREAR', ?)`,
            [result.insertId, JSON.stringify({ idPaciente: patientId })]
        );
        await connection.commit();
        return res.status(201).json({ ok: true, idSesion: result.insertId });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

router.get('/:id/odontogramas', async (req, res, next) => {
    try {
        const patientId = parsePositiveId(req.params.id);
        if (!patientId) return invalidId(res);
        const phase = String(req.query.fase || '').trim().toUpperCase();
        const params = [patientId];
        const phaseFilter = phase ? ' AND o.fase = ?' : '';
        if (phase) params.push(phase);
        const [items] = await pool.query(
            `SELECT o.id_odontograma AS idOdontograma, o.fase,
                    o.tipo_denticion AS tipoDenticion, o.nomenclatura,
                    o.observaciones, o.estado, o.created_at AS creadoAt,
                    o.finalizado_at AS finalizadoAt,
                    COUNT(h.id_hallazgo) AS totalHallazgos
             FROM odontogramas o
             LEFT JOIN odontograma_hallazgos h ON h.id_odontograma = o.id_odontograma
             WHERE o.id_paciente = ?${phaseFilter}
             GROUP BY o.id_odontograma ORDER BY o.created_at DESC`,
            params
        );
        return res.json({ items: items.map((item) => ({ ...item, totalHallazgos: Number(item.totalHallazgos) })) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/odontogramas', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const patientId = parsePositiveId(req.params.id);
        if (!patientId) return invalidId(res);
        const phase = String(req.body.fase || 'INICIAL').toUpperCase();
        const dentition = String(req.body.tipoDenticion || 'ADULTO').toUpperCase();
        const nomenclature = String(req.body.nomenclatura || 'FDI').toUpperCase();
        if (!['INICIAL', 'EVOLUCION', 'ALTA'].includes(phase)
            || !['ADULTO', 'MIXTO', 'NINO'].includes(dentition)
            || !['FDI', 'ADA'].includes(nomenclature)) {
            return res.status(400).json({ ok: false, mensaje: 'Fase, dentición o nomenclatura no válida.' });
        }
        if (!(await patientExists(connection, patientId))) {
            return res.status(404).json({ ok: false, mensaje: 'Paciente no encontrado.' });
        }
        await connection.beginTransaction();
        const [result] = await connection.query(
            `INSERT INTO odontogramas
                (id_paciente, fase, tipo_denticion, nomenclatura, observaciones)
             VALUES (?, ?, ?, ?, ?)`,
            [patientId, phase, dentition, nomenclature, String(req.body.observaciones || '').trim() || null]
        );
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('odontogramas', ?, 'CREAR', ?)`,
            [result.insertId, JSON.stringify({ idPaciente: patientId, fase: phase })]
        );
        await connection.commit();
        return res.status(201).json({ ok: true, idOdontograma: result.insertId });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

router.get('/:id/periodontogramas', async (req, res, next) => {
    try {
        const patientId = parsePositiveId(req.params.id);
        if (!patientId) return invalidId(res);
        const [items] = await pool.query(
            `SELECT p.id_periodontograma AS idPeriodontograma, p.observaciones,
                    p.estado, p.created_at AS creadoAt, p.finalizado_at AS finalizadoAt,
                    COUNT(m.id_medicion) AS totalMediciones
             FROM periodontogramas p
             LEFT JOIN periodontograma_mediciones m ON m.id_periodontograma = p.id_periodontograma
             WHERE p.id_paciente = ? GROUP BY p.id_periodontograma
             ORDER BY p.created_at DESC`,
            [patientId]
        );
        return res.json({ items: items.map((item) => ({ ...item, totalMediciones: Number(item.totalMediciones) })) });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/periodontogramas', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const patientId = parsePositiveId(req.params.id);
        if (!patientId) return invalidId(res);
        if (!(await patientExists(connection, patientId))) {
            return res.status(404).json({ ok: false, mensaje: 'Paciente no encontrado.' });
        }
        await connection.beginTransaction();
        const [result] = await connection.query(
            'INSERT INTO periodontogramas (id_paciente, observaciones) VALUES (?, ?)',
            [patientId, String(req.body.observaciones || '').trim() || null]
        );
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('periodontogramas', ?, 'CREAR', ?)`,
            [result.insertId, JSON.stringify({ idPaciente: patientId })]
        );
        await connection.commit();
        return res.status(201).json({ ok: true, idPeriodontograma: result.insertId });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

module.exports = router;
