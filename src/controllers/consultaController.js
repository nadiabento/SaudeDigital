const db = require("../config/db"); // Ligação à base de dados
const crypto = require("crypto");
const path = require("path");

// Devolve a lista de todas as unidades de saúde ordenadas por nome
exports.getUnidades = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM Unidade_Saude ORDER BY nome ASC",
    );
    res.json(rows);
  } catch (error) {
    console.error("Erro ao listar unidades:", error);
    res.status(500).json({ error: "Erro ao obter unidades de saúde" });
  }
};

// Vai buscar todos os médicos à base de dados para preencher a primeira caixa do formulário
exports.getTodosMedicos = async (req, res) => {
  try {
    const query = "SELECT * FROM Medico ORDER BY nome ASC";
    const [resultados] = await db.query(query);
    res.json(resultados);
  } catch (erro) {
    console.error("Erro na BD:", erro);
    res.status(500).json({ erro: "Erro na BD" });
  }
};

// Junta a informação das Consultas, Médicos e Unidades para mostrar o histórico do utilizador atual
exports.listarHistorico = async (req, res) => {
  const utilizadorId = req.session.userId || 1; // Usa o ID 1 como segurança caso a sessão falhe
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

// Guarda uma nova unidade de saúde na base de dados (usado no pop-up)
exports.criarUnidade = async (req, res) => {
  try {
    const { nome, localizacao } = req.body;
    if (!nome) return res.status(400).json({ error: "O nome é obrigatório." });

    await db.query(
      "INSERT INTO Unidade_Saude (nome, localizacao) VALUES (?, ?)",
      [nome, localizacao || ""],
    );
    res.status(201).json({ message: "Unidade de Saúde criada!" });
  } catch (error) {
    console.error("Erro SQL criarUnidade:", error);
    res.status(500).json({ error: error.message });
  }
};

// Traz a lista de especialidades para aparecerem as opções nas caixas de seleção
exports.getTodasEspecialidades = async (req, res) => {
  try {
    const query = "SELECT * FROM Especialidade ORDER BY nome ASC";
    const [resultados] = await db.query(query);
    res.json(resultados);
  } catch (erro) {
    console.error("Erro na BD:", erro);
    res.status(500).json({ erro: "Erro na BD" });
  }
};

// MODIFICADO: Cria um médico novo e liga-o a MÚLTIPLAS unidades de saúde recebidas num Array
exports.adicionarMedico = async (req, res) => {
  // Agora desestruturamos 'unidades' (Array) em vez de 'unidade' (única)
  const { nome, especialidade, unidades } = req.body;
  const queryMedico =
    "INSERT INTO Medico (nome, id_especialidade) VALUES (?, ?)";
  const queryPonte =
    "INSERT INTO Medico_Unidade (id_medico, id_unidade) VALUES (?, ?)";

  try {
    // 1. Inserir o médico na tabela Medico
    const [resultado] = await db.query(queryMedico, [nome, especialidade]);
    const idMedicoInserido = resultado.insertId;

    // 2. Se existirem unidades selecionadas, percorremos o Array e ligamos cada uma ao médico
    if (unidades && unidades.length > 0) {
      for (const idUnidade of unidades) {
        await db.query(queryPonte, [idMedicoInserido, idUnidade]);
      }
    }

    res
      .status(201)
      .json({
        mensagem: "Médico criado com sucesso com as suas unidades!",
        id: idMedicoInserido,
      });
  } catch (erro) {
    console.error("Erro ao adicionar médico:", erro);
    res.status(500).json({ erro: "Erro no servidor." });
  }
};

// Procura e devolve apenas os locais de trabalho de um médico específico
exports.getUnidadesDoMedico = async (req, res) => {
  const idMedico = req.params.id_medico;
  const query = `
        SELECT u.id_unidade, u.nome 
        FROM Unidade_Saude u
        JOIN Medico_Unidade mu ON u.id_unidade = mu.id_unidade
        WHERE mu.id_medico = ?
        ORDER BY u.nome ASC
    `;
  try {
    const [resultados] = await db.query(query, [idMedico]);
    res.json(resultados);
  } catch (erro) {
    res.status(500).json({ erro: "Erro na BD" });
  }
};
// Recebe os dados do formulário e guarda a nova marcação para o utilizador atual
exports.registarConsulta = async (req, res) => {
  const { id_unidade, id_especialidade, id_medico, data_hora, notas } =
    req.body;
  const utilizadorId = req.session.userId || 1;

  if (!utilizadorId) {
    return res
      .status(401)
      .json({ error: "Sessão expirada. Por favor, inicie sessão novamente." });
  }

  try {
    await db.query(
      "INSERT INTO Consulta (id_utilizador, id_unidade, id_especialidade, id_medico, data_hora, notas) VALUES (?, ?, ?, ?, ?, ?)",
      [utilizadorId, id_unidade, id_especialidade, id_medico, data_hora, notas],
    );
    res.status(200).json({ message: "Consulta guardada com sucesso!" });
  } catch (error) {
    console.error("Erro SQL registarConsulta:", error);
    res.status(500).json({ error: "Erro ao guardar consulta." });
  }
};

// Apaga uma ou várias consultas de uma vez (verificar sempre se pertencem ao utilizador certo)
exports.eliminarMassa = async (req, res) => {
  const { ids } = req.body;
  const utilizadorId = req.session.userId || 1;

  if (!ids || ids.length === 0) {
    return res.status(400).json({ error: "Nenhuma consulta selecionada." });
  }

  try {
    const [resultado] = await db.query(
      "DELETE FROM Consulta WHERE id IN (?) AND id_utilizador = ?",
      [ids, utilizadorId],
    );
    res.json({
      message: "Consultas eliminadas com sucesso!",
      quantidade: resultado.affectedRows,
    });
  } catch (error) {
    console.error("Erro ao eliminar consultas:", error);
    res.status(500).json({ error: "Erro interno ao apagar da base de dados." });
  }
};

// Atualiza a data, hora e as notas de uma consulta que já existe
exports.editarConsulta = async (req, res) => {
  const { id } = req.params;
  const { data_hora, notas } = req.body;
  const utilizadorId = req.session.userId || 1;

  try {
    await db.query(
      "UPDATE Consulta SET data_hora = ?, notas = ? WHERE id = ? AND id_utilizador = ?",
      [data_hora, notas, id, utilizadorId],
    );
    res.json({ message: "Consulta atualizada com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar consulta." });
  }
};

// Cria um link temporário (válido por 48 horas) para partilhar o histórico médico
exports.gerarPartilha = async (req, res) => {
  const { consultasIds } = req.body;
  const userId = req.session.userId || 1;

  if (!consultasIds || consultasIds.length === 0)
    return res.status(400).json({ error: "Nenhuma consulta selecionada." });

  const token = crypto.randomBytes(16).toString("hex");
  const expiracao = new Date();
  expiracao.setHours(expiracao.getHours() + 48);

  try {
    await db.query(
      "INSERT INTO Partilha_Consulta (token, consultas_ids, data_expiracao, utilizador_id) VALUES (?, ?, ?, ?)",
      [token, consultasIds.join(","), expiracao, userId],
    );
    res.json({ token: token });
  } catch (error) {
    console.error("Erro ao gravar partilha:", error);
    res
      .status(500)
      .json({ error: "A Tabela de partilhas não está acessível." });
  }
};

// --- FUNÇÃO DE SEGURANÇA: Eliminar Médico Global ---
exports.eliminarMedico = async (req, res) => {
  const { id } = req.params;
  try {
    // Remove primeiro os vínculos da tabela ponte se existirem (evita bloqueios desnecessários)
    await db.execute("DELETE FROM Medico_Unidade WHERE id_medico = ?", [id]);

    const [resultado] = await db.execute(
      "DELETE FROM Medico WHERE id_medico = ?",
      [id],
    );

    if (resultado.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Médico não encontrado no sistema." });
    }
    res.json({ message: "Médico removido com sucesso!" });
  } catch (error) {
    // Código de erro 1451: O Registo está em uso numa tabela dependente (Chave Estrangeira ativa)
    if (error.errno === 1451) {
      return res.status(400).json({
        error:
          "Não pode apagar este médico. Existem consultas ou pareceres médicos arquivados em nome dele. Limpe primeiro o histórico clínico desse médico.",
      });
    }
    console.error("Erro ao eliminar médico:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
};

// --- FUNÇÃO DE SEGURANÇA: Eliminar Unidade Global ---
exports.eliminarUnidade = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM Medico_Unidade WHERE id_unidade = ?", [id]);
    const [resultado] = await db.execute(
      "DELETE FROM Unidade_Saude WHERE id_unidade = ?",
      [id],
    );

    if (resultado.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Unidade de saúde não encontrada." });
    }
    res.json({ message: "Unidade de saúde removida!" });
  } catch (error) {
    if (error.errno === 1451) {
      return res.status(400).json({
        error:
          "Impossível eliminar esta unidade. Existem consultas agendadas ou realizadas que dependem deste local. Remova ou altere essas marcações primeiro.",
      });
    }
    console.error("Erro ao eliminar unidade:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
};
