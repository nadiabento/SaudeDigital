const db = require("../config/db");

/**
 * --- LISTAGENS (GET) ---
 */

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

// Listar tipos filtrados por categoria
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

// Listar histórico completo com JOINs
exports.listarHistorico = async (req, res) => {
  try {
    const query = `
            SELECT E.id, E.data_exame AS data, TE.nome, ETE.resultado 
            FROM Exame E
            JOIN Exame_TipoExame ETE ON E.id = ETE.id_exame
            JOIN Tipo_Exame TE ON ETE.id_tipo_exame = TE.id
            ORDER BY E.data_exame DESC`;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * --- CRIAÇÃO (POST) ---
 */

// Criar nova Classe/Categoria via Modal
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

// Criar novo Tipo de Exame via Modal
exports.criarTipo = async (req, res) => {
  console.log("📥 Recebido pedido para criar tipo:", req.body);
  try {
    const { nome, id_categoria } = req.body;

    // Adicionado valor para 'descricao' caso a tua tabela exija (podes mudar para texto vazio)
    const query =
      "INSERT INTO Tipo_Exame (nome, id_categoria, descricao) VALUES (?, ?, ?)";
    await db.query(query, [nome, id_categoria, "Adicionado manualmente"]);

    res.status(201).json({ message: "Tipo criado!" });
  } catch (error) {
    console.error("Erro SQL criarTipo:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * --- REGISTO PRINCIPAL (UPLOAD) ---
 */

exports.registarExame = async (req, res) => {
  const { data_exame, observacoes, id_tipo_exame, local_realizacao } = req.body;
  const nomeFicheiro = req.file ? req.file.filename : null;

  // --- RECOLHA DO ID (Tem de ser igual ao que está no authController) ---
  const utilizadorId = req.session.userId;

  console.log("Sessão atual:", req.session); // Debug: verifica se o ID aparece no terminal

  if (!utilizadorId) {
    return res
      .status(401)
      .json({ error: "Sessão expirada. Por favor, faça login novamente." });
  }

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

// Também deves filtrar o histórico para o utilizador não ver exames de outras pessoas
exports.listarHistorico = async (req, res) => {
  const utilizadorId = req.session.userId;

  if (!utilizadorId) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const query = `
            SELECT E.id, E.data_exame AS data, TE.nome, ETE.resultado 
            FROM Exame E
            JOIN Exame_TipoExame ETE ON E.id = ETE.id_exame
            JOIN Tipo_Exame TE ON ETE.id_tipo_exame = TE.id
            WHERE E.utilizador_id = ?
            ORDER BY E.data_exame DESC`;

    const [rows] = await db.query(query, [utilizadorId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
