const express = require('express');
const pool = require('../config/database');

const router = express.Router();

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function asBoolean(value) {
    return value === true || value === 1 || value === '1';
}

router.get('/:id', async (req, res, next) => {
    try {
        const periodontogramId = parseId(req.params.id);
        if (!periodontogramId) {
            return res.status(400).json({ ok: false, mensaje: 'El id del periodontograma no es válido.' });
        }
        const [periodontograms] = await pool.query(
            `SELECT id_periodontograma AS idPeriodontograma, id_paciente AS idPaciente,
                    observaciones, estado, created_at AS creadoAt,
                    finalizado_at AS finalizadoAt
             FROM periodontogramas WHERE id_periodontograma = ? LIMIT 1`,
            [periodontogramId]
        );
        if (!periodontograms.length) {
            return res.status(404).json({ ok: false, mensaje: 'Periodontograma no encontrado.' });
        }
        const [measurements] = await pool.query(
            `SELECT pieza, cara, punto, profundidad_sondaje AS profundidad,
                    margen_gingival AS margenGingival, sangrado, placa,
                    movilidad, furcacion, supuracion
             FROM periodontograma_mediciones
             WHERE id_periodontograma = ? ORDER BY pieza, cara, punto`,
            [periodontogramId]
        );
        return res.json({
            periodontograma: periodontograms[0],
            mediciones: measurements.map((item) => ({
                ...item,
                sangrado: Boolean(item.sangrado),
                placa: Boolean(item.placa),
                supuracion: Boolean(item.supuracion)
            }))
        });
    } catch (error) {
        next(error);
    }
});

router.put('/:id/mediciones', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const periodontogramId = parseId(req.params.id);
        if (!periodontogramId) {
            return res.status(400).json({ ok: false, mensaje: 'El id del periodontograma no es válido.' });
        }
        const measurements = Array.isArray(req.body.mediciones) ? req.body.mediciones : [];
        if (!measurements.length || measurements.length > 384) {
            return res.status(400).json({ ok: false, mensaje: 'Envía el arreglo completo de mediciones (máximo 384 sitios).' });
        }
        const faces = new Set(['VESTIBULAR', 'PALATINA', 'LINGUAL']);
        const points = new Set(['MESIAL', 'CENTRAL', 'DISTAL']);
        const normalized = measurements.map((measurement) => ({
            pieza: String(measurement.pieza || '').trim(),
            cara: String(measurement.cara || '').trim().toUpperCase(),
            punto: String(measurement.punto || '').trim().toUpperCase(),
            profundidad: Number(measurement.profundidad || 0),
            margen: Number(measurement.margenGingival || 0),
            sangrado: asBoolean(measurement.sangrado),
            placa: asBoolean(measurement.placa),
            movilidad: Number(measurement.movilidad || 0),
            furcacion: Number(measurement.furcacion || 0),
            supuracion: asBoolean(measurement.supuracion)
        }));
        const invalid = normalized.some((item) => !/^\d{1,2}$/.test(item.pieza)
            || !faces.has(item.cara) || !points.has(item.punto)
            || !Number.isInteger(item.profundidad) || item.profundidad < 0 || item.profundidad > 15
            || !Number.isInteger(item.margen) || item.margen < -15 || item.margen > 15
            || !Number.isInteger(item.movilidad) || item.movilidad < 0 || item.movilidad > 3
            || !Number.isInteger(item.furcacion) || item.furcacion < 0 || item.furcacion > 3);
        if (invalid) {
            return res.status(400).json({ ok: false, mensaje: 'Una o más mediciones contienen valores no válidos.' });
        }
        const uniqueSites = new Set(normalized.map((item) => `${item.pieza}|${item.cara}|${item.punto}`));
        if (uniqueSites.size !== normalized.length) {
            return res.status(400).json({ ok: false, mensaje: 'No repitas la misma pieza, cara y punto.' });
        }

        await connection.beginTransaction();
        const [periodontograms] = await connection.query(
            'SELECT estado FROM periodontogramas WHERE id_periodontograma = ? FOR UPDATE',
            [periodontogramId]
        );
        if (!periodontograms.length) {
            await connection.rollback();
            return res.status(404).json({ ok: false, mensaje: 'Periodontograma no encontrado.' });
        }
        if (periodontograms[0].estado === 'FINALIZADO') {
            await connection.rollback();
            return res.status(409).json({ ok: false, mensaje: 'No se puede modificar un periodontograma finalizado.' });
        }
        await connection.query('DELETE FROM periodontograma_mediciones WHERE id_periodontograma = ?', [periodontogramId]);
        const values = normalized.map((item) => [
            periodontogramId, item.pieza, item.cara, item.punto,
            item.profundidad, item.margen, item.sangrado ? 1 : 0,
            item.placa ? 1 : 0, item.movilidad, item.furcacion,
            item.supuracion ? 1 : 0
        ]);
        await connection.query(
            `INSERT INTO periodontograma_mediciones
                (id_periodontograma, pieza, cara, punto, profundidad_sondaje,
                 margen_gingival, sangrado, placa, movilidad, furcacion, supuracion)
             VALUES ?`,
            [values]
        );
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('periodontogramas', ?, 'GUARDAR_MEDICIONES', ?)`,
            [periodontogramId, JSON.stringify({ totalMediciones: normalized.length })]
        );
        await connection.commit();
        return res.json({ ok: true, guardadas: normalized.length });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

router.patch('/:id', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const periodontogramId = parseId(req.params.id);
        if (!periodontogramId) {
            return res.status(400).json({ ok: false, mensaje: 'El id del periodontograma no es válido.' });
        }
        const observations = String(req.body.observaciones || '').trim() || null;
        if (observations && observations.length > 4000) {
            return res.status(400).json({ ok: false, mensaje: 'Las observaciones no pueden superar 4000 caracteres.' });
        }
        await connection.beginTransaction();
        const [result] = await connection.query(
            `UPDATE periodontogramas SET observaciones = ?
             WHERE id_periodontograma = ? AND estado <> 'FINALIZADO'`,
            [observations, periodontogramId]
        );
        if (!result.affectedRows) {
            await connection.rollback();
            return res.status(409).json({ ok: false, mensaje: 'Periodontograma no encontrado o finalizado.' });
        }
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('periodontogramas', ?, 'ACTUALIZAR_OBSERVACIONES', ?)`,
            [periodontogramId, JSON.stringify({ observaciones: Boolean(observations) })]
        );
        await connection.commit();
        return res.json({ ok: true, mensaje: 'Observaciones guardadas.' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

router.patch('/:id/finalizar', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const periodontogramId = parseId(req.params.id);
        if (!periodontogramId) {
            return res.status(400).json({ ok: false, mensaje: 'El id del periodontograma no es válido.' });
        }
        await connection.beginTransaction();
        const [result] = await connection.query(
            `UPDATE periodontogramas SET estado = 'FINALIZADO', finalizado_at = NOW()
             WHERE id_periodontograma = ? AND estado <> 'FINALIZADO'`,
            [periodontogramId]
        );
        if (!result.affectedRows) {
            await connection.rollback();
            return res.status(404).json({ ok: false, mensaje: 'Periodontograma no encontrado o ya finalizado.' });
        }
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('periodontogramas', ?, 'FINALIZAR', ?)`,
            [periodontogramId, JSON.stringify({ mensaje: 'Periodontograma finalizado.' })]
        );
        await connection.commit();
        return res.json({ ok: true, mensaje: 'Periodontograma finalizado.' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

module.exports = router;
