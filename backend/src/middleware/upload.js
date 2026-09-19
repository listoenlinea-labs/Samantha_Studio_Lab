const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadsDirectory = path.join(__dirname, '../../uploads');

fs.mkdirSync(uploadsDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, uploadsDirectory);
    },

    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;

        callback(null, filename);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
            return callback(new Error('Solo se permiten archivos de imagen.'));
        }

        callback(null, true);
    }
});

module.exports = upload;