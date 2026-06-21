const db = require("../config/db"); // Puxa a nossa ligação à BD que configurámos com o Sequelize
const { QueryTypes } = require("sequelize"); // Atalho para não ter de escrever sempre db.sequelize.QueryTypes
const crypto = require("crypto"); // Biblioteca nativa para gerar os tokens de partilha

// ============================================================================
// --- LEITURAS E LISTAGENS (GET) ---
// ============================================================================

// Vai buscar todas as unidades de saúde à BD por ordem alfabética para os selects
exports.getUnidades = async (req, res) => {
  try {
    const rows = await db.sequelize.query(
      "SELECT id_unidade, nome, localizacao FROM Unidade_Saude ORDER BY nome ASC",
      { type: QueryTypes.SELECT }
    );
    res.json(rows);
  } catch (error) {
    console.error("Erro ao listar unidades:", error);
    res.status(500).json({ error: "Erro ao obter unidades de saúde" });
  }
};

  // Carrega os médicos todos para preencher a primeira caixinha do formulári
  exports.getTodosMedicos = async (req, res) => {
  try {
    const resultados = await db.sequelize.query(
      "SELECT id_medico, nome, id_especialidade FROM Medico ORDER BY nome ASC",
      { type: QueryTypes.SELECT }
    );
    res.json(resultados);
  } catch (erro) {
    console.error("Erro na BD ao buscar médicos:", erro);
    res.status(500).json({ erro: "Erro na BD" });
  }
};

  // Faz os JOINS todos para montar a tabela do histórico com o que o utilizador precisa de ver
  exports.listarHistorico = async (req, res) => {
  const utilizadorId = req.session?.userId; 

  // Se não houver sessão ativa, barra logo aqui para dar erro de autenticação
  if (!utilizadorId) {
    return res.status(401).json({ error: "Utilizador não autenticado. Por favor, faça login." });
  }

  try {
    // Query para cruzar as tabelas e formatar a data direitinha para o ecrã
    const query = `
      SELECT 
          C.id, 
          DATE_FORMAT(C.data_hora, '%Y-%m-%dT%H:%i') AS data_hora, 
          E.nome AS especialidade, 
          M.nome AS medico,
          U.nome AS local,
          C.notas AS notas -- Mapeamento rigoroso do campo em português do vosso Workbench
      FROM Consulta C
      LEFT JOIN Unidade_Saude U ON C.id_unidade = U.id_unidade
      LEFT JOIN Especialidade E ON C.id_especialidade = E.id_especialidade
      LEFT JOIN Medico M ON C.id_medico = M.id_medico
      WHERE C.id_utilizador = ?
      ORDER BY C.data_hora DESC`;

    const rows = await db.sequelize.query(query, {
      replacements: [utilizadorId],
      type: QueryTypes.SELECT
    });
    res.json(rows);
  } catch (error) {
    console.error("Erro SQL listarHistorico:", error);
    res.status(500).json({ error: "Erro interno ao carregar histórico." });
  }
};

// Traz as especialidades todas da BD para pôr nas listas de escolha
exports.getTodasEspecialidades = async (req, res) => {
  try {
    const resultados = await db.sequelize.query(
      "SELECT id_especialidade, nome FROM Especialidade ORDER BY nome ASC",
      { type: QueryTypes.SELECT }
    );
    res.json(resultados);
  } catch (erro) {
    console.error("Erro na BD ao buscar especialidades:", erro);
    res.status(500).json({ erro: "Erro na BD" });
  }
};

// Filtra e devolve só os hospitais/clínicas onde um determinado médico trabalha
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
    const resultados = await db.sequelize.query(query, {
      replacements: [idMedico],
      type: QueryTypes.SELECT
    });
    res.json(resultados);
  } catch (erro) {
    res.status(500).json({ erro: "Erro na BD" });
  }
};

// Puxa a lista de medicamentos do catálogo oficial por ordem de nome 
exports.getCatalogoMedicamentos = async (req, res) => {
  try {
    const medicamentos = await db.sequelize.query(
      "SELECT id, nome_medicamento, substancia_ativa FROM Catalogo_Medicamentos ORDER BY nome_medicamento ASC",
      { type: QueryTypes.SELECT }
    );
    res.json(medicamentos);
  } catch (error) {
    console.error("Erro ao carregar catálogo de medicamentos:", error);
    res.status(500).json({ error: "Erro ao obter catálogo." });
  }
};

// Vai buscar as medicações que foram passadas especificamente na consulta selecionada
exports.getMedicamentosDaConsulta = async (req, res) => {
  const { id } = req.params; 
  try {
    const rows = await db.sequelize.query(
      `SELECT M.id, CM.nome_medicamento, M.posologia 
       FROM Medicamento M
       JOIN Catalogo_Medicamentos CM ON M.id_catalogo_medicamento = CM.id 
       WHERE M.id_consulta = ?`,
      { replacements: [id], type: QueryTypes.SELECT }
    );
    res.json(rows);
  } catch (error) {
    console.error("Erro ao obter medicações vinculadas à consulta:", error);
    res.status(500).json({ error: "Erro ao obter medicações vinculadas." });
  }
};


