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
      // EXTRAÇÃO ABSOLUTA DO ID NUMÉRICO
      let userId = req.session.userId;
      if (userId && typeof userId === "object") {
        userId = userId.id_utilizador || userId.id || userId.utilizador_id;
      }

      const { data_exame, observacoes, id_tipo_exame } = req.body;

      if (!userId || typeof userId === "object") {
        return res
          .status(401)
          .json({ error: "Sessão inválida ou utilizador não autenticado." });
      }

      // Captura dos ficheiros tratados pelo Multer
      const ficheiroExame =
        req.files &&
        req.files["resultado_file"] &&
        req.files["resultado_file"][0]
          ? req.files["resultado_file"][0].filename
          : null;

      const ficheiroRelatorio =
        req.files && req.files["relatorio"] && req.files["relatorio"][0]
          ? req.files["relatorio"][0].filename
          : null;

      // --- PASSO 1: Inserir dados na tabela pai 'Exame' ---
      // CORREÇÃO: Uso de "?" para total compatibilidade com o dialeto MySQL do Sequelize
      // e ajuste do nome do campo para 'utilizador_id' conforme o seu schema.
      const sqlExamePai = `INSERT INTO Exame (utilizador_id, data_exame, observacoes) 
                           VALUES (?, ?, ?)`;

      const [resultadoInsercao] = await sequelize.query(sqlExamePai, {
        replacements: [userId, data_exame, observacoes || null],
        type: INSERT,
      });

      // No MySQL/Sequelize o retorno direto é o ID auto-incrementado gerado
      const novoIdExame = resultadoInsercao;

      // --- PASSO 2: Vincular o ID e os PDFs na tabela intermédia 'Exame_TipoExame' ---
      // CORREÇÃO: Ajustada para usar "?" ordenados e bater certo com a estrutura do print.
      const sqlRelacao = `INSERT INTO Exame_TipoExame (id_exame, id_tipo_exame, resultado, relatorio) 
                          VALUES (?, ?, ?, ?)`;

      await sequelize.query(sqlRelacao, {
        replacements: [
          novoIdExame,
          id_tipo_exame,
          ficheiroExame,
          ficheiroRelatorio,
        ],
        type: INSERT,
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
