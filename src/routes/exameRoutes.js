const express = require("express");
const router = express.Router();
const exameController = require("../controllers/exameController");
const multer = require("multer");
const path = require("path");

// --- Configuração do Multer (Upload de PDF) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// --- DEFINIÇÃO DAS ROTAS ---

// GET: Listagens
router.get("/categorias", exameController.listarCategorias);
router.get("/tipos/:id_categoria", exameController.listarTiposPorCategoria);
router.get("/historico", exameController.listarHistorico); // Garante que esta rota existe!

// POST: Registar Exame com PDF
// 'relatorio' deve ser o 'name' do input no HTML
router.post(
  "/registar",
  upload.single("relatorio"),
  exameController.registarExame,
);

module.exports = router;
