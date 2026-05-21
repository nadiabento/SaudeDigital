const express = require("express");
const router = express.Router();
const consultaController = require("../controllers/consultaController");
const db = require("../config/db");

// GET (Listagens)
router.get("/unidades", consultaController.getUnidades);
router.get("/todos-medicos", consultaController.getTodosMedicos);
router.get("/historico", consultaController.listarHistorico);
router.get("/todas-especialidades", consultaController.getTodasEspecialidades);
router.get(
  "/medico-unidades/:id_medico",
  consultaController.getUnidadesDoMedico,
);
// Garante que esta rota existe para responder ao conta.js
router.get("/medicos", async (req, res) => {
  try {
    // CORREÇÃO: Mudámos de 'id' para 'id_medico AS id' para enganar o conta.js de forma positiva!
    const medicos = await db.sequelize.query(
      "SELECT id_medico AS id, nome FROM Medico ORDER BY nome ASC",
      { type: db.sequelize.QueryTypes.SELECT },
    );

    res.json(medicos);
  } catch (error) {
    console.error("Erro na tabela Medico, tentando fallback para id...");

    try {
      // Fallback secundário caso a coluna seja id_utilizador
      const medicosAlt = await db.sequelize.query(
        "SELECT id_utilizador AS id, nome FROM Medico ORDER BY nome ASC",
        { type: db.sequelize.QueryTypes.SELECT },
      );
      return res.json(medicosAlt);
    } catch (errAlt) {
      console.error("Erro real no terminal ao listar médicos:", error);
      res
        .status(500)
        .json({ error: "Erro interno no servidor ao listar médicos." });
    }
  }
});
router.get("/medicos/:id", async (req, res) => {
  /* ... */
}); // o teu get existente

router.delete("/medicos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Procura se o médico já tem alguma consulta marcada no sistema
    const [consultasDoMedico] = await db.sequelize.query(
      "SELECT id FROM Consulta WHERE id_medico = ? LIMIT 1",
      { replacements: [id], type: db.sequelize.QueryTypes.SELECT },
    );

    // Se houver histórico de consultas, bloqueia o botão da conta
    if (consultasDoMedico) {
      return res.status(400).json({
        error:
          "Aviso de Segurança: Este médico tem consultas associadas no histórico clínico e não pode ser removido.",
      });
    }

    // 2. Se o médico estiver livre, apaga com segurança
    await db.sequelize.query("DELETE FROM Medico WHERE id_medico = ?", {
      replacements: [id],
    });

    res.json({ message: "Médico removido com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao remover médico." });
  }
});

// POST (Criação)
router.post("/", consultaController.registarConsulta);
router.post("/unidades", consultaController.criarUnidade);
router.post("/medicos", consultaController.adicionarMedico);
router.post("/partilha", consultaController.gerarPartilha);

// PUT e DELETE (Edição e Eliminação)
router.put("/:id", consultaController.editarConsulta);
router.delete("/massa", consultaController.eliminarMassa);

module.exports = router;
