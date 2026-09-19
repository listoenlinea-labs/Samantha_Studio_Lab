const express = require('express');
const routePendiente = require('./route-pendiente');

const router = express.Router();

router.patch('/:id/estado', routePendiente('PATCH /api/archivos/:id/estado'));

module.exports = router;