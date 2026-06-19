const express = require("express");
const router = express.Router();
const examenController = require("../controllers/exameController");
const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");
const sequelize = require("../config/db"); // Importação necessária para queries parametrizadas

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const sufixoAleatorio = Math.round(Math.random() * 1e5);
    cb(
      null,
      Date.now() + "-" + sufixoAleatorio + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Proteção contra DoS (5MB max)
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".pdf") {
      cb(null, true);
    } else {
      cb(new Error("Apenas são permitidos ficheiros PDF."));
    }
  },
});

router.get("/categorias", examenController.listarCategorias);
router.get("/tipos/:id_categoria", examenController.listarTiposPorCategoria);
router.get("/tipos-todos", examenController.listarTodosOsTiposAgnostico);
router.get("/historico", examenController.listarHistorico);

router.post(
  "/registar",
  (req, res, next) => {
    upload.single("resultado")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res
          .status(400)
          .json({ error: `Erro no upload: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  examenController.registarExame,
);

router.post("/gerar-partilha", examenController.gerarPartilha);

// --- OPERAÇÃO DE MANUTENÇÃO PARAMETRIZADA CONTRA INJEÇÃO SECUNDÁRIA ---
router.delete("/categorias/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // 2. RESOLVIDO: Injeção evitada através de tokens nomeados (:id)
    const dependentes = await sequelize.query(
      "SELECT id FROM Tipo_Exame WHERE id_categoria = :id LIMIT 1",
      { replacements: { id }, type: sequelize.QueryTypes.SELECT },
    );

    if (dependentes.length > 0) {
      return res.status(400).json({
        error:
          "Eliminação recusada! Esta categoria possui vínculos dependentes ativos.",
      });
    }

    await sequelize.query("DELETE FROM Categoria_Exame WHERE id = :id", {
      replacements: { id },
    });

    res.json({ message: "Categoria removida com sucesso." });
  } catch (error) {
    console.error("Erro na rota de eliminação:", error);
    res
      .status(500)
      .json({ error: "Erro interno ao tentar remover a categoria." });
  }
});

router.delete("/eliminar-massa", examenController.eliminarMassa);

module.exports = router;