// --- ESCRITA E CRIAÇÃO (POST / PUT) ---

// Insere a nova consulta e, se o utilizador preencher a receita opcional, guarda-a também
exports.registarConsulta = async (req, res) => {
  const { id_unidade, id_especialidade, id_medico, data_hora, notas, receita } = req.body;
  const utilizadorId = req.session?.userId;

  if (!utilizadorId) {
    return res.status(401).json({ error: "Sessão expirada. Por favor, inicie sessão novamente." });
  }

  try {
    // Passo 1: Cria o registo principal da consulta na tabela
    const resultadoConsulta = await db.sequelize.query(
      "INSERT INTO Consulta (id_utilizador, id_unidade, id_especialidade, id_medico, data_hora, notas) VALUES (?, ?, ?, ?, ?, ?)",
      {
        replacements: [utilizadorId, id_unidade, id_especialidade, id_medico, data_hora, notas],
        type: QueryTypes.INSERT
      }
    );
    
    const idConsultaGerado = resultadoConsulta[0];

    // Passo 2: Se o utilizador anexou um medicamento no formulário, faz o insert na tabela de medicação ativa
    if (receita && receita.id_catalogo_medicamento) {
      await db.sequelize.query(
        "INSERT INTO Medicamento (id_utilizador, id_catalogo_medicamento, posologia, data_inicio, data_fim, estado, id_consulta) VALUES (?, ?, ?, ?, ?, 'Ativo', ?)",
        {
          replacements: [
            utilizadorId,
            receita.id_catalogo_medicamento,
            receita.posologia,
            receita.data_inicio,
            receita.data_fim,
            idConsultaGerado
          ],
          type: QueryTypes.INSERT
        }
      );
    }

    res.status(200).json({ message: "Consulta e receita guardadas com sucesso!" });
  } catch (error) {
    console.error("Erro SQL registarConsulta com receita:", error);
    res.status(500).json({ error: "Erro ao guardar consulta." });
  }
};

// Guarda uma nova unidade de saúde na base de dados (usado no pop-up)
exports.criarUnidade = async (req, res) => {
  try {
    const { nome, localizacao } = req.body;
    if (!nome) return res.status(400).json({ error: "O nome é obrigatório." });

    await db.sequelize.query(
      "INSERT INTO Unidade_Saude (nome, localizacao) VALUES (?, ?)",
      {
        replacements: [nome, localizacao || ""],
        type: QueryTypes.INSERT
      }
    );
    res.status(201).json({ message: "Unidade de Saúde criada!" });
  } catch (error) {
    console.error("Erro SQL criarUnidade:", error);
    res.status(500).json({ error: error.message });
  }
};

// Insere um médico novo e faz um ciclo para mapear todos os locais onde ele dá consulta na tabela ponte
exports.adicionarMedico = async (req, res) => {
  const { nome, especialidade, unidades } = req.body;

  try {
    // 1. Inserir o médico na tabela Medico
    const resultado = await db.sequelize.query(
      "INSERT INTO Medico (nome, id_especialidade) VALUES (?, ?)",
      {
        replacements: [nome, especialidade],
        type: QueryTypes.INSERT
      }
    );
    const idMedicoInserido = resultado[0];

    // 2. Se existirem unidades selecionadas, percorremos o Array e ligamos cada uma ao médico na tabela ponte
    if (unidades && unidades.length > 0) {
      for (const idUnidade of unidades) {
        await db.sequelize.query(
          "INSERT INTO Medico_Unidade (id_medico, id_unidade) VALUES (?, ?)",
          {
            replacements: [idMedicoInserido, idUnidade],
            type: QueryTypes.INSERT
          }
        );
      }
    }

    res.status(201).json({
      mensagem: "Médico criado com sucesso com as suas unidades!",
      id: idMedicoInserido,
    });
  } catch (erro) {
    console.error("Erro ao adicionar médico:", erro);
    res.status(500).json({ erro: "Erro no servidor." });
  }
};

