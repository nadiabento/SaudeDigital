// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

// Importamos o controlador que criaste no Passo 2
const authController = require('../controllers/authController');

// Rota para o Registo
router.post('/registo', authController.registar);

// Rota para o Login
router.post('/login', authController.login);

// Esta linha é a mais importante para o erro desaparecer:
module.exports = router;