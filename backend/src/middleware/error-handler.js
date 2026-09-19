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

    return res.status(500).json({
        ok: false,
        mensaje: 'Ocurrió un error interno en el servidor.'
    });
}

module.exports = errorHandler;
