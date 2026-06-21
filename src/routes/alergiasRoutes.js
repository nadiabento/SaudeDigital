const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Listar alergias do utilizador autenticado
router.get("/", async (req, res) => {
  try {
    const idUtilizador = req.session.userId;

    if (!idUtilizador) {
      return res.status(401).json({
        erro: "Utilizador não autenticado."
      });
    }

    const [alergias] = await db.query(
      `
      SELECT
        id,
        id_utilizador,
        substancia,
        gravidade,
        observacoes
      FROM Alergia
      WHERE id_utilizador = ?
      ORDER BY
        CASE gravidade
          WHEN 'Anafilaxia' THEN 1
          WHEN 'Grave' THEN 2
          WHEN 'Moderada' THEN 3
          WHEN 'Leve' THEN 4
          ELSE 5
        END,
        substancia ASC
      `,
      [idUtilizador]
    );

    res.json(alergias);
  } catch (erro) {
    console.error("Erro ao obter alergias:", erro);

    res.status(500).json({
      erro: "Erro ao obter alergias."
    });
  }
});

// Registar nova alergia
router.post("/", async (req, res) => {
  try {
    const idUtilizador = req.session.userId;

    if (!idUtilizador) {
      return res.status(401).json({
        erro: "Utilizador não autenticado."
      });
    }

    const { substancia, gravidade, observacoes } = req.body;

    if (!substancia || !gravidade) {
      return res.status(400).json({
        erro: "Indique a substância e a gravidade da alergia."
      });
    }

    const gravidadesPermitidas = ["Leve", "Moderada", "Grave", "Anafilaxia"];

    if (!gravidadesPermitidas.includes(gravidade)) {
      return res.status(400).json({
        erro: "Gravidade inválida."
      });
    }

    await db.query(
      `
      INSERT INTO Alergia
        (id_utilizador, substancia, gravidade, observacoes)
      VALUES
        (?, ?, ?, ?)
      `,
      [
        idUtilizador,
        substancia,
        gravidade,
        observacoes || null
      ]
    );

    res.status(201).json({
      mensagem: "Alergia registada com sucesso."
    });
  } catch (erro) {
    console.error("Erro ao registar alergia:", erro);

    res.status(500).json({
      erro: "Erro ao registar alergia."
    });
  }
});

// Editar alergia
router.put("/:id", async (req, res) => {
  try {
    const idUtilizador = req.session.userId;
    const idAlergia = req.params.id;

    if (!idUtilizador) {
      return res.status(401).json({
        erro: "Utilizador não autenticado."
      });
    }

    const { gravidade, observacoes } = req.body;

    if (!gravidade) {
      return res.status(400).json({
        erro: "A gravidade é obrigatória."
      });
    }

    const gravidadesPermitidas = ["Leve", "Moderada", "Grave", "Anafilaxia"];

    if (!gravidadesPermitidas.includes(gravidade)) {
      return res.status(400).json({
        erro: "Gravidade inválida."
      });
    }

    const [resultado] = await db.query(
      `
      UPDATE Alergia
      SET
        gravidade = ?,
        observacoes = ?
      WHERE id = ?
        AND id_utilizador = ?
      `,
      [
        gravidade,
        observacoes || null,
        idAlergia,
        idUtilizador
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        erro: "Alergia não encontrada ou não pertence ao utilizador."
      });
    }

    res.json({
      mensagem: "Alergia atualizada com sucesso."
    });
  } catch (erro) {
    console.error("Erro ao atualizar alergia:", erro);

    res.status(500).json({
      erro: "Erro ao atualizar alergia."
    });
  }
});

// Eliminar alergia
router.delete("/:id", async (req, res) => {
  try {
    const idUtilizador = req.session.userId;
    const idAlergia = req.params.id;

    if (!idUtilizador) {
      return res.status(401).json({
        erro: "Utilizador não autenticado."
      });
    }

    const [resultado] = await db.query(
      `
      DELETE FROM Alergia
      WHERE id = ?
        AND id_utilizador = ?
      `,
      [idAlergia, idUtilizador]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        erro: "Alergia não encontrada ou não pertence ao utilizador."
      });
    }

    res.json({
      mensagem: "Alergia eliminada com sucesso."
    });
  } catch (erro) {
    console.error("Erro ao eliminar alergia:", erro);

    res.status(500).json({
      erro: "Erro ao eliminar alergia."
    });
  }
});

module.exports = router;