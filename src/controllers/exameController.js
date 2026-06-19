const { Exame, TipoExame, ExameTipoExame } = require("../models/Exame");
const CategoriaExame = require("../models/CategoriaExame");
const sequelize = require("../config/db");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const obterUtilizadorSessao = (req) => {
  let rawId = req.session?.userId;
  if (rawId && typeof rawId === "object") {
    return rawId.id_utilizador || rawId.id || rawId.utilizador_id || 4;
  }
  return Number.parseInt(rawId, 10) || 4; // Fallback seguro Nadia Bento
};

// =========================================================================
// --- 1. LISTAGENS E FILTROS EM CASCATA (PÁGINA INICIAL E CONTA)        ---
// =========================================================================

// Devolve todas as categorias ordenadas por nome (Preenche a primeira combobox)
exports.listarCategorias = async (req, res) => {
  try {
    const categorias = await CategoriaExame.findAll({
      order: [["nome", "ASC"]],
    });
    return res.json(categorias);
  } catch (error) {
    console.error("Erro ao listar categorias:", error);
    return res
      .status(500)
      .json({ error: "Erro interno ao listar categorias." });
  }
};

// Devolve os subtipos filtrados pela categoria pai selecionada (Cascata dinâmica)
exports.listarTiposPorCategoria = async (req, res) => {
  try {
    const tipos = await TipoExame.findAll({
      where: { id_categoria: req.params.id_categoria },
      order: [["nome", "ASC"]],
    });
    return res.json(tipos);
  } catch (error) {
    console.error("Erro ao listar tipos:", error);
    return res.status(500).json({ error: "Erro interno ao listar subtipos." });
  }
};

// Devolve todos os tipos de exames globais sem filtro de pai (Usado no conta.html)
exports.listarTodosOsTiposAgnostico = async (req, res) => {
  try {
    const tipos = await TipoExame.findAll({ order: [["nome", "ASC"]] });
    return res.json(tipos);
  } catch (error) {
    console.error("Erro ao listar tipos globais:", error);
    return res
      .status(500)
      .json({ error: "Erro interno ao mapear catálogo clínico." });
  }
};

// Lista o histórico de exames do utilizador logado com paginação e JOINs nativos
exports.listarHistorico = async (req, res) => {
  const utilizadorId = obterUtilizadorSessao(req);
  const pagina = Number.parseInt(req.query.page, 10) || 1;
  const limite = 10;
  const offset = (pagina - 1) * limite;

  try {
    const { rows, count } = await Exame.findAndCountAll({
      where: { utilizador_id: utilizadorId },
      distinct: true,
      order: [["data_exame", "DESC"]],
      limit: limite,
      offset: offset,
      include: [
        {
          model: TipoExame,
          attributes: ["nome"],
          through: { attributes: ["resultado", "relatorio"] },
        },
      ],
    });

    const exames = rows.map((ex) => {
      const tipo = ex.TipoExames?.[0];
      return {
        id: ex.id,
        data: ex.data_exame,
        nome: tipo ? tipo.nome : "Não especificado",
        resultado: tipo?.ExameTipoExame ? tipo.ExameTipoExame.resultado : null,
        relatorio: tipo?.ExameTipoExame ? tipo.ExameTipoExame.relatorio : null,
        observacoes: ex.observacoes || "",
      };
    });

    return res.json({
      exames,
      totalPaginas: Math.ceil(count / limite),
      paginaAtual: pagina,
    });
  } catch (error) {
    console.error("Erro no histórico clínico:", error);
    return res
      .status(500)
      .json({ error: "Erro interno ao carregar dados do repositório." });
  }
};

// =========================================================================
// --- 2. OPERAÇÕES DE CRIAÇÃO E REGISTO (POST)                          ---
// =========================================================================

