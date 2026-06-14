// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Importamos o controlador que criaste no Passo 2
const authController = require("../controllers/authController");

// Rota para o Registo
router.post("/registo", authController.registar);

// Rota para o Login
router.post("/login", authController.login);

router.get("/meu-perfil", async (req, res) => {
  try {
    const userId = req.session.userId;

    // Bloqueia quem não fez login!
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Acesso Negado. Faça login primeiro." });
    }

    const linhas = await db.sequelize.query(
      "SELECT nome, email, grupo_sanguineo, data_nascimento FROM Utilizador WHERE id = ? LIMIT 1",
      {
        replacements: [userId],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    if (!linhas || linhas.length === 0) {
      return res.status(404).json({ error: "Utilizador não encontrado" });
    }

    const utilizador = Array.isArray(linhas) ? linhas[0] : linhas;
    res.json(utilizador);
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    res
      .status(500)
      .json({ error: "Erro interno no servidor ao carregar o perfil." });
  }
});

router.put("/perfil", authController.atualizarPerfil);

// Esta linha é a mais importante para o erro desaparecer:
module.exports = router;
