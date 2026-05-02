const express = require('express');
const router = express.Router();
const clinicaController = require('../controllers/clinicaController');

router.get('/unidades', clinicaController.getUnidades);
router.get('/especialidades/:id_unidade', clinicaController.getEspecialidadesDaUnidade);
router.get('/medicos/:id_unidade/:id_especialidade', clinicaController.getMedicos);

module.exports = router; 