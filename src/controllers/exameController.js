const { Exame, TipoExame, ExameTipoExame } = require("../models/Exame");
const CategoriaExame = require("../models/CategoriaExame");
const sequelize = require("../config/db"); // Importação da ligação para gerir transações
const fs = require("node:fs");
const path = require("node:path");
const { Op } = require("sequelize");
const crypto = require("node:crypto");

// =========================================================================
// --- 1. LISTAGENS E FILTROS EM CASCATA (PÁGINA INICIAL E CONTA)        ---
// =========================================================================

// Devolve todas as categorias ordenadas por nome (Preenche a primeira combobox)
exports.listarCategorias = async (req, res) => {
  try {
    const categorias = await CategoriaExame.findAll({
      order: [["nome", "ASC"]],
    });
    res.json(categorias);
  } catch (error) {
    console.error("Erro ao listar categorias:", error);
    res.status(500).json({ error: "Erro ao listar categorias." });
  }
};

// Devolve os subtipos filtrados pela categoria pai selecionada (Cascata dinâmica)
exports.listarTiposPorCategoria = async (req, res) => {
  try {
    const tipos = await TipoExame.findAll({
      where: { id_categoria: req.params.id_categoria },
      order: [["nome", "ASC"]],
    });
    res.json(tipos);
  } catch (error) {
    console.error("Erro ao listar tipos por categoria:", error);
    res.status(500).json({ error: "Erro ao listar tipos por categoria." });
  }
};

// Devolve todos os tipos de exames globais sem filtro de pai (Usado no conta.html)
exports.listarTodosOsTiposAgnostico = async (req, res) => {
  try {
    const tipos = await TipoExame.findAll({ order: [["nome", "ASC"]] });
    res.json(tipos);
  } catch (error) {
    console.error("Erro ao listar tipos globais:", error);
    res.status(500).json({ error: "Erro ao listar tipos globais." });
  }
};

// Lista o histórico de exames do utilizador logado com paginação e JOINs nativos
exports.listarHistorico = async (req, res) => {
  const utilizadorId = req.session.userId || 1; // ID 1 como segurança caso a sessão falhe
  const pagina = Number.parseInt(req.query.page) || 1;
  const limite = 10; // Total de registos por página
  const offset = (pagina - 1) * limite;

  try {
    const { rows, count } = await Exame.findAndCountAll({
      where: { utilizador_id: utilizadorId },
      distinct: true, // Garante a contagem real de cabeçalhos sem duplicar pelo JOIN N:N
      order: [["data_exame", "DESC"]],
      limit: limite,
      offset: offset,
      include: [
        {
          model: TipoExame,
          attributes: ["nome"],
          through: { attributes: ["resultado"] }, // Puxa o nome do PDF guardado na tabela ponte
        },
      ],
    });

    // Formata os dados para o formato exato que o teu JavaScript antigo do frontend já processava
    const examesFormatados = rows.map((ex) => {
      const tipo = ex.TipoExames?.[0];
      return {
        id: ex.id,
        data: ex.data_exame,
        nome: tipo ? tipo.nome : "Não especificado",
        resultado: tipo?.ExameTipoExame ? tipo.ExameTipoExame.resultado : null,
        observacoes: ex.observacoes || "",
      };
    });

    res.json({
      exames: examesFormatados,
      totalPaginas: Math.ceil(count / limite),
      paginaAtual: pagina,
    });
  } catch (error) {
    console.error("Erro ao carregar histórico com Sequelize:", error);
    res
      .status(500)
      .json({ error: "Erro interno ao carregar o histórico clínico." });
  }
};

// =========================================================================
// --- 2. OPERAÇÕES DE CRIAÇÃO E REGISTO (POST)                          ---
// =========================================================================