// Atualiza a data, hora e as notas de uma consulta que já existe
exports.editarConsulta = async (req, res) => {
  const { id } = req.params;
  const { data_hora, notas } = req.body;
  const utilizadorId = req.session?.userId;

  if (!utilizadorId) {
    return res.status(401).json({ error: "Sessão expirada para esta alteração." });
  }

  try {
    await db.sequelize.query(
      "UPDATE Consulta SET data_hora = ?, notas = ? WHERE id = ? AND id_utilizador = ?",
      {
        replacements: [data_hora, notas, id, utilizadorId],
        type: QueryTypes.UPDATE
      }
    );
    res.json({ message: "Consulta updated com sucesso!" });
  } catch (error) {
    console.error("Erro ao editar consulta:", error);
    res.status(500).json({ error: "Erro ao atualizar consulta." });
  }
};

  //Associa um medicamento novo diretamente a uma consulta através do modal de histórico clínico
  exports.vincularMedicamentoAConsulta = async (req, res) => {
  const idConsulta = req.params.id;
  const { id_catalogo_medicamento, posologia, data_inicio, data_fim } = req.body;
  const utilizadorId = req.session?.userId;

  if (!utilizadorId) {
    return res.status(401).json({ error: "Sessão expirada para vincular medicação." });
  }

  try {
    await db.sequelize.query(
      `INSERT INTO Medicamento (id_utilizador, id_catalogo_medicamento, posologia, data_inicio, data_fim, estado, id_consulta) 
       VALUES (?, ?, ?, ?, ?, 'Ativo', ?)`,
      {
        replacements: [utilizadorId, id_catalogo_medicamento, posologia, data_inicio || null, data_fim || null, idConsulta],
        type: QueryTypes.INSERT
      }
    );
    res.status(201).json({ message: "Medicamento associado com sucesso!" });
  } catch (error) {
    console.error("Erro ao vincular medicação à consulta realizada:", error);
    res.status(500).json({ error: "Erro ao vincular medicação." });
  }
};

// Cria um link temporário (válido por 48 horas) para partilhar o histórico médico
exports.gerarPartilha = async (req, res) => {
  const { consultasIds } = req.body;
  const userId = req.session?.userId;

  if (!userId) return res.status(401).json({ error: "Sessão inválida." });
  if (!consultasIds || consultasIds.length === 0)
    return res.status(400).json({ error: "Nenhuma consulta selecionada." });

  const token = crypto.randomBytes(16).toString("hex");
  const expiracao = new Date();
  expiracao.setHours(expiracao.getHours() + 48);

  try {
    await db.sequelize.query(
      "INSERT INTO Partilha_Consulta (token, consultas_ids, data_expiracao, utilizador_id) VALUES (?, ?, ?, ?)",
      {
        replacements: [token, consultasIds.join(","), expiracao, userId],
        type: QueryTypes.INSERT
      }
    );
    res.json({ token: token });
  } catch (error) {
    console.error("Erro ao gravar partilha:", error);
    res.status(500).json({ error: "A Tabela de partilhas não está accessible." });
  }
};


// ============================================================================
// --- REMOÇÕES E ELIMINAÇÕES (DELETE) ---
// ============================================================================

// Apaga uma ou várias consultas de uma vez validando o utilizador dono
exports.eliminarMassa = async (req, res) => {
  const { ids } = req.body;
  const utilizadorId = req.session?.userId;

  if (!utilizadorId) return res.status(401).json({ error: "Não autorizado." });
  if (!ids || ids.length === 0) {
    return res.status(400).json({ error: "Nenhuma consulta selecionada." });
  }

  try {
    await db.sequelize.query(
      "DELETE FROM Consulta WHERE id IN (?) AND id_utilizador = ?",
      {
        replacements: [ids, utilizadorId],
        type: QueryTypes.DELETE
      }
    );
    res.json({ message: "Consultas eliminadas com sucesso!" });
  } catch (error) {
    console.error("Erro ao eliminar consultas:", error);
    res.status(500).json({ error: "Erro interno ao apagar da base de dados." });
  }
};

// Desvincular/remover o medicamento associado à consulta de dentro do modal
exports.eliminarMedicamentoVinculado = async (req, res) => {
  const { id } = req.params; 
  try {
    await db.sequelize.query("DELETE FROM Medicamento WHERE id = ?", {
      replacements: [id],
      type: QueryTypes.DELETE
    });
    res.json({ message: "Vínculo de medicação removido com sucesso." });
  } catch (error) {
    console.error("Erro ao desvincular medicamento da consulta:", error);
    res.status(500).json({ error: "Erro ao desvincular medicação." });
  }
};

