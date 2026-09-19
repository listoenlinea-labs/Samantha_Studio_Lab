const express = require('express');
const routePendiente = require('./route-pendiente');

const router = express.Router();

router.get('/:id', routePendiente('GET /api/periodontogramas/:id'));
router.put('/:id/mediciones', routePendiente('PUT /api/periodontogramas/:id/mediciones'));
router.patch('/:id/finalizar', routePendiente('PATCH /api/periodontogramas/:id/finalizar'));

module.exports = router;