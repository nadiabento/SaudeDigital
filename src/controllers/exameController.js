const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

//--- LISTAGENS (GET) ---

// Listar categorias em ordem alfabética
exports.listarCategorias = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM Categoria_Exame ORDER BY nome ASC",
    );
    res.json(rows);
  } catch (error) {
    console.error("Erro ao listar categorias:", error);
    res.status(500).json({ error: "Erro ao buscar categorias" });
  }
};

// Listar tipos de exames filtrados pela categoria selecionada (Cascata)
exports.listarTiposPorCategoria = async (req, res) => {
  const { id_categoria } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT id, nome FROM Tipo_Exame WHERE id_categoria = ? ORDER BY nome ASC",
      [id_categoria],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar tipos" });
  }
};

// Listar histórico do utilizador logado (Proteção de privacidade)
exports.listarHistorico = async (req, res) => {
  const utilizadorId = req.session.userId;

  if (!utilizadorId) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const query = `
    SELECT 
        E.id, 
        DATE_FORMAT(E.data_exame, '%Y-%m-%d') AS data, 
        TE.nome, 
        ETE.resultado,
        E.observacoes
    FROM Exame E
    -- LEFT JOIN garante que o exame aparece mesmo que algo falte nas outras tabelas
    LEFT JOIN Exame_TipoExame ETE ON E.id = ETE.id_exame
    LEFT JOIN Tipo_Exame TE ON ETE.id_tipo_exame = TE.id
    WHERE E.utilizador_id = ?
    ORDER BY E.data_exame DESC`;

    const [rows] = await db.query(query, [utilizadorId]);

    res.json(rows);
  } catch (error) {
    console.error("Erro na query SQL:", error);
    res.status(500).json({ error: "Erro interno ao carregar histórico." });
  }
};

// --- PORTAL DO MÉDICO (PARTILHA EXTERNA) ---
// Serve o ficheiro HTML estático para o portal do médico
exports.visualizarPartilha = (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/partilha.html"));
};

// Busca os dados específicos de uma partilha via Token (Sem necessidade de login)
exports.getDadosPartilha = async (req, res) => {
  const { token } = req.params;

  try {
    const [partilha] = await db.query(
      "SELECT exames_ids FROM Partilha WHERE token = ? AND data_expiracao > NOW()",
      [token],
    );

    if (!partilha || partilha.length === 0) {
      return res.status(404).json({ error: "Link expirado ou inválido" });
    }

    const ids = partilha[0].exames_ids.split(",").map(Number);

    // RETIFICAÇÃO: Adicionamos E.observacoes para que o frontend as receba
    const query = `
            SELECT TE.nome, E.data_exame, E.observacoes, ETE.resultado 
            FROM Exame E 
            JOIN Exame_TipoExame ETE ON E.id = ETE.id_exame 
            JOIN Tipo_Exame TE ON ETE.id_tipo_exame = TE.id 
            WHERE E.id IN (?)`;

    const [exames] = await db.query(query, [ids]);
    res.json(exames);
  } catch (error) {
    console.error("Erro ao carregar exames da partilha:", error);
    res.status(500).json({ error: "Erro interno" });
  }
};

// --- CRIAÇÃO (POST) ---

// Criar nova Classe/Categoria
exports.criarCategoria = async (req, res) => {
  console.log("Recebido pedido para criar categoria:", req.body); // Debug no terminal
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: "O nome é obrigatório." });

    await db.query("INSERT INTO Categoria_Exame (nome) VALUES (?)", [nome]);
    res.status(201).json({ message: "Categoria criada!" });
  } catch (error) {
    console.error("Erro SQL criarCategoria:", error);
    res.status(500).json({ error: error.message });
  }
};

// Criar novo Tipo de Exame
exports.criarTipo = async (req, res) => {
  try {
    // Recebemos apenas o que existe na tabela
    const { nome, id_categoria } = req.body;

    // Verificação de segurança
    if (!nome || !id_categoria) {
      return res.status(400).json({
        error: "Dados incompletos: nome e id_categoria são obrigatórios.",
      });
    }

    // Query ajustada exatamente à tua imagem (sem a coluna 'descricao')
    const query = "INSERT INTO Tipo_Exame (nome, id_categoria) VALUES (?, ?)";

    await db.query(query, [nome, id_categoria]);

    res.status(201).json({ message: "Tipo de exame criado com sucesso!" });
  } catch (error) {
    console.error("Erro SQL ao criar tipo:", error);
    res.status(500).json({ error: "Erro ao guardar no banco de dados." });
  }
};

