// src/models/User.js
const db = require("../config/db"); // Importa a tua instância oficial do Sequelize

class User {
  static async encontrarEmail(email) {
    try {
      const resultados = await db.query(
        "SELECT * FROM Utilizador WHERE email = ? LIMIT 1",
        {
          replacements: [email],
          type: db.QueryTypes.SELECT,
        },
      );
      return resultados.length > 0 ? resultados[0] : null;
    } catch (error) {
      console.error("Erro no modelo encontrarEmail:", error);
      throw error;
    }
  }

  static async criar(userData) {
    // Mapeia o password_hash recebido do controller para a coluna 'password' da BD
    const { nome, email, password_hash, data_nascimento, grupo_sanguineo } =
      userData;

    try {
      const [resultId] = await db.query(
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
          type: db.QueryTypes.INSERT,
        },
      );
      return resultId;
    } catch (error) {
      console.error("Erro no modelo criar User:", error);
      throw error;
    }
  }
}

module.exports = User;
