// src/models/User.js
const db = require("../config/db");

class User {
  static async encontrarEmail(email) {
    try {
      const [rows] = await db.execute(
        "SELECT * FROM Utilizador WHERE email = ?",
        [email],
      );
      return rows[0];
    } catch (error) {
      console.error("Erro no modelo encontrarEmail:", error);
      throw error;
    }
  }

  static async criar(userData) {
    const { nome, email, password_hash, data_nascimento, grupo_sanguineo } =
      userData;

    try {
      // O truque '|| null' previne o crash fatal se algum dado chegar como 'undefined'
      const [result] = await db.execute(
        `INSERT INTO Utilizador (nome, email, password_hash, data_nascimento, grupo_sanguineo) 
                 VALUES (?, ?, ?, ?, ?)`,
        [
          nome || null,
          email || null,
          password_hash || null,
          data_nascimento || null,
          grupo_sanguineo || null,
        ],
      );
      return result.insertId;
    } catch (error) {
      console.error("Erro no modelo criar User:", error);
      throw error;
    }
  }
}

module.exports = User;
