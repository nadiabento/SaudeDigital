// src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// A rota que vai devolver o resumo
router.get('/resumo', dashboardController.resumo);

module.exports = router;