const express = require('express');
const router = express.Router();
// Caminho atualizado para o novo nome do controlador
const consultaController = require('../controllers/consultaController');

// GET (Listagens)
router.get('/unidades', consultaController.getUnidades);
router.get('/todos-medicos', consultaController.getTodosMedicos);
router.get('/historico', consultaController.listarHistorico);
router.get('/todas-especialidades', consultaController.getTodasEspecialidades);
router.get('/medico-unidades/:id_medico', consultaController.getUnidadesDoMedico);

// POST (Criação)
router.post('/', consultaController.registarConsulta); 
router.post('/unidades', consultaController.criarUnidade);
router.post('/medicos', consultaController.adicionarMedico);
router.post('/partilha', consultaController.gerarPartilha);

// PUT e DELETE (Edição e Eliminação)
router.put('/:id', consultaController.editarConsulta);
router.delete('/massa', consultaController.eliminarMassa);

module.exports = router;