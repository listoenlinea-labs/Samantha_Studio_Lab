const express = require('express');
const pool = require('../config/database');

const router = express.Router();

function enteroPositivo(value, fallback = null) {
    if (value === '' || value === null || value === undefined) return fallback;
    const numero = Number(value);
    return Number.isInteger(numero) && numero > 0 ? numero : NaN;
}

function decimalNoNegativo(value, fallback = 0) {
    if (value === '' || value === null || value === undefined) return fallback;
    const numero = Number(value);
    return Number.isFinite(numero) && numero >= 0 ? numero : NaN;
}

function normalizarTratamiento(body, parcial = false) {
    body = body || {};
    const tratamiento = {};
    const errores = [];

    if (!parcial || Object.hasOwn(body, 'nombre')) {
        tratamiento.nombre = String(body.nombre || '').trim();
        if (!tratamiento.nombre) errores.push('El nombre es obligatorio.');
        if (tratamiento.nombre.length > 150) errores.push('El nombre no puede exceder 150 caracteres.');
    }

    if (!parcial || Object.hasOwn(body, 'categoria')) {
        tratamiento.categoria = String(body.categoria || '').trim();
        if (!tratamiento.categoria) errores.push('La categoría es obligatoria.');
        if (tratamiento.categoria.length > 100) errores.push('La categoría no puede exceder 100 caracteres.');
    }

    if (!parcial || Object.hasOwn(body, 'descripcion')) {
        const descripcion = String(body.descripcion || '').trim();
        tratamiento.descripcion = descripcion || null;
    }

    if (!parcial || Object.hasOwn(body, 'duracionMinutos')) {
        tratamiento.duracionMinutos = enteroPositivo(body.duracionMinutos);
        if (Number.isNaN(tratamiento.duracionMinutos)) errores.push('La duración debe ser un entero positivo.');
    }

    if (!parcial || Object.hasOwn(body, 'sesionesSugeridas')) {
        tratamiento.sesionesSugeridas = enteroPositivo(body.sesionesSugeridas, 1);
        if (Number.isNaN(tratamiento.sesionesSugeridas)) errores.push('Las sesiones sugeridas deben ser un entero positivo.');
    }

    for (const [entrada, salida, etiqueta] of [
        ['costoCalculado', 'costoCalculado', 'El costo calculado'],
        ['precioVenta', 'precioVenta', 'El precio de venta']
    ]) {
        if (!parcial || Object.hasOwn(body, entrada)) {
            tratamiento[salida] = decimalNoNegativo(body[entrada]);
            if (Number.isNaN(tratamiento[salida])) errores.push(`${etiqueta} debe ser mayor o igual a cero.`);
        }
    }

    if (!parcial || Object.hasOwn(body, 'activo')) {
        tratamiento.activo = body.activo === false || body.activo === 0 || body.activo === '0' ? 0 : 1;
    }

    return { tratamiento, errores };
}

const columnas = `
    id_tratamiento AS idTratamiento,
    nombre,
    categoria,
    descripcion,
    duracion_minutos AS duracionMinutos,
    sesiones_sugeridas AS sesionesSugeridas,
    costo_calculado AS costoCalculado,
    precio_venta AS precioVenta,
    activo,
    created_at AS creadoAt
`;

router.get('/', async (req, res, next) => {
    try {
        const buscar = String(req.query.buscar || '').trim();
        const incluirInactivos = String(req.query.incluirInactivos || '') === 'true';
        const parametros = [];
        const condiciones = [];

        if (!incluirInactivos) condiciones.push('activo = 1');
        if (buscar) {
            condiciones.push('(nombre LIKE ? OR categoria LIKE ? OR descripcion LIKE ?)');
            const filtro = `%${buscar}%`;
            parametros.push(filtro, filtro, filtro);
        }

        const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
        const [items] = await pool.query(
            `SELECT ${columnas} FROM catalogo_tratamientos ${where} ORDER BY activo DESC, categoria, nombre`,
            parametros
        );

        res.json({
            items: items.map((item) => ({
                ...item,
                idTratamiento: Number(item.idTratamiento),
                duracionMinutos: item.duracionMinutos === null ? null : Number(item.duracionMinutos),
                sesionesSugeridas: Number(item.sesionesSugeridas),
                costoCalculado: Number(item.costoCalculado),
                precioVenta: Number(item.precioVenta),
                activo: Boolean(item.activo)
            })),
            total: items.length
        });
    } catch (error) {
        next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { tratamiento, errores } = normalizarTratamiento(req.body);
        if (errores.length) return res.status(400).json({ ok: false, mensaje: errores.join(' ') });

        const [resultado] = await pool.query(
            `INSERT INTO catalogo_tratamientos
                (nombre, categoria, descripcion, duracion_minutos, sesiones_sugeridas, costo_calculado, precio_venta, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [tratamiento.nombre, tratamiento.categoria, tratamiento.descripcion, tratamiento.duracionMinutos,
                tratamiento.sesionesSugeridas, tratamiento.costoCalculado, tratamiento.precioVenta, tratamiento.activo]
        );

        res.status(201).json({ ok: true, idTratamiento: Number(resultado.insertId) });
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const idTratamiento = Number(req.params.id);
        if (!Number.isInteger(idTratamiento) || idTratamiento <= 0) {
            return res.status(400).json({ ok: false, mensaje: 'El id del tratamiento no es válido.' });
        }

        const { tratamiento, errores } = normalizarTratamiento(req.body, true);
        if (errores.length) return res.status(400).json({ ok: false, mensaje: errores.join(' ') });

        const mapa = {
            nombre: 'nombre',
            categoria: 'categoria',
            descripcion: 'descripcion',
            duracionMinutos: 'duracion_minutos',
            sesionesSugeridas: 'sesiones_sugeridas',
            costoCalculado: 'costo_calculado',
            precioVenta: 'precio_venta',
            activo: 'activo'
        };
        const entradas = Object.entries(tratamiento);
        if (!entradas.length) return res.status(400).json({ ok: false, mensaje: 'No se recibieron cambios.' });

        const asignaciones = entradas.map(([campo]) => `${mapa[campo]} = ?`).join(', ');
        const valores = entradas.map(([, valor]) => valor);
        const [resultado] = await pool.query(
            `UPDATE catalogo_tratamientos SET ${asignaciones} WHERE id_tratamiento = ?`,
            [...valores, idTratamiento]
        );

        if (!resultado.affectedRows) {
            return res.status(404).json({ ok: false, mensaje: 'No se encontró el tratamiento.' });
        }

        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
