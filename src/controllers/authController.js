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

      // 1. Verifica de forma limpa se o e-mail já existe
      const utilizadorExistente = await User.encontrarEmail(email);
      if (utilizadorExistente) {
        return res.status(400).json({ erro: "Este e-mail já está registado." });
      }

      // 2. Encripta a password
      const password_hash = await bcrypt.hash(password, 10);

      // 3. Cria o utilizador na BD passando o objeto esperado pelo User.js
      const novoUserId = await User.criar({
        nome,
        email,
        password_hash, // Passa exatamente a propriedade que o teu User.js vai desestruturar
        data_nascimento,
        grupo_sanguineo,
      });

      // Retorna o status de sucesso explicitamente
      return res.status(201).json({
        mensagem: "Conta criada com sucesso!",
        id: novoUserId,
      });
    } catch (error) {
      // Se houver algum erro de syntax ou de coluna, ele vai ser impresso aqui nos logs do Render
      console.error("Erro real detetado no fluxo de Registo:", error);

      // Envia uma mensagem genérica de erro do servidor em vez de dizer que o e-mail existe
      return res
        .status(500)
        .json({ erro: "Erro interno no servidor ao processar o registo." });
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

  // 4 - Função de Atualização integrada de forma correta
  atualizarPerfil: async (req, res) => {
    // Captura os dados vindos do teu public/js/conta.js
    const { nome, data_nascimento, grupo_sanguineo, peso } = req.body;

    // Extração segura do ID do utilizador da sessão
    let utilizadorId = req.session?.userId;
    if (utilizadorId && typeof utilizadorId === "object") {
      utilizadorId = utilizadorId.id_utilizador || utilizadorId.id || utilizadorId.utilizador_id;
    }

    if (!utilizadorId) {
      return res
        .status(401)
        .json({ error: "Sessão expirada. Inicie sessão novamente." });
    }

    try {
      // 1. Vai buscar os dados atuais diretamente à tabela da Cloud
      const [linhas] = await db.query(
        "SELECT nome, data_nascimento, grupo_sanguineo, peso FROM defaultdb.Utilizador WHERE id = ?",
        [utilizadorId]
      );

      if (!linhas || linhas.length === 0) {
        return res.status(404).json({ error: "Utilizador não encontrado." });
      }

      // Sendo uma query direta no Sequelize, o resultado vem direto no primeiro índice
      const dadosAtuais = linhas[0];

      // 2. Lógica Estrita de Preservação: Se o campo do formulário vier em branco, mantém o valor atual da BD
      const nomeFinal = nome && nome.trim() !== "" ? nome.trim() : dadosAtuais.nome;
      const dataFinal = data_nascimento && data_nascimento.trim() !== "" ? data_nascimento.trim() : dadosAtuais.data_nascimento;
      const grupoFinal = grupo_sanguineo && grupo_sanguineo.trim() !== "" ? grupo_sanguineo.trim() : dadosAtuais.grupo_sanguineo;
      
      // Validação do Peso: Só altera se for digitado um número válido. Se vier vazio, mantém o antigo!
      let pesoFinal = dadosAtuais.peso;
      if (peso !== undefined && peso !== null && String(peso).trim() !== "") {
        const pesoNumerico = parseFloat(peso);
        if (!isNaN(pesoNumerico)) {
          pesoFinal = pesoNumerico;
        }
      }

      // 3. Executa o UPDATE com os valores finais validados
      const sql = `
        UPDATE defaultdb.Utilizador 
        SET nome = ?, data_nascimento = ?, grupo_sanguineo = ?, peso = ? 
        WHERE id = ?`;

      await db.query(sql, [
        nomeFinal,
        dataFinal,
        grupoFinal,
        pesoFinal,
        Number(utilizadorId)
      ]);

      return res
        .status(200)
        .json({ message: "Perfil modificado com sucesso!" });

    } catch (error) {
      console.error("Erro crítico no SQL ao atualizar perfil:", error);
      return res
        .status(500)
        .json({ error: "Erro interno ao gravar na base de dados." });
    }
  },

module.exports = authController;
