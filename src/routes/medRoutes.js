console.log("medRoutes.js foi carregado");

const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/teste", (req, res) => {
  res.send("Teste dentro do medRoutes.js funciona");
});


// Pesquisa medicamentos no catálogo conforme o utilizador escreve
router.get("/catalogo", async (req, res) => {
  try {
    const termo = req.query.termo;

    if (!termo || termo.trim().length < 2) {
      return res.json([]);
    }

    const pesquisa = `%${termo.trim()}%`;

    const [resultados] = await db.query(
      `
      SELECT
        id,
        nome_medicamento,
        substancia_ativa,
        dosagem,
        forma_farmaceutica
      FROM Catalogo_Medicamentos
      WHERE nome_medicamento LIKE ?
         OR substancia_ativa LIKE ?
      ORDER BY nome_medicamento ASC
      LIMIT 10
      `,
      [pesquisa, pesquisa]
    );

    res.json(resultados);
  } catch (erro) {
    console.error("Erro ao pesquisar catálogo de medicamentos:", erro);

    res.status(500).json({
      erro: "Erro ao pesquisar medicamentos."
    });
  }
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

// Regista nova medicação para o utilizador
router.post("/", async (req, res) => {
  try {
    const idUtilizador = req.session.userId || 1;

    const {
        id_catalogo_medicamento,
        medicamento,        
        posologia,
        data_inicio,
        data_fim,
        estado
    } = req.body;

    if (!id_catalogo_medicamento || !medicamento || !posologia || !data_inicio) {
        return res.status(400).json({
            erro: "Selecione um medicamento, indique a posologia e a data de início."
        });
    }

    if (data_fim && data_fim < data_inicio) {
      return res.status(400).json({
        erro: "A data de fim não pode ser anterior à data de início."
      });
    }

    await db.query(
      `
      INSERT INTO Medicamento
        (id_utilizador, id_catalogo_medicamento, posologia, data_inicio, data_fim, estado)
      VALUES
        (?, ?, ?, ?, ?, ?)
      `,
      [
        idUtilizador,
        id_catalogo_medicamento,
        posologia,
        data_inicio,
        data_fim || null,
        estado || "Ativo"
      ]
    );

    res.status(201).json({
      mensagem: "Medicação registada com sucesso."
    });
  } catch (erro) {
    console.error("Erro ao registar medicação:", erro);

    res.status(500).json({
      erro: "Erro ao registar a medicação."
    });
  }
});


module.exports = router;