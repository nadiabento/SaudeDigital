const express = require("express");
const router = express.Router();
const db = require("../config/db");


// Pesquisa medicamentos no catálogo conforme o utilizador escreve
router.get("/catalogo", async (req, res) => {
  try {
    const termo = req.query.termo;

    if (!termo || termo.trim().length < 2) {
      return res.json([]);
    }

    const termoLimpo = termo.trim();
    const pesquisaQualquerParte = `%${termoLimpo}%`;
    const pesquisaInicio = `${termoLimpo}%`;

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
      ORDER BY
        CASE
          WHEN nome_medicamento LIKE ? THEN 1
          WHEN substancia_ativa LIKE ? THEN 2
          WHEN nome_medicamento LIKE ? THEN 3
          WHEN substancia_ativa LIKE ? THEN 4
          ELSE 5
        END,
        nome_medicamento ASC        
      LIMIT 10
      `,
       [
        pesquisaQualquerParte,
        pesquisaQualquerParte,
        pesquisaInicio,
        pesquisaInicio,
        pesquisaQualquerParte,
        pesquisaQualquerParte
      ]
    );

    res.json(resultados);
  } catch (erro) {
    console.error("Erro ao pesquisar catálogo de medicamentos:", erro);

    res.status(500).json({
      erro: "Erro ao pesquisar medicamentos."
    });
  }
});

router.post("/catalogo", async (req, res) => {
  try {
    const {
      nome_medicamento,
      substancia_ativa,
      dosagem,
      forma_farmaceutica
    } = req.body;

    if (!nome_medicamento || !substancia_ativa || !dosagem || !forma_farmaceutica) {
      return res.status(400).json({
        erro: "Preencha todos os campos do medicamento."
      });
    }

    const [existente] = await db.query(
      `
      SELECT id
      FROM Catalogo_Medicamentos
      WHERE nome_medicamento = ?
        AND substancia_ativa = ?
        AND dosagem = ?
        AND forma_farmaceutica = ?
      LIMIT 1
      `,
      [nome_medicamento, substancia_ativa, dosagem, forma_farmaceutica]
    );

    if (existente.length > 0) {
      return res.status(409).json({
        erro: "Este medicamento já existe no catálogo."
      });
    }

    const [resultado] = await db.query(
      `
      INSERT INTO Catalogo_Medicamentos
        (nome_medicamento, substancia_ativa, dosagem, forma_farmaceutica)
      VALUES
        (?, ?, ?, ?)
      `,
      [nome_medicamento, substancia_ativa, dosagem, forma_farmaceutica]
    );

    res.status(201).json({
      mensagem: "Medicamento adicionado ao catálogo com sucesso.",
      id: resultado.insertId
    });
  } catch (erro) {
    console.error("Erro ao adicionar medicamento ao catálogo:", erro);

    res.status(500).json({
      erro: "Erro ao adicionar medicamento ao catálogo."
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

    const historico = req.query.historico === "true";

    let filtroEstado = "";

    if (!historico) {
      filtroEstado = `
        AND Medicamento.estado = 'Ativo'
        AND (
          Medicamento.data_fim IS NULL
          OR Medicamento.data_fim >= CURDATE()
        )
      `;
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
      ${filtroEstado}
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


router.delete("/:id", async (req, res) => {
  try {
    const idUtilizador = req.session.userId || 1;
    const idMedicamento = req.params.id;

    const [resultado] = await db.query(
      `
      DELETE FROM Medicamento
      WHERE id = ?
        AND id_utilizador = ?
      `,
      [idMedicamento, idUtilizador]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        erro: "Medicação não encontrada ou não pertence ao utilizador."
      });
    }

    res.json({
      mensagem: "Medicação eliminada com sucesso."
    });
  } catch (erro) {
    console.error("Erro ao eliminar medicação:", erro);

    res.status(500).json({
      erro: "Erro ao eliminar a medicação."
    });
  }
});

router.put("/:id/estado", async (req, res) => {
  try {
    const idUtilizador = req.session.userId;
    const idMedicamento = req.params.id;
    const { estado } = req.body;

    if (!idUtilizador) {
      return res.status(401).json({
        erro: "Utilizador não autenticado."
      });
    }

    if (!estado) {
      return res.status(400).json({
        erro: "O estado da medicação é obrigatório."
      });
    }

    const estadosPermitidos = ["Ativo", "Suspenso", "Concluído"];

    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        erro: "Estado inválido."
      });
    }

    const [resultado] = await db.query(
      `
      UPDATE Medicamento
      SET estado = ?
      WHERE id = ?
        AND id_utilizador = ?
      `,
      [estado, idMedicamento, idUtilizador]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        erro: "Medicação não encontrada ou não pertence ao utilizador."
      });
    }

    res.json({
      mensagem: "Estado da medicação atualizado com sucesso."
    });
  } catch (erro) {
    console.error("Erro ao atualizar estado da medicação:", erro);

    res.status(500).json({
      erro: "Erro ao atualizar o estado da medicação."
    });
  }
});

router.post("/efeitos", async (req, res) => {
  try {
    const idUtilizador = req.session.userId;

    if (!idUtilizador) {
      return res.status(401).json({
        erro: "Utilizador não autenticado."
      });
    }

    const {
      id_medicamento,
      sintoma,
      gravidade,
      data_ocorrencia,
      notas
    } = req.body;

    if (!id_medicamento || !sintoma || !gravidade || !data_ocorrencia) {
      return res.status(400).json({
        erro: "Preencha a medicação, o sintoma, a gravidade e a data."
      });
    }

    const gravidadesPermitidas = ["Ligeiro", "Grave", "Muito Grave"];

    if (!gravidadesPermitidas.includes(gravidade)) {
      return res.status(400).json({
        erro: "Gravidade inválida."
      });
    }

    // Confirma se a medicação pertence ao utilizador autenticado
    const [medicacao] = await db.query(
      `
      SELECT id
      FROM Medicamento
      WHERE id = ?
        AND id_utilizador = ?
      LIMIT 1
      `,
      [id_medicamento, idUtilizador]
    );

    if (medicacao.length === 0) {
      return res.status(404).json({
        erro: "Medicação não encontrada ou não pertence ao utilizador."
      });
    }

    await db.query(
      `
      INSERT INTO Efeito_Secundario
        (id_medicamento, sintoma, gravidade, data_ocorrencia, notas)
      VALUES
        (?, ?, ?, ?, ?)
      `,
      [
        id_medicamento,
        sintoma,
        gravidade,
        data_ocorrencia,
        notas || null
      ]
    );

    res.status(201).json({
      mensagem: "Efeito secundário registado com sucesso."
    });
  } catch (erro) {
    console.error("Erro ao registar efeito secundário:", erro);

    res.status(500).json({
      erro: "Erro ao registar o efeito secundário."
    });
  }
});



module.exports = router;