// src/controllers/authController.js
const bcrypt = require("bcrypt");
const User = require("../models/User");

const authController = {
  // 1. Função de Registo
  registar: async (req, res) => {
    try {
      const { nome, email, password, data_nascimento, grupo_sanguineo } =
        req.body;

      // Verifica se o email já existe
      const utilizadorExistente = await User.encontrarEmail(email);
      if (utilizadorExistente) {
        return res.status(400).json({ erro: "Este e-mail já está registado." });
      }

      // Encripta a password
      const password_hash = await bcrypt.hash(password, 10);

      // Cria o utilizador na BD
      const novoUserId = await User.criar({
        nome,
        email,
        password_hash,
        data_nascimento,
        grupo_sanguineo,
      });

      res
        .status(201)
        .json({ mensagem: "Conta criada com sucesso!", id: novoUserId });
    } catch (error) {
      console.error("Erro no Registo:", error);
      res.status(500).json({ erro: "Erro interno no servidor ao registar." });
    }
  },

  // 2. Função de Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Procura o utilizador pelo email
      const utilizador = await User.encontrarEmail(email);

      if (!utilizador) {
        return res
          .status(401)
          .json({ erro: "E-mail ou palavra-passe incorretos." });
      }

      // Compara a password enviada com o hash da BD
      const passwordCorreta = await bcrypt.compare(
        password,
        utilizador.password_hash,
      );

      if (!passwordCorreta) {
        return res
          .status(401)
          .json({ erro: "E-mail ou palavra-passe incorretos." });
      }

      // --- RECORDAÇÃO: Guardamos o ID na sessão usando o nome 'userId' ---
      req.session.userId = utilizador.id;

      // Forçamos a gravação da sessão para garantir que o ID está lá no redirecionamento
      req.session.save((err) => {
        if (err) {
          console.error("Erro ao gravar sessão:", err);
          return res.status(500).json({ erro: "Erro ao processar login." });
        }

        console.log(`Utilizador ${utilizador.nome} logado com sucesso.`);

        res.status(200).json({
          mensagem: "Login efetuado com sucesso!",
          nome: utilizador.nome,
          redirecionar: "/dashboard.html",
        });
      });
    } catch (error) {
      console.error("Erro no Login:", error);
      res
        .status(500)
        .json({ erro: "Erro interno no servidor ao fazer login." });
    }
  },

  // 3. Função de Logout (Adicionada para completar o sistema)
  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res
          .status(500)
          .json({ erro: "Não foi possível encerrar a sessão." });
      }
      res.clearCookie("connect.sid"); // Limpa o cookie da sessão no navegador
      res.status(200).json({ mensagem: "Sessão encerrada." });
    });
  },
};

module.exports = authController;

const db = require("../config/db");

// Controller para processar a atualização
exports.atualizarPerfil = async (req, res) => {
  const { nome, data_nascimento, grupo_sanguineo, peso } = req.body;
  const utilizadorId = req.session.userId; // Busca o ID da sessão de quem está logado

  if (!utilizadorId) {
    return res
      .status(401)
      .json({ error: "Sessão expirada. Inicie sessão novamente." });
  }

  // Query 100% segura usando Prepared Statements com marcadores "?"
  const sql = `
        UPDATE Utilizador 
        SET nome = ?, data_nascimento = ?, grupo_sanguineo = ?, peso = ? 
        WHERE id = ?`;

  try {
    await db.query(sql, [
      nome,
      data_nascimento,
      grupo_sanguineo,
      peso,
      utilizadorId,
    ]);
    return res.status(200).json({ message: "Perfil modificado com sucesso!" });
  } catch (error) {
    console.error("Erro SQL ao atualizar perfil:", error);
    return res
      .status(500)
      .json({ error: "Erro interno ao gravar na base de dados." });
  }
};
