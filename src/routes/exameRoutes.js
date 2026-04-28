const express = require("express");
const router = express.Router();
const exameController = require("../controllers/exameController");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // ADICIONADO: Para verificar existência de pastas

// --- Configuração do Multer (Upload de PDF) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/";
    // RETIFICAÇÃO: Garante que a pasta existe, senão o multer crasha o servidor
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Gera um nome: 1714245600000.pdf (evita nomes duplicados)
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// FILTRO DE SEGURANÇA: Aceitar apenas ficheiros PDF
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".pdf") {
      cb(null, true);
    } else {
      cb(new Error("Apenas são permitidos ficheiros PDF!"), false);
    }
  },
});

// --- DEFINIÇÃO DAS ROTAS ---

// GET: Listagens
router.get("/categorias", exameController.listarCategorias);
router.get("/tipos/:id_categoria", exameController.listarTiposPorCategoria);
router.get("/historico", exameController.listarHistorico);

// POST: Registar Exame com PDF
// O middleware 'upload.single' deve ser chamado ANTES do controller
router.post(
  "/registar",
  upload.single("relatorio"), // O nome "relatorio" deve coincidir com o 'name' no <input type="file">
  exameController.registarExame,
);

// POST: Criar novas Categorias e Tipos (Modais)
router.post("/categorias", exameController.criarCategoria);
router.post("/tipos", exameController.criarTipo);

// --- RETIFICAÇÃO: A rota DELETE deve estar ANTES do module.exports ---
router.delete("/eliminar-massa", exameController.eliminarMassa);

module.exports = router; // O ficheiro deve terminar aqui
