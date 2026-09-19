const multer = require('multer');

const tiposPermitidos = new Set([
    'image/jpeg',
    'image/png',
    'image/webp'
]);

const upload = multer({
    // La imagen queda temporalmente en memoria y se guarda como MEDIUMBLOB
    // dentro de la misma transacción del paciente.
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (_req, file, callback) => {
        if (!tiposPermitidos.has(file.mimetype)) {
            return callback(new Error('La foto debe ser JPG, PNG o WebP.'));
        }

        callback(null, true);
    }
});

module.exports = upload;
