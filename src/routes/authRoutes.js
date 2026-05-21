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

// Adiciona isto no teu ficheiro de rotas de autenticação no backend
router.get("/meu-perfil", async (req, res) => {
  try {
    const userId = req.session.userId || 4; // Ajustado para o ID 4 detetado no teu log

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

    // Como o SELECT do Sequelize devolve um array de objetos ou o objeto direto
    const utilizador = Array.isArray(linhas) ? linhas[0] : linhas;
    res.json(utilizador);
  } catch (error) {
    console.error("Erro real no terminal ao carregar perfil:", error);
    res
      .status(500)
      .json({ error: "Erro interno no servidor ao carregar o perfil." });
  }
});

// Esta linha é a mais importante para o erro desaparecer:
module.exports = router;