// Guarda um novo exame e associa-o aos ficheiros PDF carregados pelo Multer
exports.registarExame = async (req, res) => {
  const { data_exame, local_realizacao, observacoes, id_tipo_exame } = req.body;

  // 1. EXTRAÇÃO BLINDADA DO ID DO UTILIZADOR
  let rawUserId = req.session.userId;
  let finalUserId = null;

  if (rawUserId) {
    if (typeof rawUserId === "object") {
      finalUserId =
        rawUserId.id_utilizador || rawUserId.id || rawUserId.utilizador_id;
    } else if (
      typeof rawUserId === "string" &&
      rawUserId !== "[object Object]"
    ) {
      finalUserId = parseInt(rawUserId, 10);
    }
  }

  if (!finalUserId || isNaN(finalUserId)) {
    console.warn(
      "Aviso: req.session.userId inválido ou corrompido, usando ID 1 como fallback.",
    );
    finalUserId = 1; // Fallback seguro para testes
  }

  if (!data_exame || !id_tipo_exame) {
    return res
      .status(400)
      .json({ error: "A data e o tipo de exame são obrigatórios." });
  }

  // 2. CAPTURA DOS DOIS FICHEIROS COM SEGURANÇA
  const ficheiroExame =
    req.files && req.files["resultado_file"] && req.files["resultado_file"][0]
      ? req.files["resultado_file"][0].filename
      : null;

  const ficheiroRelatorio =
    req.files && req.files["relatorio"] && req.files["relatorio"][0]
      ? req.files["relatorio"][0].filename
      : null;

  // Inicializa a transação nativa do Sequelize (Muito mais seguro!)
  const t = await Exame.sequelize.transaction();

  try {
    // 1. Inserção na tabela principal 'Exame' usando o ORM do Sequelize
    const novoExame = await Exame.create(
      {
        data_exame,
        local_realizacao: local_realizacao || "SaúdeDigital Clinic",
        observacoes,
        utilizador_id: Number(finalUserId),
      },
      { transaction: t },
    );

    // 2. Inserção na tabela ponte 'Exame_TipoExame' incluindo os nomes dos dois ficheiros
    await ExameTipoExame.create(
      {
        id_exame: novoExame.id,
        id_tipo_exame: Number(id_tipo_exame),
        resultado: ficheiroExame, // O PDF do exame em si
        relatorio: ficheiroRelatorio, // O PDF com o parecer do médico
      },
      { transaction: t },
    );

    await t.commit();

    res
      .status(200)
      .json({ message: "Exame e relatórios guardados com sucesso via ORM!" });
  } catch (error) {
    await t.rollback();
    console.error("Erro ao registar exame (Transaction Rollback):", error);

    // Limpeza física dos ficheiros caso a BD falhe (Evita lixo no servidor)
    [ficheiroExame, ficheiroRelatorio].forEach((nomeFicheiro) => {
      if (nomeFicheiro) {
        const caminho = path.join(
          __dirname,
          "../../public/uploads/",
          nomeFicheiro,
        );
        if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
      }
    });

    res.status(500).json({ error: "Erro interno ao submeter o exame." });
  }
};

// Cria uma nova categoria de exame (Via Modal do formulário)
exports.criarCategoria = async (req, res) => {
  try {
    const nova = await CategoriaExame.create({ nome: req.body.nome });
    res.status(201).json(nova);
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    res.status(500).json({ error: "Erro ao criar categoria." });
  }
};

// Cria um novo subtipo de exame (Via Modal do formulário)
exports.criarTipo = async (req, res) => {
  try {
    const novo = await TipoExame.create({
      nome: req.body.nome,
      id_categoria: req.body.id_categoria,
    });
    res.status(201).json(novo);
  } catch (error) {
    console.error("Erro ao criar tipo:", error);
    res.status(500).json({ error: "Erro ao criar tipo de exame." });
  }
};

// =========================================================================
// --- 3. OPERAÇÕES DE EDIÇÃO E MANUTENÇÃO (PUT)                         ---
// =========================================================================

// Atualiza os dados editáveis de um exame existente
exports.editarExame = async (req, res) => {
  const { data_exame, observacoes } = req.body;
  const utilizadorId = req.session.userId || 1;

  try {
    const [atualizados] = await Exame.update(
      { data_exame, observacoes },
      { where: { id: req.params.id, utilizador_id: utilizadorId } },
    );

    if (atualizados === 0) {
      return res
        .status(404)
        .json({ error: "Exame não encontrado ou sem permissão." });
    }
    res.json({ message: "Exame atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao editar exame:", error);
    res.status(500).json({ error: "Erro ao editar o registo." });
  }
};

// =========================================================================
// --- 4. OPERAÇÕES DE REMOÇÃO PROTEGIDA (DELETE)                        ---
// =========================================================================

// Eliminação em massa a partir dos checkboxes do histórico principal (com remoção física do PDF)
exports.eliminarMassa = async (req, res) => {
  const { ids } = req.body;
  const utilizadorId = req.session.userId || 1;

  if (!ids || ids.length === 0) {
    return res.status(400).json({ error: "Nenhum registo selecionado." });
  }

  try {
    // 1. Procurar os nomes dos ficheiros PDF associados a estes exames
    const vinculos = await ExameTipoExame.findAll({ where: { id_exame: ids } });

    vinculos.forEach((vinculo) => {
      if (vinculo.resultado) {
        const caminhoFicheiro = path.join(
          __dirname,
          "../../public/uploads/",
          vinculo.resultado,
        );

        // CORREÇÃO: Envolver a remoção física num bloco try/catch secundário
        // Impede que um ficheiro bloqueado ou em falta deite o servidor abaixo
        try {
          if (fs.existsSync(caminhoFicheiro)) {
            fs.unlinkSync(caminhoFicheiro);
          }
        } catch (fileError) {
          console.error(
            `Aviso: Não foi possível apagar o ficheiro ${vinculo.resultado}:`,
            fileError,
          );
          // O fluxo continua sem crashar a aplicação
        }
      }
    });

    // 2. Apagar da base de dados respeitando as chaves estrangeiras
    await ExameTipoExame.destroy({ where: { id_exame: ids } });
    await Exame.destroy({ where: { id: ids, utilizador_id: utilizadorId } });

    res.json({ message: "Registos clínicos eliminados com sucesso!" });
  } catch (error) {
    console.error("Erro na remoção em massa:", error);
    res.status(500).json({ error: "Erro ao processar a eliminação em massa." });
  }
};

// Elimina uma Categoria de Exame (Proteção nativa de Chave Estrangeira do Sequelize)
exports.eliminarCategoria = async (req, res) => {
  try {
    await CategoriaExame.destroy({ where: { id: req.params.id } });
    res.json({ message: "Categoria limpa com sucesso!" });
  } catch (error) {
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        error:
          "Operação travada. Existem subtipos de exames ou relatórios de pacientes mapeados nesta categoria.",
      });
    }
    res.status(500).json({ error: "Erro interno no servidor." });
  }
};

