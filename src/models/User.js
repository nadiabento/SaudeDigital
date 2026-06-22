// src/models/User.js
const db = require("../config/db");
const { QueryTypes } = require("sequelize");

class User {
  static async encontrarEmail(email) {
    try {
      // Executa o SELECT usando o padrão estrito do Sequelize
      const resultados = await db.query(
        "SELECT * FROM Utilizador WHERE email = ? LIMIT 1",
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

  static async criar(userData) {
    const { nome, email, password_hash, data_nascimento, grupo_sanguineo } =
      userData;

    try {
      // Executa o INSERT mapeando para a coluna física 'password' da tua BD
      const [resultado, metadata] = await db.query(
        `INSERT INTO Utilizador (nome, email, password, data_nascimento, grupo_sanguineo) 
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
      // O Sequelize devolve o ID gerado diretamente como o resultado do INSERT
      return resultado;
    } catch (error) {
      console.error("Erro crítico no modelo criar User:", error);
      throw error;
    }
  }
}

module.exports = User;
