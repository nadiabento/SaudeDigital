console.log("medRoutes.js foi carregado");

const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/teste", (req, res) => {
  res.send("Teste dentro do medRoutes.js funciona");
});

router.get("/", async (req, res) => {
  console.log("GET /api/medicacao foi chamado");

  try {
    const idUtilizador = req.session.userId;

    if (!idUtilizador) {
      return res.status(401).json({
        erro: "Utilizador não autenticado."
      });
    }

    const [medicamentos] = await db.query(
      `
      SELECT 
        Medicamento.id,
        Medicamento.id_utilizador,
        Medicamento.id_catalogo_medicamento,
        Medicamento.posologia,
        Medicamento.data_inicio,
        Medicamento.data_fim,
        Medicamento.estado,

        Catalogo_Medicamentos.nome_medicamento,
        Catalogo_Medicamentos.substancia_ativa,
        Catalogo_Medicamentos.dosagem,
        Catalogo_Medicamentos.forma_farmaceutica

      FROM Medicamento
      INNER JOIN Catalogo_Medicamentos
        ON Medicamento.id_catalogo_medicamento = Catalogo_Medicamentos.id
      WHERE Medicamento.id_utilizador = ?
      ORDER BY Medicamento.data_inicio DESC
      `,
      [idUtilizador]
    );

    res.json(medicamentos);
  } catch (erro) {
    console.error("Erro ao obter medicação:", erro);
    res.status(500).json({
      erro: "Erro ao obter a medicação do utilizador."
    });
  }
});

module.exports = router;