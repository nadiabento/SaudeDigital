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
