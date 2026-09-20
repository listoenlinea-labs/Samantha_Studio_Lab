const express = require('express');
const pool = require('../config/database');

const router = express.Router();

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

router.get('/:id/hallazgos', async (req, res, next) => {
    try {
        const odontogramId = parseId(req.params.id);
        if (!odontogramId) {
            return res.status(400).json({ ok: false, mensaje: 'El id del odontograma no es válido.' });
        }
        const [odontograms] = await pool.query(
            `SELECT id_odontograma AS idOdontograma, id_paciente AS idPaciente,
                    fase, tipo_denticion AS tipoDenticion, nomenclatura,
                    observaciones, estado, created_at AS creadoAt,
                    finalizado_at AS finalizadoAt
             FROM odontogramas WHERE id_odontograma = ? LIMIT 1`,
            [odontogramId]
        );
        if (!odontograms.length) {
            return res.status(404).json({ ok: false, mensaje: 'Odontograma no encontrado.' });
        }
        const [findings] = await pool.query(
            `SELECT h.id_hallazgo AS idHallazgo, h.pieza, h.superficie,
                    h.observaciones, h.created_at AS creadoAt,
                    c.codigo AS codigoHallazgo, c.nombre, c.clasificacion
             FROM odontograma_hallazgos h
             INNER JOIN catalogo_hallazgos c
                ON c.id_catalogo_hallazgo = h.id_catalogo_hallazgo
             WHERE h.id_odontograma = ? ORDER BY h.pieza, h.created_at`,
            [odontogramId]
        );
        return res.json({ odontograma: odontograms[0], items: findings });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/hallazgos', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const odontogramId = parseId(req.params.id);
        if (!odontogramId) {
            return res.status(400).json({ ok: false, mensaje: 'El id del odontograma no es válido.' });
        }
        const pieces = [...new Set((Array.isArray(req.body.piezas) ? req.body.piezas : [])
            .map((piece) => String(piece).trim()).filter(Boolean))];
        const findingCode = String(req.body.codigoHallazgo || '').trim().toUpperCase();
        const surface = String(req.body.superficie || '').trim().toUpperCase() || null;
        const observations = String(req.body.observaciones || '').trim() || null;
        if (!pieces.length || pieces.length > 32 || pieces.some((piece) => !/^\d{1,2}$/.test(piece))) {
            return res.status(400).json({ ok: false, mensaje: 'Envía entre 1 y 32 piezas dentales válidas.' });
        }
        if (!findingCode) {
            return res.status(400).json({ ok: false, mensaje: 'El código de hallazgo es obligatorio.' });
        }

        await connection.beginTransaction();
        const [odontograms] = await connection.query(
            'SELECT estado FROM odontogramas WHERE id_odontograma = ? FOR UPDATE',
            [odontogramId]
        );
        if (!odontograms.length) {
            await connection.rollback();
            return res.status(404).json({ ok: false, mensaje: 'Odontograma no encontrado.' });
        }
        if (odontograms[0].estado === 'FINALIZADO') {
            await connection.rollback();
            return res.status(409).json({ ok: false, mensaje: 'No se puede modificar un odontograma finalizado.' });
        }
        const [catalog] = await connection.query(
            `SELECT id_catalogo_hallazgo FROM catalogo_hallazgos
             WHERE codigo = ? AND activo = 1 LIMIT 1`,
            [findingCode]
        );
        if (!catalog.length) {
            await connection.rollback();
            return res.status(400).json({ ok: false, mensaje: 'El hallazgo no existe en el catálogo.' });
        }
        const values = pieces.map((piece) => [
            odontogramId, catalog[0].id_catalogo_hallazgo, piece, surface, observations
        ]);
        await connection.query(
            `INSERT INTO odontograma_hallazgos
                (id_odontograma, id_catalogo_hallazgo, pieza, superficie, observaciones)
             VALUES ?`,
            [values]
        );
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('odontogramas', ?, 'REGISTRAR_HALLAZGOS', ?)`,
            [odontogramId, JSON.stringify({ piezas: pieces, codigoHallazgo: findingCode, superficie: surface })]
        );
        await connection.commit();
        return res.status(201).json({ ok: true, insertados: pieces.length });
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
        const odontogramId = parseId(req.params.id);
        if (!odontogramId) {
            return res.status(400).json({ ok: false, mensaje: 'El id del odontograma no es válido.' });
        }
        await connection.beginTransaction();
        const [result] = await connection.query(
            `UPDATE odontogramas SET estado = 'FINALIZADO', finalizado_at = NOW()
             WHERE id_odontograma = ? AND estado <> 'FINALIZADO'`,
            [odontogramId]
        );
        if (!result.affectedRows) {
            await connection.rollback();
            return res.status(404).json({ ok: false, mensaje: 'Odontograma no encontrado o ya finalizado.' });
        }
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('odontogramas', ?, 'FINALIZAR', ?)`,
            [odontogramId, JSON.stringify({ mensaje: 'Odontograma finalizado.' })]
        );
        await connection.commit();
        return res.json({ ok: true, mensaje: 'Odontograma finalizado.' });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

module.exports = router;
