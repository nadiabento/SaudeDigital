const db = require('../config/db'); // Ligação à base de dados
const crypto = require("crypto");
const path = require("path");

/**
 * --- LISTAGENS (GET) ---
 */

exports.getUnidades = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Unidade_Saude ORDER BY nome ASC');
    res.json(rows);
  } catch (error) {
    console.error("Erro ao listar unidades:", error);
    res.status(500).json({ error: 'Erro ao obter unidades de saúde' });
  }
};

exports.getEspecialidadesDaUnidade = async (req, res) => {
  const { id_unidade } = req.params;
  try {
    const query = `
        SELECT DISTINCT e.id_especialidade, e.nome 
        FROM Especialidade e
        JOIN Medico m ON e.id_especialidade = m.id_especialidade
        WHERE m.id_unidade = ? ORDER BY e.nome ASC
    `;
    const [rows] = await db.query(query, [id_unidade]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter especialidades' });
  }
};

exports.getMedicos = async (req, res) => {
  const { id_unidade, id_especialidade } = req.params;
  try {
    const query = 'SELECT id_medico, nome FROM Medico WHERE id_unidade = ? AND id_especialidade = ? ORDER BY nome ASC';
    const [rows] = await db.query(query, [id_unidade, id_especialidade]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter médicos' });
  }
};

// Listar histórico completo de consultas do utilizador (Igual ao da Nádia)
exports.listarHistorico = async (req, res) => {
  const utilizadorId = req.session.userId || 1; // Fallback seguro
  try {
    const query = `
      SELECT 
          C.id, 
          DATE_FORMAT(C.data_hora, '%Y-%m-%dT%H:%i') AS data_hora, 
          E.nome AS especialidade, 
          M.nome AS medico,
          U.nome AS local,
          C.notas
      FROM Consulta C
      LEFT JOIN Unidade_Saude U ON C.id_unidade = U.id_unidade
      LEFT JOIN Especialidade E ON C.id_especialidade = E.id_especialidade
      LEFT JOIN Medico M ON C.id_medico = M.id_medico
      WHERE C.id_utilizador = ?
      ORDER BY C.data_hora DESC`;

    const [rows] = await db.query(query, [utilizadorId]);
    res.json(rows);
  } catch (error) {
    console.error("Erro SQL listarHistorico:", error);
    res.status(500).json({ error: "Erro interno ao carregar histórico." });
  }
};

/**
 * --- CRIAÇÃO (POST) ---
 */

// Criar nova Unidade via Modal (Equivalente ao criarCategoria)
exports.criarUnidade = async (req, res) => {
  try {
    const { nome, localizacao } = req.body;
    if (!nome) return res.status(400).json({ error: "O nome é obrigatório." });

    await db.query("INSERT INTO Unidade_Saude (nome, localizacao) VALUES (?, ?)", [nome, localizacao || ""]);
    res.status(201).json({ message: "Unidade de Saúde criada!" });
  } catch (error) {
    console.error("Erro SQL criarUnidade:", error);
    res.status(500).json({ error: error.message });
  }
};

// Criar novo Médico via Modal (Equivalente ao criarTipo)
exports.criarMedico = async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: "O nome é obrigatório." });

    // Para o modal atual que insere apenas nome de forma rápida
    await db.query("INSERT INTO Medico (nome) VALUES (?)", [nome]);
    res.status(201).json({ message: "Médico criado com sucesso!" });
  } catch (error) {
    console.error("Erro SQL criarMedico:", error);
    res.status(500).json({ error: error.message });
  }
};

/*- REGISTO PRINCIPAL DE CONSULTA -*/
exports.registarConsulta = async (req, res) => {
  const { id_unidade, id_especialidade, id_medico, data_hora, notas } = req.body;
  const utilizadorId = req.session.userId || 1;

  if (!utilizadorId) {
    return res.status(401).json({ error: "Sessão expirada. Por favor, faça login novamente." });
  }

  try {
    await db.query(
      "INSERT INTO Consulta (id_utilizador, id_unidade, id_especialidade, id_medico, data_hora, notas) VALUES (?, ?, ?, ?, ?, ?)",
      [utilizadorId, id_unidade, id_especialidade, id_medico, data_hora, notas]
    );
    res.status(200).json({ message: "Consulta guardada com sucesso!" });
  } catch (error) {
    console.error("Erro SQL registarConsulta:", error);
    res.status(500).json({ error: "Erro ao guardar consulta." });
  }
};

/**
 * --- ELIMINAR EM MASSA E EDITAR (DELETE / PUT) ---
 */

exports.eliminarMassa = async (req, res) => {
  const { ids } = req.body;
  const utilizadorId = req.session.userId || 1;

  if (!ids || ids.length === 0) {
    return res.status(400).json({ error: "Nenhuma consulta selecionada." });
  }

  try {
    const [resultado] = await db.query(
      "DELETE FROM Consulta WHERE id IN (?) AND id_utilizador = ?",
      [ids, utilizadorId]
    );
    res.json({ message: "Consultas eliminadas com sucesso!", quantidade: resultado.affectedRows });
  } catch (error) {
    console.error("Erro ao eliminar consultas:", error);
    res.status(500).json({ error: "Erro interno ao apagar da base de dados." });
  }
};

exports.editarConsulta = async (req, res) => {
  const { id } = req.params;
  const { data_hora, notas } = req.body;
  const utilizadorId = req.session.userId || 1;

  try {
    await db.query(
      "UPDATE Consulta SET data_hora = ?, notas = ? WHERE id = ? AND id_utilizador = ?",
      [data_hora, notas, id, utilizadorId]
    );
    res.json({ message: "Consulta atualizada com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar consulta." });
  }
};

/**
 * --- GERAR TOKEN DE PARTILHA ---
 */
exports.gerarPartilha = async (req, res) => {
  const { consultasIds } = req.body;
  const userId = req.session.userId || 1;

  if (!consultasIds || consultasIds.length === 0) return res.status(400).json({ error: "Nenhuma consulta selecionada." });

  const token = crypto.randomBytes(16).toString("hex");
  const expiracao = new Date();
  expiracao.setHours(expiracao.getHours() + 48);

  try {
    // Atenção: Certifica-te de que crias a tabela Partilha_Consulta na BD futuramente
    await db.query(
      "INSERT INTO Partilha_Consulta (token, consultas_ids, data_expiracao, utilizador_id) VALUES (?, ?, ?, ?)",
      [token, consultasIds.join(","), expiracao, userId]
    );
    res.json({ token: token });
  } catch (error) {
    console.error("Erro ao gravar partilha:", error);
    res.status(500).json({ error: "A Tabela Partilha_Consulta pode não existir ainda." });
  }
};