// Registo Principal: Guarda na tabela de Exames e na tabela de ligação (TipoExame)
exports.registarExame = async (req, res) => {
  const { data_exame, observacoes, id_tipo_exame, local_realizacao } = req.body;
  const utilizadorId = req.session.userId;

  // Validação de Data Futura
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999); // Define para o final do dia atual
  const dataEscolhida = new Date(data_exame);

  // Bloqueio de datas futuras no servidor (Segurança extra)
  if (dataEscolhida > hoje) {
    return res
      .status(400)
      .json({ error: "A data do exame não pode ser superior à data atual." });
  }

  if (!utilizadorId) {
    return res
      .status(401)
      .json({ error: "Sessão expirada. Por favor, faça login novamente." });
  }

  const nomeFicheiro = req.file ? req.file.filename : null;

  try {
    const [resultExame] = await db.query(
      "INSERT INTO Exame (data_exame, local_realizacao, observacoes, utilizador_id) VALUES (?, ?, ?, ?)",
      [
        data_exame,
        local_realizacao || "SaúdeDigital Clinic",
        observacoes,
        utilizadorId,
      ],
    );

    await db.query(
      "INSERT INTO Exame_TipoExame (id_exame, id_tipo_exame, resultado) VALUES (?, ?, ?)",
      [resultExame.insertId, id_tipo_exame, nomeFicheiro],
    );

    res.status(200).json({ message: "Exame guardado com sucesso!" });
  } catch (error) {
    console.error("Erro SQL:", error);
    res.status(500).json({ error: "Erro ao guardar exame." });
  }
};

//--- MANUTENÇÃO (PUT, DELETE, SHARE) ---

exports.editarExame = async (req, res) => {
  const { id } = req.params;
  const { data_exame, observacoes } = req.body;
  const utilizadorId = req.session.userId;

  try {
    await db.query(
      "UPDATE Exame SET data_exame = ?, observacoes = ? WHERE id = ? AND utilizador_id = ?",
      [data_exame, observacoes, id, utilizadorId],
    );
    res.json({ message: "Exame atualizado com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar exame." });
  }
};

exports.eliminarMassa = async (req, res) => {
  const { ids } = req.body;
  const utilizadorId = req.session.userId;

  if (!utilizadorId) {
    return res
      .status(401)
      .json({ error: "Sessão expirada. Faça login novamente." });
  }

  if (!ids || ids.length === 0) {
    return res.status(400).json({ error: "Nenhum exame selecionado." });
  }

  try {
    // 1. Procurar os nomes dos ficheiros PDF para apagar do disco
    const [ficheiros] = await db.query(
      "SELECT resultado FROM Exame_TipoExame WHERE id_exame IN (?)",
      [ids],
    );

    // 2. Apagar primeiro da tabela Exame_TipoExame (tabela filha)
    await db.query("DELETE FROM Exame_TipoExame WHERE id_exame IN (?)", [ids]);

    // 3. Apagar da tabela Exame (tabela pai), validando o dono
    const [resultado] = await db.query(
      "DELETE FROM Exame WHERE id IN (?) AND utilizador_id = ?",
      [ids, utilizadorId],
    );

    // 4. Remover os ficheiros físicos da pasta uploads
    if (resultado.affectedRows > 0) {
      ficheiros.forEach((f) => {
        if (f.resultado) {
          const caminhoFicheiro = path.join(
            __dirname,
            "../../public/uploads/",
            f.resultado,
          );
          if (fs.existsSync(caminhoFicheiro)) {
            fs.unlinkSync(caminhoFicheiro);
          }
        }
      });
    }

    res.json({
      message: "Eliminado com sucesso!",
      quantidade: resultado.affectedRows,
    });
  } catch (error) {
    console.error("Erro ao eliminar:", error);
    res.status(500).json({ error: "Erro interno ao apagar da base de dados." });
  }
};

// --- GERAR TOKEN DE PARTILHA (Lógica Simplificada) ---
exports.gerarPartilha = async (req, res) => {
  // 1. Pegar os IDs que vêm do Frontend (repara que o nome deve coincidir: examesIds)
  const { examesIds } = req.body;
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ error: "Sessão expirada." });
  if (!examesIds || examesIds.length === 0)
    return res.status(400).json({ error: "Nenhum exame selecionado." });

  // 2. Gerar um Token seguro e único
  const token = crypto.randomBytes(16).toString("hex");

  // 3. Definir a validade (48 horas a partir de AGORA)
  const expiracao = new Date();
  expiracao.setHours(expiracao.getHours() + 48);

  try {
    // 4. GRAVAR NA BASE DE DADOS (O passo que faltava!)
    // Transformamos o array [1,2,3] numa string "1,2,3" para caber no campo TEXT
    await db.query(
      "INSERT INTO Partilha (token, exames_ids, data_expiracao, utilizador_id) VALUES (?, ?, ?, ?)",
      [token, examesIds.join(","), expiracao, userId],
    );

    // 5. Retornar o token real para o Frontend
    res.json({ token: token });
  } catch (error) {
    console.error("Erro ao gravar partilha:", error);
    res.status(500).json({ error: "Erro interno ao gerar link de partilha." });
  }
};
