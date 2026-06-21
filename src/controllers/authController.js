// src/controllers/authController.js
const bcrypt = require("bcrypt");
const User = require("../models/User");
const db = require("../config/db"); // Importado corretamente cá para cima

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

      // Guardamos o ID na sessão usando o nome 'userId'
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

  // 3. Função de Logout
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

  // 4Função de Atualização integrada de forma correta
  atualizarPerfil: async (req, res) => {
    const { nome, data_nascimento, grupo_sanguineo, peso } = req.body;

    // 1. Extração segura do ID do utilizador da sessão
    let utilizadorId = req.session?.userId;
    if (utilizadorId && typeof utilizadorId === "object") {
      utilizadorId =
        utilizadorId.id_utilizador ||
        utilizadorId.id ||
        utilizadorId.utilizador_id;
    }

    if (!utilizadorId) {
      return res
        .status(401)
        .json({ error: "Sessão expirada. Inicie sessão novamente." });
    }

    try {
      // 2.BUSCA OS DADOS ATUAIS DA BASE DE DADOS
      // Isto permite-nos saber o que está gravado antes de fazermos o UPDATE
      const [linhas] = await db.query(
        "SELECT nome, data_nascimento, grupo_sanguineo, peso FROM Utilizador WHERE id = ?",
        [utilizadorId],
      );

      if (!linhas || linhas.length === 0) {
        return res.status(404).json({ error: "Utilizador não encontrado." });
      }

      const dadosAtuais = linhas[0];

      // 3. LÓGICA DE PRESERVAÇÃO (Se for vazio '', mantém o que já existia)
      const nomeFinal =
        nome !== undefined && nome.trim() !== ""
          ? nome.trim()
          : dadosAtuais.nome;
      const dataFinal =
        data_nascimento !== undefined && data_nascimento.trim() !== ""
          ? data_nascimento.trim()
          : dadosAtuais.data_nascimento;
      const grupoFinal =
        grupo_sanguineo !== undefined && grupo_sanguineo.trim() !== ""
          ? grupo_sanguineo.trim()
          : dadosAtuais.grupo_sanguineo;

      // Tratamento especial para o peso (mantém o peso antigo se o novo vier em branco)
      let pesoFinal = dadosAtuais.peso;
      if (peso !== undefined && peso.trim() !== "") {
        const pesoNumerico = parseFloat(peso);
        if (!isNaN(pesoNumerico)) {
          pesoFinal = pesoNumerico;
        }
      }

      // 4. EXECUTA O UPDATE APENAS COM OS VALORES ATUALIZADOS OU PRESERVADOS
      const sql = `
        UPDATE Utilizador 
        SET nome = ?, data_nascimento = ?, grupo_sanguineo = ?, peso = ? 
        WHERE id = ?`;

      await db.query(sql, [
        nomeFinal,
        dataFinal,
        grupoFinal,
        pesoFinal, // Se veio vazio, vai o valor antigo; o decimal do MySQL nunca quebra!
        Number(utilizadorId),
      ]);

      return res
        .status(200)
        .json({ message: "Perfil modificado com sucesso!" });
    } catch (error) {
      console.error("Erro SQL ao atualizar perfil:", error);
      return res
        .status(500)
        .json({ error: "Erro interno ao gravar na base de dados." });
    }
  },

  // 5. Função de Eliminar Conta
  eliminarConta: async (req, res) => {
    try {
      const utilizadorId = req.session.userId;

      if (!utilizadorId) {
        return res
          .status(401)
          .json({ erro: "Sessão expirada. Inicie sessão novamente." });
      }

      const sql = `DELETE FROM Utilizador WHERE id = ?`;

      // Executa de forma simples. Se for mysql2 com promessas, isto funciona universalmente
      await db.query(sql, [utilizadorId]);

      // Destruir a sessão no servidor para o utilizador não ficar "logado" sem conta
      req.session.destroy((err) => {
        if (err) {
          console.error("Erro ao limpar sessão pós-eliminação:", err);
        }
        res.clearCookie("connect.sid");
        return res.status(200).send("Conta eliminada com sucesso.");
      });
    } catch (error) {
      // Isto vai imprimir o erro exato nos logs do Render (ex: erro de chave estrangeira/Foreign Key)
      console.error("ERRO CRÍTICO NO BANCO DE DADOS:", error.message);
      return res
        .status(500)
        .send("Erro interno do servidor ao eliminar a conta.");
    }
  },
};

module.exports = authController;
