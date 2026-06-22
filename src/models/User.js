// src/models/User.js
const db = require("../config/db");
const { QueryTypes } = require("sequelize");

class User {
  // 1. Pesquisa de Email (Aponta agora explicitamente para defaultdb.Utilizador)
  static async encontrarEmail(email) {
    try {
      const resultados = await db.query(
        "SELECT * FROM defaultdb.Utilizador WHERE email = ? LIMIT 1",
        {
          replacements: [email],
          type: QueryTypes.SELECT,
        },
      );
      return resultados.length > 0 ? resultados[0] : null;
    } catch (error) {
      console.error("Erro no modelo encontrarEmail:", error);
      throw error;
    }
  }

  // 2. Inserção de Nova Conta (Aponta agora explicitamente para defaultdb.Utilizador)
  static async criar(userData) {
    const { nome, email, password_hash, data_nascimento, grupo_sanguineo } =
      userData;

    try {
      const [resultado, metadata] = await db.query(
        `INSERT INTO defaultdb.Utilizador (nome, email, password, data_nascimento, grupo_sanguineo) 
                 VALUES (?, ?, ?, ?, ?)`,
        {
          replacements: [
            nome,
            email,
            password_hash,
            data_nascimento,
            grupo_sanguineo,
          ],
          type: QueryTypes.INSERT,
        },
      );
      return resultado;
    } catch (error) {
      console.error("Erro crítico no modelo criar User:", error);
      throw error;
    }
  }
}

module.exports = User;
