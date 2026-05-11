const express = require('express');
const router = express.Router();
// Caminho atualizado para o novo nome do controlador
const consultaController = require('../controllers/consultaController');

// GET (Listagens)
router.get('/unidades', consultaController.getUnidades);
router.get('/especialidades/:id_unidade', consultaController.getEspecialidadesDaUnidade);
router.get('/medicos/:id_unidade/:id_especialidade', consultaController.getMedicos);
router.get('/historico', consultaController.listarHistorico);

// POST (Criação)
// Repara: agora usamos '/' porque o prefixo no server.js será '/api/consultas'
router.post('/', consultaController.registarConsulta); 
router.post('/unidades', consultaController.criarUnidade);
router.post('/medicos', consultaController.criarMedico);
router.post('/partilha', consultaController.gerarPartilha);

// PUT e DELETE (Edição e Eliminação)
router.put('/:id', consultaController.editarConsulta);
router.delete('/massa', consultaController.eliminarMassa);

module.exports = router;