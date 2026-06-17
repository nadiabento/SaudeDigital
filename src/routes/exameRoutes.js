const express = require("express");
const router = express.Router();
const exameController = require("../controllers/exameController");
const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");
const sequelize = require("../config/db"); // CORREÇÃO: Importação necessária para as queries diretas

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
  limits: { fileSize: 5 * 1024 * 1024 }, // CORREÇÃO: Limite de 5MB para evitar ataques DoS
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".pdf") {
      cb(null, true);
    } else {
      // CORREÇÃO: Passar o erro estruturado para o Express gerir sem mandar a app abaixo
      cb(new Error("Apenas são permitidos ficheiros PDF!"), false);
    }
  },
});

// --- ENTRADAS DE LEITURA (GET) ---
router.get("/categorias", exameController.listarCategorias);
router.get("/tipos/:id_categoria", exameController.listarTiposPorCategoria);
router.get("/tipos-todos", exameController.listarTodosOsTiposAgnostico);
router.get("/historico", exameController.listarHistorico);
router.get("/visualizar-partilha/:token", exameController.visualizarPartilha);
router.get("/dados-partilha/:token", exameController.getDadosPartilha);

// --- ENTRADAS DE ESCRITA (POST) ---
router.post(
  "/registar",
  upload.fields([
    { name: "resultado_file", maxCount: 1 },
    { name: "relatorio", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = req.session.userId;
      const { data_exame, observacoes, id_tipo_exame } = req.body;

      if (!userId) return res.status(401).json({ error: "Não autenticado" });

      // Captura dos PDFs vindos do Multer
      const ficheiroExame = req.files?.["resultado_file"]?.[0]
        ? req.files["resultado_file"][0].filename
        : null;

      const ficheiroRelatorio = req.files?.["relatorio"]?.[0]
        ? req.files["relatorio"][0].filename
        : null;

      // --- PASSO 1: Inserir os dados gerais na tabela pai 'Exame' ---
      // (Ajusta os nomes das colunas 'id_utilizador', 'data', 'observacoes' se variarem na tabela Exame)
      const sqlExamePai = `INSERT INTO Exame (id_utilizador, data, observacoes) VALUES (?, ?, ?)`;
      const [resultadoInsercao] = await db.execute(sqlExamePai, [
        userId,
        data_exame,
        observacoes || null,
      ]);

      // Captura o ID auto-incrementado gerado para este exame específico
      const novoIdExame = resultadoInsercao.insertId;

      // --- PASSO 2: Vincular o ID e guardar os PDFs na tabela 'Exame_TipoExame' ---
      const sqlRelacao = `INSERT INTO Exame_TipoExame (id_exame, id_tipo_exame, resultado, relatorio) 
                        VALUES (?, ?, ?, ?)`;

      await db.execute(sqlRelacao, [
        novoIdExame,
        id_tipo_exame,
        ficheiroExame,
        ficheiroRelatorio,
      ]);

      res
        .status(200)
        .json({ mensagem: "Exame e documentos vinculados com sucesso!" });
    } catch (error) {
      console.error("Erro relacional no backend:", error);
      res.status(500).json({
        error: "Erro ao processar o mapeamento relacional das tabelas.",
      });
    }
  },
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
    // CORREÇÃO: Utiliza a instância correta 'sequelize' importada no topo
    const [dependentes] = await sequelize.query(
      "SELECT id FROM Tipo_Exame WHERE id_categoria = ? LIMIT 1",
      { replacements: [id], type: sequelize.QueryTypes.SELECT },
    );

    if (dependentes) {
      return res.status(400).json({
        error:
          "Eliminação recusada! Esta categoria tem tipos de exames associados (ex: Raio-X, TAC) e não pode ser removida.",
      });
    }

    await sequelize.query("DELETE FROM Categoria_Exame WHERE id = ?", {
      replacements: [id],
    });

    res.json({ message: "Categoria eliminada com sucesso." });
  } catch (error) {
    console.error("Erro ao eliminar categoria nas rotas:", error);
    res.status(500).json({ error: "Erro interno ao tentar eliminar." });
  }
});

router.delete("/tipos/:id", exameController.eliminarTipoExame);

module.exports = router;