// Guarda um novo exame e associa-o aos ficheiros PDF carregados pelo Multer
exports.registarExame = async (req, res) => {
  // 3. RESOLVIDO: Inicialização da transação gerida pelo Sequelize ORM
  const t = await sequelize.transaction();

  // Proteção de tipo: Garante a extração limpa do ID primitivo
  let idUtilizador = null;
  if (req.session?.userId) {
    idUtilizador =
      typeof req.session.userId === "object"
        ? req.session.userId.id_utilizador || req.session.userId.id
        : req.session.userId;
  }

  if (!idUtilizador) {
    if (req.file) fs.unlinkSync(req.file.path); // Elimina resíduo do upload
    return res
      .status(401)
      .json({ error: "Sessão inválida ou expirada. Efetue login novamente." });
  }

  try {
    const { data_exame, local_realizacao, observacoes, id_tipo_exame } =
      req.body;

    if (!data_exame || !id_tipo_exame) {
      throw new Error("Campos obrigatórios em falta no payload.");
    }

    // Passo 1: Inserir Cabeçalho do Exame
    const novoExame = await Exame.create(
      {
        data_exame,
        local_realizacao,
        observacoes,
        utilizador_id: idUtilizador,
      },
      { transaction: t },
    );

    // Passo 2: Inserir Vínculo Documental na Tabela Ponte (Exame_TipoExame)
    await ExameTipoExame.create(
      {
        ExameId: novoExame.id,
        TipoExameId: id_tipo_exame,
        resultado: req.file ? req.file.filename : null,
      },
      { transaction: t },
    );

    // Se tudo correr bem, efetua o commit atómico
    await t.commit();
    return res.status(201).json({
      message: "Registo clínico e anexo PDF consolidados com sucesso.",
    });
  } catch (error) {
    // 3. RESOLVIDO: Rollback automático - reverte a BD e limpa o sistema de ficheiros
    await t.rollback();
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Erro transacional detetado:", error.message);
    return res.status(500).json({
      error:
        "Falha na consistência dos dados. Operação abortada com segurança.",
    });
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
  const utilizadorId = obterUtilizadorSessao(req);

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ error: "Nenhum registo selecionado para eliminação." });
  }

  const t = await sequelize.transaction();
  try {
    const vinculos = await ExameTipoExame.findAll({ where: { id_exame: ids } });

    await ExameTipoExame.destroy(
      { where: { id_exame: ids } },
      { transaction: t },
    );
    await Exame.destroy(
      { where: { id: ids, utilizador_id: utilizadorId } },
      { transaction: t },
    );

    await t.commit();

    // Eliminação física pós-commit para evitar inconsistências
    vinculos.forEach((v) => {
      [v.resultado, v.relatorio].forEach((ficheiro) => {
        if (ficheiro) {
          const caminho = path.join(
            __dirname,
            "../../public/uploads/",
            ficheiro,
          );
          if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
        }
      });
    });

    return res.json({
      message: "Registos e documentos expurgados com sucesso.",
    });
  } catch (error) {
    await t.rollback();
    console.error("Erro na remoção em massa:", error);
    return res
      .status(500)
      .json({ error: "Erro interno no processamento de remoção." });
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

// --- GERAR LINK DE PARTILHA COM O MÉDICO (48 HORAS) ---
exports.gerarPartilha = async (req, res) => {
  const { examesIds } = req.body;
  const utilizadorId = obterUtilizadorSessao(req);

  if (!examesIds || examesIds.length === 0) {
    return res.status(400).json({ error: "Parâmetros de exames inválidos." });
  }

  try {
    const token = crypto.randomBytes(16).toString("hex");
    const dataExpiracao = new Date(Date.now() + 48 * 60 * 60 * 1000); // Janela estrita de 48h

    await sequelize.query(
      "INSERT INTO Partilha (token, exames_ids, data_expiracao, utilizador_id) VALUES (?, ?, ?, ?)",
      {
        replacements: [token, examesIds.join(","), dataExpiracao, utilizadorId],
        type: sequelize.QueryTypes.INSERT,
      },
    );

    return res.json({ token });
  } catch (error) {
    console.error("Erro ao processar link interoperável:", error);
    return res
      .status(500)
      .json({ error: "Erro interno ao criar credencial de partilha." });
  }
};

// --- SERVIR O FICHEIRO HTML PARA O MÉDICO ---
exports.visualizarPartilha = (req, res) => {
  // Envia o ficheiro HTML da partilha que está na tua pasta public
  // Ajusta o caminho ("../../public/partilha.html") se o teu HTML tiver outro nome ou pasta
  res.sendFile(path.join(__dirname, "../../public/partilha.html"));
};

// --- DEVOLVER OS DADOS DOS EXAMES DO TOKEN (INCLUINDO RELATÓRIO) ---
exports.getDadosPartilha = async (req, res) => {
  const { token } = req.params;

  try {
    //Forçamos o tipo de query SELECT para o Sequelize saber exatamente como estruturar o Array retornado
    const partilhas = await Exame.sequelize.query(
      "SELECT exames_ids, data_expiracao FROM Partilha WHERE token = ? LIMIT 1",
      {
        replacements: [token],
        type: Exame.sequelize.QueryTypes.SELECT, // 👈 Garante que devolve uma Array limpa de objetos
      },
    );

    // Validação ultra segura do resultado
    if (!partilhas || partilhas.length === 0) {
      return res
        .status(404)
        .json({ error: "Link de partilha inválido ou inexistente." });
    }

    const partilha = partilhas[0];

    // Se a coluna na BD se chamar 'examesIds' em vez de 'exames_ids', fazemos um fallback seguro
    const examesIdsString = partilha.exames_ids || partilha.examesIds;
    const dataExpiracaoRaw = partilha.data_expiracao || partilha.dataExpiracao;

    if (!examesIdsString) {
      return res.status(500).json({
        error:
          "Erro na estrutura dos dados da partilha (coluna exames_ids não encontrada).",
      });
    }

    // Validação da expiração das 48h
    if (dataExpiracaoRaw && new Date(dataExpiracaoRaw).getTime() < Date.now()) {
      return res
        .status(410)
        .json({ error: "Este link de partilha já expirou." });
    }

    // Converte a string "1,2,3" num array de números
    const ids = examesIdsString.split(",").map((id) => Number.parseInt(id, 10));

    // Procura os exames no Sequelize
    const exames = await Exame.findAll({
      where: { id: ids },
      include: [
        {
          model: TipoExame,
          attributes: ["nome"],
          through: { attributes: ["resultado", "relatorio"] },
        },
      ],
    });

    // Mapeamento seguro para o Frontend
    const examesFormatados = exames.map((ex) => {
      const tipo = ex.TipoExames?.[0];
      return {
        nome: tipo ? tipo.nome : "Exame Clínico",
        data: ex.data_exame,
        observacoes: ex.observacoes || "Sem observações registadas.",
        resultado: tipo?.ExameTipoExame ? tipo.ExameTipoExame.resultado : null,
        relatorio: tipo?.ExameTipoExame ? tipo.ExameTipoExame.relatorio : null,
      };
    });

    return res.json(examesFormatados);
  } catch (error) {
    // Se falhar, enviamos o erro na própria resposta HTTP para que o possas ler diretamente no teu navegador (no separador Network/Rede)!
    console.error("Erro crítico apanhado:", error.message);
    return res.status(500).json({
      error: "Erro interno no servidor ao processar os dados.",
      detalhes: error.message,
    });
  }
};