// Eliminar Médico Global do sistema com tratamento de Foreign Keys (Erro 1451)
exports.eliminarMedico = async (req, res) => {
  const { id } = req.params;
  try {
    await db.sequelize.query("DELETE FROM Medico_Unidade WHERE id_medico = ?", {
      replacements: [id],
      type: QueryTypes.DELETE
    });

    await db.sequelize.query("DELETE FROM Medico WHERE id_medico = ?", {
      replacements: [id],
      type: QueryTypes.DELETE
    });

    res.json({ message: "Médico removido com sucesso!" });
  } catch (error) {
    if (error.parent && error.parent.errno === 1451) {
      return res.status(400).json({
        error: "Não pode apagar este médico. Existem consultas ou pareceres médicos arquivados em nome dele. Limpe primeiro o histórico clínico desse médico.",
      });
    }
    console.error("Erro ao eliminar médico:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
};

// Eliminar Unidade Global do sistema com tratamento de Foreign Keys (Erro 1451)
exports.eliminarUnidade = async (req, res) => {
  const { id } = req.params;
  try {
    await db.sequelize.query("DELETE FROM Medico_Unidade WHERE id_unidade = ?", {
      replacements: [id],
      type: QueryTypes.DELETE
    });

    await db.sequelize.query("DELETE FROM Unidade_Saude WHERE id_unidade = ?", {
      replacements: [id],
      type: QueryTypes.DELETE
    });

    res.json({ message: "Unidade de saúde removida!" });
  } catch (error) {
    if (error.parent && error.parent.errno === 1451) {
      return res.status(400).json({
        error: "Impossível eliminar esta unidade. Existem consultas agendadas ou realizadas que dependem deste local. Remova ou altere essas marcações primeiro.",
      });
    }
    console.error("Erro ao eliminar unidade:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
};

exports.visualizarPartilha = async (req, res) => {
  const { token } = req.params;

  try {
    const partilha = await db.sequelize.query(
      `SELECT *
       FROM Partilha_Consulta
       WHERE token = ?
       AND data_expiracao > NOW()`,
      {
        replacements: [token],
        type: QueryTypes.SELECT
      }
    );

    if (partilha.length === 0) {
      return res.send(`
        <h1>Link inválido ou expirado</h1>
      `);
    }

    const ids = partilha[0].consultas_ids
      .split(",")
      .map(id => parseInt(id));

    const consultas = await db.sequelize.query(
      `
      SELECT
        C.data_hora,
        E.nome AS especialidade,
        M.nome AS medico,
        U.nome AS local,
        C.notas
      FROM Consulta C
      LEFT JOIN Especialidade E
        ON C.id_especialidade = E.id_especialidade
      LEFT JOIN Medico M
        ON C.id_medico = M.id_medico
      LEFT JOIN Unidade_Saude U
        ON C.id_unidade = U.id_unidade
      WHERE C.id IN (?)
      ORDER BY C.data_hora DESC
      `,
      {
        replacements: [ids],
        type: QueryTypes.SELECT
      }
    );

      let html = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">

      <title>Consultas Partilhadas</title>

      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

      <style>

      body{
          background:#f5f7fb;
      }

      .hero{
          background:linear-gradient(135deg,#0d6efd,#4f8cff);
          color:white;
          padding:40px;
          border-radius:20px;
          margin-bottom:25px;
      }

      .consulta-card{
          border:none;
          border-radius:18px;
          box-shadow:0 4px 20px rgba(0,0,0,.08);
      }

      .label{
          color:#6c757d;
          font-size:.85rem;
          font-weight:600;
          text-transform:uppercase;
      }

      .valor{
          font-size:1rem;
          font-weight:500;
      }

      </style>

      </head>

      <body>

      <div class="container py-5">

          <div class="hero">
              <h1 class="fw-bold mb-2">
                  Histórico Clínico Partilhado
              </h1>

              <p class="mb-0">
                  Informação disponibilizada temporariamente pelo paciente.
              </p>
          </div>
      `;

    consultas.forEach(c => {
    html += `
<div class="card consulta-card mb-4">

    <div class="card-body p-4">

        <h4 class="text-primary fw-bold mb-4">
            ${c.especialidade}
        </h4>

        <div class="mb-3">
            <div class="label">Médico</div>
            <div class="valor">${c.medico}</div>
        </div>

        <div class="mb-3">
            <div class="label">Unidade de Saúde</div>
            <div class="valor">${c.local}</div>
        </div>

        <div class="mb-3">
            <div class="label">Data da Consulta</div>
            <div class="valor">
                ${new Date(c.data_hora).toLocaleString("pt-PT")}
            </div>
        </div>

        <div>
            <div class="label">Notas Médicas</div>
            <div class="valor">
                ${c.notas || "Sem notas médicas registadas"}
            </div>
        </div>

    </div>

</div>
`;
    });

    html += `
            </div>
          </div>
        </div>

      </body>
      </html>
    `;

    res.send(html);

  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao abrir partilha.");
  }
};

//Endpoint para criar Especialidade 
exports.criarEspecialidade = async (req, res) => {

  const { nome } = req.body;

  try {

    await db.sequelize.query(
      "INSERT INTO Especialidade (nome) VALUES (?)",
      {
        replacements: [nome],
        type: QueryTypes.INSERT
      }
    );

    res.json({
      sucesso: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Erro ao criar especialidade"
    });

  }
};