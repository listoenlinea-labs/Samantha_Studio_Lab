const express = require('express');
const routePendiente = require('./route-pendiente');

const router = express.Router();

router.post('/login', routePendiente('POST /api/auth/login'));
router.get('/me', routePendiente('GET /api/auth/me'));
router.post('/logout', routePendiente('POST /api/auth/logout'));

module.exports = router;