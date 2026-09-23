const express = require('express');
const pool = require('../config/database');

const router = express.Router();

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

const visualStates = new Set(['BUENO', 'MALO', 'NEUTRO']);
const validSurfaces = new Set(['OCLUSAL', 'VESTIBULAR', 'PALATINA', 'LINGUAL', 'MESIAL', 'DISTAL', 'DIENTE']);

router.get('/catalogo/hallazgos', async (_req, res, next) => {
    try {
        const [items] = await pool.query(
            `SELECT codigo, nombre, clasificacion, icono, variantes,
                    orden, requiere_superficie AS requiereSuperficie
             FROM catalogo_hallazgos
             WHERE activo = 1
             ORDER BY orden, nombre`
        );
        return res.json({
            items: items.map((item) => ({
                ...item,
                requiereSuperficie: Boolean(item.requiereSuperficie),
                variantes: String(item.variantes || item.clasificacion).split(',').filter(Boolean)
            }))
        });
    } catch (error) {
        next(error);
    }
});

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
                    h.estado_visual AS estadoVisual, h.variante, h.datos_json AS datos,
                    h.observaciones, h.created_at AS creadoAt,
                    c.codigo AS codigoHallazgo, c.nombre, c.clasificacion, c.icono
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
        const visualState = String(req.body.estadoVisual || '').trim().toUpperCase();
        const requestedVariant = String(req.body.variante || '').trim().slice(0, 40) || null;
        const extraData = req.body.datos && typeof req.body.datos === 'object' ? req.body.datos : null;
        const observations = String(req.body.observaciones || '').trim() || null;
        if (!pieces.length || pieces.length > 32 || pieces.some((piece) => !/^\d{1,2}$/.test(piece))) {
            return res.status(400).json({ ok: false, mensaje: 'Envía entre 1 y 32 piezas dentales válidas.' });
        }
        if (!findingCode) {
            return res.status(400).json({ ok: false, mensaje: 'El código de hallazgo es obligatorio.' });
        }
        if (surface && !validSurfaces.has(surface)) {
            return res.status(400).json({ ok: false, mensaje: 'La superficie dental no es válida.' });
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
            `SELECT id_catalogo_hallazgo, clasificacion, variantes, requiere_superficie
             FROM catalogo_hallazgos
             WHERE codigo = ? AND activo = 1 LIMIT 1`,
            [findingCode]
        );
        if (!catalog.length) {
            await connection.rollback();
            return res.status(400).json({ ok: false, mensaje: 'El hallazgo no existe en el catálogo.' });
        }
        const allowedStates = String(catalog[0].variantes || catalog[0].clasificacion)
            .split(',').filter((state) => visualStates.has(state));
        const normalizedState = visualState || catalog[0].clasificacion;
        if (!visualStates.has(normalizedState) || !allowedStates.includes(normalizedState)) {
            await connection.rollback();
            return res.status(400).json({ ok: false, mensaje: 'El color seleccionado no corresponde a este hallazgo.' });
        }
        const variant = requestedVariant || normalizedState;
        if (catalog[0].requiere_superficie && !surface) {
            await connection.rollback();
            return res.status(400).json({ ok: false, mensaje: 'Selecciona una superficie para este hallazgo.' });
        }
        const [legacyPieceColumns] = await connection.query(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = DATABASE()
               AND table_name = 'odontograma_hallazgos'
               AND column_name = 'pieza_dental'`
        );
        const hasLegacyPiece = legacyPieceColumns.length > 0;
        const values = pieces.map((piece) => [
            odontogramId, catalog[0].id_catalogo_hallazgo, piece,
            ...(hasLegacyPiece ? [piece] : []), surface,
            normalizedState, variant, extraData ? JSON.stringify(extraData) : null, observations
        ]);
        await connection.query(
            `INSERT INTO odontograma_hallazgos
                (id_odontograma, id_catalogo_hallazgo, pieza,
                 ${hasLegacyPiece ? 'pieza_dental, ' : ''}superficie,
                 estado_visual, variante, datos_json, observaciones)
             VALUES ?`,
            [values]
        );
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('odontogramas', ?, 'REGISTRAR_HALLAZGOS', ?)`,
            [odontogramId, JSON.stringify({ piezas: pieces, codigoHallazgo: findingCode,
                superficie: surface, estadoVisual: normalizedState, variante: variant })]
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

router.delete('/:id/hallazgos/:hallazgoId', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const odontogramId = parseId(req.params.id);
        const findingId = parseId(req.params.hallazgoId);
        if (!odontogramId || !findingId) {
            return res.status(400).json({ ok: false, mensaje: 'El odontograma o hallazgo no es válido.' });
        }
        await connection.beginTransaction();
        const [rows] = await connection.query(
            `SELECT o.estado, h.pieza, c.codigo
             FROM odontogramas o
             INNER JOIN odontograma_hallazgos h ON h.id_odontograma = o.id_odontograma
             INNER JOIN catalogo_hallazgos c ON c.id_catalogo_hallazgo = h.id_catalogo_hallazgo
             WHERE o.id_odontograma = ? AND h.id_hallazgo = ? FOR UPDATE`,
            [odontogramId, findingId]
        );
        if (!rows.length) {
            await connection.rollback();
            return res.status(404).json({ ok: false, mensaje: 'Hallazgo no encontrado.' });
        }
        if (rows[0].estado === 'FINALIZADO') {
            await connection.rollback();
            return res.status(409).json({ ok: false, mensaje: 'No se puede modificar un odontograma finalizado.' });
        }
        await connection.query('DELETE FROM odontograma_hallazgos WHERE id_hallazgo = ?', [findingId]);
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('odontogramas', ?, 'ELIMINAR_HALLAZGO', ?)`,
            [odontogramId, JSON.stringify({ idHallazgo: findingId, pieza: rows[0].pieza, codigo: rows[0].codigo })]
        );
        await connection.commit();
        return res.json({ ok: true, mensaje: 'Hallazgo eliminado.' });
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
        const odontogramId = parseId(req.params.id);
        if (!odontogramId) {
            return res.status(400).json({ ok: false, mensaje: 'El id del odontograma no es válido.' });
        }
        const dentition = String(req.body.tipoDenticion || '').trim().toUpperCase();
        const nomenclature = String(req.body.nomenclatura || '').trim().toUpperCase();
        const observations = String(req.body.observaciones || '').trim() || null;
        if (!['ADULTO', 'MIXTO', 'NINO'].includes(dentition) || !['FDI', 'ADA'].includes(nomenclature)) {
            return res.status(400).json({ ok: false, mensaje: 'Dentición o nomenclatura no válida.' });
        }
        await connection.beginTransaction();
        const [result] = await connection.query(
            `UPDATE odontogramas
             SET tipo_denticion = ?, nomenclatura = ?, observaciones = ?
             WHERE id_odontograma = ? AND estado <> 'FINALIZADO'`,
            [dentition, nomenclature, observations, odontogramId]
        );
        if (!result.affectedRows) {
            await connection.rollback();
            return res.status(409).json({ ok: false, mensaje: 'Odontograma no encontrado o finalizado.' });
        }
        await connection.query(
            `INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
             VALUES ('odontogramas', ?, 'ACTUALIZAR_CONFIGURACION', ?)`,
            [odontogramId, JSON.stringify({ tipoDenticion: dentition, nomenclatura })]
        );
        await connection.commit();
        return res.json({ ok: true, mensaje: 'Configuración guardada.' });
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
