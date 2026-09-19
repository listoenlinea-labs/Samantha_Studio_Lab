const multer = require('multer');

function errorHandler(error, _req, res, _next) {
    if (error instanceof multer.MulterError) {
        const mensaje = error.code === 'LIMIT_FILE_SIZE'
            ? 'La foto no puede pesar más de 5 MB.'
            : 'No fue posible procesar la foto enviada.';

        return res.status(400).json({ ok: false, mensaje });
    }

    if (error.message === 'La foto debe ser JPG, PNG o WebP.') {
        return res.status(400).json({ ok: false, mensaje: error.message });
    }

    console.error(error);

    if (error.code === 'ER_NO_SUCH_TABLE') {
        return res.status(503).json({
            ok: false,
            mensaje: 'Falta preparar la tabla de fotos. Reinicia la API y revisa los permisos de MySQL.'
        });
    }

    if (error.code === 'ER_NET_PACKET_TOO_LARGE' || error.code === 'ER_DATA_TOO_LONG') {
        return res.status(413).json({
            ok: false,
            mensaje: 'La imagen supera el tamaño que admite la base de datos.'
        });
    }

    const respuesta = {
        ok: false,
        mensaje: 'Ocurrió un error interno en el servidor.'
    };

    if (process.env.NODE_ENV === 'development') {
        respuesta.detalle = error.message;
    }

    return res.status(500).json(respuesta);
}

module.exports = errorHandler;
