const express = require('express');
const routePendiente = require('./route-pendiente');

const router = express.Router();

router.get('/:id/hallazgos', routePendiente('GET /api/odontogramas/:id/hallazgos'));
router.post('/:id/hallazgos', routePendiente('POST /api/odontogramas/:id/hallazgos'));
router.patch('/:id/finalizar', routePendiente('PATCH /api/odontogramas/:id/finalizar'));

module.exports = router;