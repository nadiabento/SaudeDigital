const db = require("../config/db");

const Exame = {
  // --- LISTAGENS ---
  listarCategorias: async () => {
    const [rows] = await db.query(
      "SELECT * FROM Categoria_Exame ORDER BY nome ASC",
    );
    return rows;
  },

  listarTiposPorCategoria: async (id_categoria) => {
    const [rows] = await db.query(
      "SELECT id, nome FROM Tipo_Exame WHERE id_categoria = ? ORDER BY nome ASC",
      [id_categoria],
    );
    return rows;
  },

  listarHistorico: async (utilizadorId) => {
    const query = `
      SELECT E.id, DATE_FORMAT(E.data_exame, '%Y-%m-%d') AS data, 
             TE.nome, ETE.resultado, E.observacoes
      FROM Exame E
      LEFT JOIN Exame_TipoExame ETE ON E.id = ETE.id_exame
      LEFT JOIN Tipo_Exame TE ON ETE.id_tipo_exame = TE.id
      WHERE E.utilizador_id = ?
      ORDER BY E.data_exame DESC`;
    const [rows] = await db.query(query, [utilizadorId]);
    return rows;
  },

  // --- CRIAÇÃO ---
  criarCategoria: async (nome) => {
    return await db.query("INSERT INTO Categoria_Exame (nome) VALUES (?)", [
      nome,
    ]);
  },

  criarTipo: async (nome, id_categoria) => {
    return await db.query(
      "INSERT INTO Tipo_Exame (nome, id_categoria) VALUES (?, ?)",
      [nome, id_categoria],
    );
  },

  registarCompleto: async (data, local, obs, userId, tipoId, resultado) => {
    const [res] = await db.query(
      "INSERT INTO Exame (data_exame, local_realizacao, observacoes, utilizador_id) VALUES (?, ?, ?, ?)",
      [data, local, obs, userId],
    );
    const exameId = res.insertId;
    await db.query(
      "INSERT INTO Exame_TipoExame (id_exame, id_tipo_exame, resultado) VALUES (?, ?, ?)",
      [exameId, tipoId, resultado],
    );
    return exameId;
  },

  // --- MANUTENÇÃO ---
  editar: async (id, data, obs, userId) => {
    return await db.query(
      "UPDATE Exame SET data_exame = ?, observacoes = ? WHERE id = ? AND utilizador_id = ?",
      [data, obs, id, userId],
    );
  },

  buscarFicheiros: async (ids) => {
    const [rows] = await db.query(
      "SELECT resultado FROM Exame_TipoExame WHERE id_exame IN (?)",
      [ids],
    );
    return rows;
  },

  eliminarMassa: async (ids, userId) => {
    await db.query("DELETE FROM Exame_TipoExame WHERE id_exame IN (?)", [ids]);
    const [res] = await db.query(
      "DELETE FROM Exame WHERE id IN (?) AND utilizador_id = ?",
      [ids, userId],
    );
    return res;
  },

  // --- PARTILHA ---
  salvarPartilha: async (token, ids, expiracao, userId) => {
    return await db.query(
      "INSERT INTO Partilha (token, exames_ids, data_expiracao, utilizador_id) VALUES (?, ?, ?, ?)",
      [token, ids, expiracao, userId],
    );
  },

  getDadosPartilha: async (token) => {
    const [partilha] = await db.query(
      "SELECT exames_ids FROM Partilha WHERE token = ? AND data_expiracao > NOW()",
      [token],
    );
    return partilha;
  },

  buscarExamesPorIds: async (ids) => {
    const query = `
      SELECT TE.nome, E.data_exame, E.observacoes, ETE.resultado 
      FROM Exame E 
      JOIN Exame_TipoExame ETE ON E.id = ETE.id_exame 
      JOIN Tipo_Exame TE ON ETE.id_tipo_exame = TE.id 
      WHERE E.id IN (?)`;
    const [rows] = await db.query(query, [ids]);
    return rows;
  },
};

module.exports = Exame;