// Elimina um Tipo de Exame (Proteção contra perda de histórico clínico)
exports.eliminarTipoExame = async (req, res) => {
  try {
    await TipoExame.destroy({ where: { id: req.params.id } });
    res.json({ message: "Parâmetro clínico removido." });
  } catch (error) {
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        error:
          "Não pode apagar este tipo de exame. Existem exames reais no histórico dos utilizadores associados a este parâmetro.",
      });
    }
    res.status(500).json({ error: "Erro interno no servidor." });
  }
};

// --- GERAR LINK DE PARTILHA COM O MÉDICO (SEQUELIZE) ---
exports.gerarPartilha = async (req, res) => {
  const { examesIds } = req.body;
  const utilizadorId = req.session.userId || 1;

  if (!examesIds || examesIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Nenhum exame selecionado para partilhar." });
  }

  try {
    // Gera um token aleatório seguro de 32 caracteres (ex: a1b2c3d4...)
    const token = crypto.randomBytes(16).toString("hex");

    // Define a expiração para daqui a 7 dias
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 7);

    // Converte o array de IDs [1, 2, 3] numa string "1,2,3" para guardar na tabela Partilha
    const stringIds = examesIds.join(",");

    // Faz o INSERT na tabela Partilha usando SQL Direto via Sequelize (ou Query Interface)
    // para manter a compatibilidade com a tua tabela de Partilhas atual
    await Exame.sequelize.query(
      "INSERT INTO Partilha (token, exames_ids, data_expiracao, utilizador_id) VALUES (?, ?, ?, ?)",
      { replacements: [token, stringIds, dataExpiracao, utilizadorId] },
    );

    // Devolve o token criado para o conta.js/exames.js gerar o link final
    res.json({ token });
  } catch (error) {
    console.error("Erro ao gerar token de partilha:", error);
    res
      .status(500)
      .json({ error: "Erro interno ao criar o link de partilha." });
  }
};

// --- SERVIR O FICHEIRO HTML PARA O MÉDICO ---
exports.visualizarPartilha = (req, res) => {
  // Envia o ficheiro HTML da partilha que está na tua pasta public
  // Ajusta o caminho ("../../public/partilha.html") se o teu HTML tiver outro nome ou pasta
  res.sendFile(path.join(__dirname, "../../public/partilha.html"));
};

// --- DEVOLVER OS DADOS DOS EXAMES DO TOKEN (SEQUELIZE) ---
exports.getDadosPartilha = async (req, res) => {
  const { token } = req.params;

  try {
    // 1. Procura o token na tabela Partilha usando SQL compatível com o Sequelize
    const [partilhas] = await Exame.sequelize.query(
      "SELECT exames_ids, data_expiracao FROM Partilha WHERE token = ? LIMIT 1",
      { replacements: [token] },
    );

    if (partilhas.length === 0) {
      return res
        .status(404)
        .json({ error: "Link de partilha inválido ou inexistente." });
    }

    const partilha = partilhas[0];

    // 2. Verifica se o link já expirou (passou os 7 dias)
    if (new Date(partilha.data_expiracao) < new Date()) {
      return res
        .status(410)
        .json({ error: "Este link de partilha já expirou." });
    }

    // 3. Converte a string "1,2,3" de volta num array de números [1, 2, 3]
    const ids = partilha.exames_ids.split(",").map((id) => Number.parseInt(id));

    // 4. Procura os exames reais e inclui os nomes dos tipos de exame (JOIN)
    const exames = await Exame.findAll({
      where: { id: ids },
      include: [
        {
          model: TipoExame,
          attributes: ["nome"],
          through: { attributes: ["resultado"] },
        },
      ],
    });

    // 5. Formata os dados para o ecrã do médico ler corretamente
    const examesFormatados = exames.map((ex) => {
      const tipo = ex.TipoExames?.[0];
      return {
        nome: tipo ? tipo.nome : "Exame Clínico",
        data: ex.data_exame,
        observacoes: ex.observacoes || "Sem observações registadas.",
        resultado: tipo?.ExameTipoExame ? tipo.ExameTipoExame.resultado : null,
      };
    });

    res.json(examesFormatados);
  } catch (error) {
    console.error("Erro ao carregar dados da partilha:", error);
    res
      .status(500)
      .json({ error: "Erro interno ao carregar os dados clínicos." });
  }
};
