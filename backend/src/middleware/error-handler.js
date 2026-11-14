'use strict';
const multer = require('multer');

// Ninguna respuesta ni log deben exponer consultas SQL, contenido de recetas,
// alergias, nombres o valores de formularios clínicos.
function errorHandler(error, req, res, _next) {
    if (res.headersSent) return _next(error);

    const requestId = String(req.requestId || res.getHeader('X-Request-ID') || '');
    const code = String(error?.code || error?.type || 'UNEXPECTED_ERROR');
    const diagnostic = {
        requestId: requestId || null,
        method: req.method,
        route: req.route?.path || req.path?.replace(/\/\d+(?=\/|$)/g, '/:id') || 'unknown',
        code,
        errno: Number(error?.errno) || undefined,
        sqlState: String(error?.sqlState || '') || undefined
    };
    console.error('[CLINICAL_API_ERROR]', JSON.stringify(diagnostic));

    const reply = (status, message, publicCode) => res.status(status).json({
        ok: false, mensaje: message, codigo: publicCode, requestId: requestId || null
    });

    if (error?.type === 'entity.too.large' || error?.code === 'LIMIT_FILE_SIZE') {
        return reply(413, 'El archivo o contenido supera el tamaño permitido. Usa uno más pequeño.', 'TOO_LARGE');
    }
    if (error?.type === 'entity.parse.failed') {
        return reply(400, 'La información enviada no tiene un formato JSON válido.', 'INVALID_JSON');
    }
    if (error instanceof multer.MulterError) {
        return reply(400, 'No fue posible procesar el archivo. Revisa el formato y el tamaño.', 'INVALID_UPLOAD');
    }
    if (error?.message === 'La foto debe ser JPG, PNG o WebP.') {
        return reply(400, error.message, 'INVALID_IMAGE');
    }
    if (code === 'ER_DUP_ENTRY') {
        return reply(409, 'El registro ya existe o entra en conflicto con otro dato. Actualiza y revisa antes de guardar.', 'DUPLICATE');
    }
    if (['ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2'].includes(code)) {
        return reply(409, 'No se pudo guardar porque faltan o están relacionados otros registros. Verifica que el paciente siga existiendo.', 'RELATION_CONFLICT');
    }
    if (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(code)) {
        return reply(503, 'La base de datos está ocupada. Verifica si se guardó el registro antes de intentarlo otra vez.', 'DB_BUSY');
    }
    if (['ER_NET_PACKET_TOO_LARGE', 'ER_WARN_ALLOWED_PACKET_OVERFLOWED'].includes(code)) {
        return reply(413, 'El archivo supera el máximo que permite MySQL en este servidor. Reduce su tamaño.', 'DATABASE_PACKET_LIMIT');
    }
    if (code === 'ER_DATA_TOO_LONG') {
        return reply(413, 'Algún campo o archivo supera el tamaño que permite la base de datos.', 'DATABASE_FIELD_LIMIT');
    }
    if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR', 'ER_NO_DEFAULT_FOR_FIELD'].includes(code)) {
        return reply(503, 'La estructura de MySQL necesita una revisión o migración. Consulta la referencia en los logs de Hostinger.', 'DATABASE_SCHEMA');
    }
    if (['PROTOCOL_CONNECTION_LOST', 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR', 'ECONNREFUSED', 'ECONNRESET',
        'ETIMEDOUT', 'ER_CON_COUNT_ERROR', 'ER_USER_LIMIT_REACHED', 'ER_GET_CONNECTION_TIMEOUT'].includes(code)) {
        return reply(503, 'La conexión a MySQL no está disponible. Revisa Hostinger antes de reintentar el guardado.', 'DATABASE_CONNECTION');
    }
    return reply(500, 'No se pudo completar la operación. No se confirmaron los cambios; revisa la referencia en los logs de Hostinger.', 'INTERNAL_ERROR');
}

module.exports = errorHandler;
