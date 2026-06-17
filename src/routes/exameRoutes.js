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
      //  Garante que extraímos apenas o ID numérico, caso o userId seja um objeto
      let userId = req.session.userId;
      if (userId && typeof userId === "object" && userId.id_utilizador) {
        userId = userId.id_utilizador;
      } else if (userId && typeof userId === "object" && userId.id) {
        userId = userId.id;
      }

      const { data_exame, observacoes, id_tipo_exame } = req.body;

      if (!userId) return res.status(401).json({ error: "Não autenticado" });

      // Captura segura dos ficheiros do Multer
      const ficheiroExame = req.files?.["resultado_file"]?.[0]
        ? req.files["resultado_file"][0].filename
        : null;

      const ficheiroRelatorio = req.files?.["relatorio"]?.[0]
        ? req.files["relatorio"][0].filename
        : null;

      // --- PASSO 1: Inserir dados na tabela 'Exame' ---
      const sqlExamePai = `INSERT INTO Exame (id_utilizador, data, observacoes) 
                         VALUES (:id_utilizador, :data, :observacoes)`;

      const [resultadoInsercao] = await sequelize.query(sqlExamePai, {
        replacements: {
          id_utilizador: userId,
          data: data_exame,
          observacoes: observacoes || null,
        },
        type: "INSERT",
      });

      const novoIdExame = resultadoInsercao;

      // --- PASSO 2: Vincular o ID e os PDFs na tabela 'Exame_TipoExame' ---
      const sqlRelacao = `INSERT INTO Exame_TipoExame (id_exame, id_tipo_exame, resultado, relatorio) 
                        VALUES (:id_exame, :id_tipo_exame, :resultado, :relatorio)`;

      await sequelize.query(sqlRelacao, {
        replacements: {
          id_exame: novoIdExame,
          id_tipo_exame: id_tipo_exame,
          resultado: ficheiroExame,
          relatorio: ficheiroRelatorio,
        },
        type: "INSERT",
      });

      res.status(200).json({
        mensagem: "Exame e documentos vinculados com sucesso via Sequelize!",
      });
    } catch (error) {
      console.error("Erro relacional no Sequelize:", error);
      res.status(500).json({
        error:
          "Erro ao processar o mapeamento relacional das tabelas com Sequelize.",
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
