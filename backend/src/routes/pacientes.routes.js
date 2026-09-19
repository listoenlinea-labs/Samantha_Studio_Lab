const express = require('express');
const pool = require('../config/database');
const routePendiente = require('./route-pendiente');
const upload = require('../middleware/upload');
const router = express.Router();

function construirFotoUrl(req, idPaciente, version = Date.now()) {
    return `${req.protocol}://${req.get('host')}/api/pacientes/${idPaciente}/foto?v=${encodeURIComponent(version)}`;
}

/**
 * Valida que el id recibido en la URL sea un número entero positivo.
 */
function obtenerIdPaciente(req, res) {
    const idPaciente = Number(req.params.id);

    if (!Number.isInteger(idPaciente) || idPaciente <= 0) {
        res.status(400).json({
            ok: false,
            mensaje: 'El id del paciente debe ser un número entero positivo.'
        });

        return null;
    }

    return idPaciente;
}

/**
 * GET /api/pacientes?buscar=&pagina=1&limite=20
 * Lista pacientes. Más adelante aquí irá la consulta real a MySQL.
 */
router.get('/', async (req, res, next) => {
    try {
        const buscar = String(req.query.buscar || '').trim();
        const pagina = Math.max(Number(req.query.pagina) || 1, 1);
        const limite = Math.min(Math.max(Number(req.query.limite) || 20, 1), 100);
        const offset = (pagina - 1) * limite;

        const filtro = `%${buscar}%`;

        const condicionBusqueda = `
      (
        CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) LIKE ?
        OR p.telefono LIKE ?
        OR p.correo LIKE ?
        OR ep.numero_expediente LIKE ?
      )
    `;

        const [conteo] = await pool.query(
            `
        SELECT COUNT(*) AS total
        FROM pacientes p
        LEFT JOIN expedientes_paciente ep
          ON ep.id_paciente = p.id_paciente
        WHERE p.activo = 1
          AND ${condicionBusqueda}
      `,
            [filtro, filtro, filtro, filtro]
        );

        const [pacientes] = await pool.query(
            `
        SELECT
          p.id_paciente AS idPaciente,
          CONCAT_WS(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS nombreCompleto,
          TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad,
          p.telefono,
          p.correo,
          pf.updated_at AS fotoActualizadaAt,
          ep.numero_expediente AS numeroExpediente,
          ep.nota_general AS notaGeneral,

          (
            SELECT MAX(c.inicio_at)
            FROM citas c
            WHERE c.id_paciente = p.id_paciente
              AND c.inicio_at < NOW()
              AND c.estado NOT IN ('CANCELADA', 'NO_ASISTIO')
          ) AS ultimaCita,

          (
            SELECT MIN(c.inicio_at)
            FROM citas c
            WHERE c.id_paciente = p.id_paciente
              AND c.inicio_at >= NOW()
              AND c.estado IN ('PROGRAMADA', 'CONFIRMADA', 'EN_SALA')
          ) AS proximaCita,

          (
            SELECT COUNT(*)
            FROM tareas_paciente t
            WHERE t.id_paciente = p.id_paciente
              AND t.estado IN ('PENDIENTE', 'EN_PROCESO')
          ) AS tareasPendientes,

          COALESCE((
            SELECT SUM(pr.total)
            FROM presupuestos pr
            WHERE pr.id_paciente = p.id_paciente
              AND pr.estado IN ('ENVIADO', 'APROBADO')
          ), 0) AS presupuestoPendiente

        FROM pacientes p
        LEFT JOIN expedientes_paciente ep
          ON ep.id_paciente = p.id_paciente
        LEFT JOIN paciente_fotos pf
          ON pf.id_paciente = p.id_paciente
        WHERE p.activo = 1
          AND ${condicionBusqueda}
        ORDER BY p.nombres, p.apellido_paterno, p.apellido_materno
        LIMIT ? OFFSET ?
      `,
            [filtro, filtro, filtro, filtro, limite, offset]
        );

        const idsPacientes = pacientes.map((paciente) => paciente.idPaciente);

        let filasEtiquetas = [];

        if (idsPacientes.length > 0) {
            [filasEtiquetas] = await pool.query(
                `
          SELECT
            pe.id_paciente AS idPaciente,
            e.id_etiqueta AS idEtiqueta,
            e.nombre,
            e.color_fondo AS colorFondo,
            e.color_texto AS colorTexto
          FROM paciente_etiquetas pe
          INNER JOIN etiquetas e
            ON e.id_etiqueta = pe.id_etiqueta
          WHERE pe.id_paciente IN (?)
            AND e.activo = 1
          ORDER BY e.nombre
        `,
                [idsPacientes]
            );
        }

        const etiquetasPorPaciente = new Map();

        for (const etiqueta of filasEtiquetas) {
            if (!etiquetasPorPaciente.has(etiqueta.idPaciente)) {
                etiquetasPorPaciente.set(etiqueta.idPaciente, []);
            }

            etiquetasPorPaciente.get(etiqueta.idPaciente).push({
                idEtiqueta: etiqueta.idEtiqueta,
                nombre: etiqueta.nombre,
                colorFondo: etiqueta.colorFondo,
                colorTexto: etiqueta.colorTexto
            });
        }

        const items = pacientes.map((paciente) => {
            const { fotoActualizadaAt, ...datosPaciente } = paciente;

            return {
                ...datosPaciente,
                fotoUrl: fotoActualizadaAt
                    ? construirFotoUrl(req, paciente.idPaciente, new Date(fotoActualizadaAt).getTime())
                    : null,
                edad: paciente.edad === null ? null : Number(paciente.edad),
                tareasPendientes: Number(paciente.tareasPendientes),
                presupuestoPendiente: Number(paciente.presupuestoPendiente),
                etiquetas: etiquetasPorPaciente.get(paciente.idPaciente) || []
            };
        });

        res.json({
            items,
            total: Number(conteo[0].total),
            pagina,
            limite
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/pacientes
 * Creará un paciente nuevo.
 */
router.post('/', upload.single('profilePhoto'), async (req, res, next) => {
    const conexion = await pool.getConnection();

    try {
        const {
            nombres,
            apellidoPaterno,
            apellidoMaterno,
            fechaNacimiento,
            sexo,
            telefono,
            correo,
            comoNosConocio,
            alergias,
            antecedentesMedicos,
            notasAlerta,
            notaGeneral
        } = req.body;

        const nombresLimpios = String(nombres || '').trim();

        if (!nombresLimpios) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El nombre del paciente es obligatorio.'
            });
        }

        if (nombresLimpios.length > 100) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El nombre no puede exceder 100 caracteres.'
            });
        }

        const sexosPermitidos = ['F', 'M', 'X', 'NO_ESPECIFICA'];

        if (sexo && !sexosPermitidos.includes(sexo)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'El sexo recibido no es válido.'
            });
        }

        if (fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La fechaNacimiento debe tener el formato AAAA-MM-DD.'
            });
        }

        await conexion.beginTransaction();

        const [resultadoPaciente] = await conexion.query(
            `
        INSERT INTO pacientes (
          nombres,
          apellido_paterno,
          apellido_materno,
          fecha_nacimiento,
          sexo,
          telefono,
          correo,
          como_nos_conocio,
          alergias,
          antecedentes_medicos,
          notas_alerta,
          activo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
            [
                nombresLimpios,
                String(apellidoPaterno || '').trim() || null,
                String(apellidoMaterno || '').trim() || null,
                fechaNacimiento || null,
                sexo || null,
                String(telefono || '').trim() || null,
                String(correo || '').trim() || null,
                String(comoNosConocio || '').trim() || null,
                String(alergias || '').trim() || null,
                String(antecedentesMedicos || '').trim() || null,
                String(notasAlerta || '').trim() || null
            ]
        );

        const idPaciente = resultadoPaciente.insertId;
        const anio = new Date().getFullYear();
        const numeroExpediente = `EXP-${anio}-${String(idPaciente).padStart(6, '0')}`;

        if (req.file) {
            await conexion.query(
                `
          INSERT INTO paciente_fotos (
            id_paciente,
            nombre_original,
            mime_type,
            tamano_bytes,
            contenido
          )
          VALUES (?, ?, ?, ?, ?)
        `,
                [
                    idPaciente,
                    req.file.originalname,
                    req.file.mimetype,
                    req.file.size,
                    req.file.buffer
                ]
            );
        }

        await conexion.query(
            `
        INSERT INTO expedientes_paciente (
          id_paciente,
          numero_expediente,
          nota_general,
          estado
        )
        VALUES (?, ?, ?, 'ACTIVO')
      `,
            [
                idPaciente,
                numeroExpediente,
                String(notaGeneral || '').trim() || null
            ]
        );

        await conexion.query(
            `
        INSERT INTO auditoria (
          entidad,
          id_entidad,
          accion,
          detalle
        )
        VALUES (?, ?, 'CREAR', ?)
      `,
            [
                'pacientes',
                idPaciente,
                JSON.stringify({
                    mensaje: 'Paciente y expediente creados desde la API.',
                    numeroExpediente
                })
            ]
        );

        await conexion.commit();

        res.status(201).json({
            ok: true,
            mensaje: 'Paciente creado correctamente.',
            paciente: {
                idPaciente,
                numeroExpediente,
                nombres: nombresLimpios,
                fotoUrl: req.file ? construirFotoUrl(req, idPaciente) : null
            }
        });
    } catch (error) {
        await conexion.rollback();

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                ok: false,
                mensaje: 'Ya existe un registro con un dato que debe ser único.'
            });
        }

        next(error);
    } finally {
        conexion.release();
    }
});

/**
 * GET /api/pacientes/:id/foto
 * Entrega la foto almacenada en MySQL sin exponer una carpeta pública.
 */
router.get('/:id/foto', async (req, res, next) => {
    try {
        const idPaciente = obtenerIdPaciente(req, res);
        if (!idPaciente) return;

        const [fotos] = await pool.query(
            `
        SELECT mime_type, tamano_bytes, contenido
        FROM paciente_fotos
        WHERE id_paciente = ?
        LIMIT 1
      `,
            [idPaciente]
        );

        if (!fotos.length) {
            return res.status(404).json({
                ok: false,
                mensaje: 'El paciente no tiene una foto registrada.'
            });
        }

        const foto = fotos[0];

        res.set({
            'Content-Type': foto.mime_type,
            'Content-Length': foto.tamano_bytes,
            'Cache-Control': req.query.v
                ? 'private, max-age=31536000, immutable'
                : 'private, no-cache',
            'X-Content-Type-Options': 'nosniff'
        });

        return res.send(foto.contenido);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/pacientes/:id
 * Consulta los datos base de un paciente.
 */
router.get('/:id', async (req, res, next) => {
    try {
        const idPaciente = obtenerIdPaciente(req, res);
        if (!idPaciente) return;

        res.status(501).json({
            ok: false,
            idPaciente,
            mensaje: 'La consulta individual aún no está conectada a MySQL.'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/pacientes/:id
 * Actualiza datos generales del paciente.
 */
router.patch('/:id', upload.single('profilePhoto'), async (req, res, next) => {
    const conexion = await pool.getConnection();

    try {
        const idPaciente = obtenerIdPaciente(req, res);
        if (!idPaciente) return;

        if (!req.file) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Selecciona una imagen para actualizar la foto.'
            });
        }

        await conexion.beginTransaction();

        const [pacientes] = await conexion.query(
            `
                SELECT id_paciente
                FROM pacientes
                WHERE id_paciente = ? AND activo = 1
                LIMIT 1
            `,
            [idPaciente]
        );

        if (!pacientes.length) {
            await conexion.rollback();

            return res.status(404).json({
                ok: false,
                mensaje: 'Paciente no encontrado o inactivo.'
            });
        }

        await conexion.query(
            `
                INSERT INTO paciente_fotos (
                    id_paciente,
                    nombre_original,
                    mime_type,
                    tamano_bytes,
                    contenido
                )
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    nombre_original = VALUES(nombre_original),
                    mime_type = VALUES(mime_type),
                    tamano_bytes = VALUES(tamano_bytes),
                    contenido = VALUES(contenido),
                    updated_at = CURRENT_TIMESTAMP
            `,
            [
                idPaciente,
                req.file.originalname,
                req.file.mimetype,
                req.file.size,
                req.file.buffer
            ]
        );

        await conexion.query(
            `
                INSERT INTO auditoria (entidad, id_entidad, accion, detalle)
                VALUES (?, ?, 'ACTUALIZAR', ?)
            `,
            [
                'pacientes',
                idPaciente,
                JSON.stringify({
                    mensaje: 'Foto de perfil actualizada.'
                })
            ]
        );

        await conexion.commit();

        const fotoUrl = construirFotoUrl(req, idPaciente);

        res.json({
            ok: true,
            mensaje: 'Foto actualizada correctamente.',
            fotoUrl
        });
    } catch (error) {
        await conexion.rollback();
        next(error);
    } finally {
        conexion.release();
    }
});

/**
 * PATCH /api/pacientes/:id/estado
 * Activa o desactiva a un paciente, sin eliminar su expediente.
 */
router.patch('/:id/estado', async (req, res, next) => {
    try {
        const idPaciente = obtenerIdPaciente(req, res);
        if (!idPaciente) return;

        res.status(501).json({
            ok: false,
            idPaciente,
            mensaje: 'El cambio de estado aún no está conectado a MySQL.'
        });
    } catch (error) {
        next(error);
    }
});


router.get('/:id/resumen', routePendiente('GET /api/pacientes/:id/resumen'));
router.get('/:id/citas', routePendiente('GET /api/pacientes/:id/citas'));
router.get('/:id/filiacion', routePendiente('GET /api/pacientes/:id/filiacion'));
router.patch('/:id/filiacion', routePendiente('PATCH /api/pacientes/:id/filiacion'));

router.get('/:id/presupuestos', routePendiente('GET /api/pacientes/:id/presupuestos'));
router.post('/:id/presupuestos', routePendiente('POST /api/pacientes/:id/presupuestos'));

router.get('/:id/tareas', routePendiente('GET /api/pacientes/:id/tareas'));
router.post('/:id/tareas', routePendiente('POST /api/pacientes/:id/tareas'));

router.post('/:id/responsables', routePendiente('POST /api/pacientes/:id/responsables'));
router.post('/:id/etiquetas', routePendiente('POST /api/pacientes/:id/etiquetas'));
router.post('/:id/notas', routePendiente('POST /api/pacientes/:id/notas'));

router.get('/:id/historia-clinica', routePendiente('GET /api/pacientes/:id/historia-clinica'));
router.put('/:id/historia-clinica', routePendiente('PUT /api/pacientes/:id/historia-clinica'));

router.get('/:id/tratamientos', routePendiente('GET /api/pacientes/:id/tratamientos'));
router.get('/:id/sesiones', routePendiente('GET /api/pacientes/:id/sesiones'));
router.post('/:id/sesiones', routePendiente('POST /api/pacientes/:id/sesiones'));

router.get('/:id/odontogramas', routePendiente('GET /api/pacientes/:id/odontogramas'));
router.post('/:id/odontogramas', routePendiente('POST /api/pacientes/:id/odontogramas'));

router.get('/:id/periodontogramas', routePendiente('GET /api/pacientes/:id/periodontogramas'));
router.post('/:id/periodontogramas', routePendiente('POST /api/pacientes/:id/periodontogramas'));

router.get('/:id/archivos', routePendiente('GET /api/pacientes/:id/archivos'));
router.post('/:id/archivos', routePendiente('POST /api/pacientes/:id/archivos'));

module.exports = router;
