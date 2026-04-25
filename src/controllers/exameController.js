const db = require("../config/db");

// 1. Listar todas as categorias para o primeiro Select
exports.listarCategorias = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM Categoria_Exame ORDER BY nome ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar categorias" });
  }
};

// 2. Listar tipos de exame baseados na categoria (Filtro para o Autocomplete)
exports.listarTiposPorCategoria = async (req, res) => {
  const { id_categoria } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT id, nome, descricao FROM Tipo_Exame WHERE id_categoria = ? ORDER BY nome ASC",
      [id_categoria],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar tipos de exame" });
  }
};

exports.listarHistorico = async (req, res) => {
  try {
    const query = `
            SELECT 
                E.id, 
                E.data_exame AS data, 
                TE.nome,
                ETE.resultado  -- <--- FALTA ESTA COLUNA AQUI!
            FROM Exame E
            JOIN Exame_TipoExame ETE ON E.id = ETE.id_exame
            JOIN Tipo_Exame TE ON ETE.id_tipo_exame = TE.id
            ORDER BY E.data_exame DESC
        `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error("❌ Erro na Query:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.registarExame = async (req, res) => {
  const {
    data_exame,
    observacoes,
    id_tipo_exame,
    local_realizacao,
    utilizador_id,
  } = req.body;
  const nomeFicheiro = req.file ? req.file.filename : null;

  try {
    // 1. Inserir na tabela Exame
    const [resultExame] = await db.query(
      "INSERT INTO Exame (data_exame, local_realizacao, observacoes, utilizador_id) VALUES (?, ?, ?, ?)",
      [data_exame, local_realizacao, observacoes, utilizador_id || 1],
    );

    const novoExameId = resultExame.insertId;

    // 2. Ligar ao Tipo de Exame e guardar o nome do PDF (resultado)
    await db.query(
      "INSERT INTO Exame_TipoExame (id_exame, id_tipo_exame, resultado) VALUES (?, ?, ?)",
      [novoExameId, id_tipo_exame, nomeFicheiro],
    );

    res.json({ message: "Exame e PDF guardados com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao guardar no servidor." });
  }
};
