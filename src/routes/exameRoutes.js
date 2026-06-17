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
// ROTA: Registar Novo Exame com Relatório PDF
router.post("/registar", upload.single("relatorio"), async (req, res) => {
  try {
    const userId = req.session.userId;
    // O id_tipo_exame, data_exame, observacoes e o resultado (texto se houver) vêm do formulário
    const { data_exame, observacoes, id_tipo_exame, resultado_texto } =
      req.body;

    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    // O Multer guarda o PDF aqui se o utilizador tiver anexado um ficheiro
    const nomeFicheiroPDF = req.file ? req.file.filename : null;

    const sql = `INSERT INTO Exame_TipoExame (id_utilizador, id_tipo_exame, data, observacoes, resultado, relatorio) 
                 VALUES (?, ?, ?, ?, ?, ?)`;

    // Passamos as variáveis na ordem correta das colunas
    await db.execute(sql, [
      userId,
      id_tipo_exame,
      data_exame,
      observacoes,
      resultado_texto || null,
      nomeFicheiroPDF,
    ]);

    res
      .status(200)
      .json({ mensagem: "Exame e relatório guardados com sucesso!" });
  } catch (error) {
    console.error("Erro ao registar exame:", error);
    res.status(500).json({ error: "Erro interno ao guardar o exame" });
  }
});

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
