const express = require("express");
const router = express.Router();
const exameController = require("../controllers/exameController");

// Rota para carregar as categorias no primeiro Select do HTML
// URL: http://localhost:3000/api/exames/categorias
router.get("/categorias", exameController.listarCategorias);

// Rota para carregar os tipos de exame filtrados pela categoria escolhida
// URL: http://localhost:3000/api/exames/tipos/:id_categoria
router.get("/tipos/:id_categoria", exameController.listarTiposPorCategoria);

module.exports = router;
