const express = require("express");
const router = express.Router();
const exameController = require("../controllers/exameController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

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

// --- ENTRADAS DE LEITURA (GET) ---
router.get("/categorias", exameController.listarCategorias);
router.get("/tipos/:id_categoria", exameController.listarTiposPorCategoria);
router.get("/tipos-todos", exameController.listarTodosOsTiposAgnostico);
router.get("/historico", exameController.listarHistorico);
router.get("/visualizar-partilha/:token", exameController.visualizarPartilha); // Rota que o médico clica (Abre o HTML no navegador)
router.get("/dados-partilha/:token", exameController.getDadosPartilha); // Rota que o JavaScript da página do médico chama para puxar os exames em JSON

// --- ENTRADAS DE ESCRITA (POST) ---
router.post(
  "/registar",
  upload.single("relatorio"),
  exameController.registarExame,
);
router.post("/categorias", exameController.criarCategoria);
router.post("/tipos", exameController.criarTipo);
router.post("/gerar-partilha", exameController.gerarPartilha);

// --- ENTRADAS DE MANUTENÇÃO (PUT/DELETE) ---
router.put("/editar/:id", exameController.editarExame);
router.delete("/eliminar-massa", exameController.eliminarMassa);
router.delete("/categorias/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Procura se existem tipos de exames associados a esta categoria
    const [dependentes] = await db.sequelize.query(
      "SELECT id FROM Tipo_Exame WHERE id_categoria = ? LIMIT 1",
      { replacements: [id], type: db.sequelize.QueryTypes.SELECT },
    );

    // Se encontrar alguma coisa, TRAVA o delete imediatamente e envia erro 400
    if (dependentes) {
      return res.status(400).json({
        error:
          "Eliminação recusada! Esta categoria tem tipos de exames associados (ex: Raio-X, TAC) e não pode ser removida.",
      });
    }

    // 2. Só avança se o contador for zero
    await db.sequelize.query("DELETE FROM Categoria_Exame WHERE id = ?", {
      replacements: [id],
    });

    res.json({ message: "Categoria eliminada com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao tentar eliminar." });
  }
});
router.delete("/tipos/:id", exameController.eliminarTipoExame);

module.exports = router;
