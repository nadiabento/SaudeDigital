const { Exame, TipoExame, ExameTipoExame } = require("../models/Exame");
const CategoriaExame = require("../models/CategoriaExame");
const Partilha = require("../models/Partilha");
const sequelize = Exame.sequelize;
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const obterUtilizadorSessao = (req) => {
  let rawId = req.session?.userId;
  if (rawId && typeof rawId === "object") {
    return rawId.id_utilizador || rawId.id || rawId.utilizador_id;
  }
  return Number.parseInt(rawId, 10);
};

// =========================================================================
// --- 1. LISTAGENS E FILTROS EM CASCATA                                 ---
// =========================================================================

exports.listarCategorias = async (req, res) => {
  try {
    const categories = await CategoriaExame.findAll({
      order: [["nome", "ASC"]],
    });
    return res.json(categories);
  } catch (error) {
    console.error("Erro ao listar categorias:", error);
    return res
      .status(500)
      .json({ error: "Erro interno ao listar categorias." });
  }
};

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
          as: "TiposExames",
          attributes: ["nome"],
          through: { attributes: ["resultado", "relatorio"] },
        },
      ],
    });

    const exames = rows.map((ex) => {
      const tipo = ex.TiposExames?.[0];
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
exports.registarExame = async (req, res) => {
  const t = await sequelize.transaction();
  let idUtilizador = obterUtilizadorSessao(req);

  const ficheiroExame = req.files?.["resultado_file"]?.[0]?.path || null;

  const ficheiroRelatorio = req.files?.["relatorio"]?.[0]?.path || null;
  null;

  try {
    const { data_exame, local_realizacao, observacoes, id_tipo_exame } =
      req.body;

    if (!data_exame || !id_tipo_exame) {
      throw new Error("Campos obrigatórios em falta no formulário.");
    }

    const novoExame = await Exame.create(
      {
        data_exame,
        local_realizacao: local_realizacao || "SaúdeDigital Clinic",
        observacoes: observacoes || "",
        utilizador_id: Number.parseInt(idUtilizador, 10),
      },
      { transaction: t },
    );

    await ExameTipoExame.create(
      {
        id_exame: Number(novoExame.id),
        id_tipo_exame: Number.parseInt(id_tipo_exame, 10),
        resultado: ficheiroExame,
        relatorio: ficheiroRelatorio,
      },
      { transaction: t },
    );

    await t.commit();
    return res.status(201).json({
      message: "Registo clínico consolidado com sucesso no histórico.",
    });
  } catch (error) {
    await t.rollback();

    if (req.files) {
      if (
        req.files["resultado_file"] &&
        fs.existsSync(req.files["resultado_file"][0].path)
      )
        fs.unlinkSync(req.files["resultado_file"][0].path);
      if (
        req.files["relatorio"] &&
        fs.existsSync(req.files["relatorio"][0].path)
      )
        fs.unlinkSync(req.files["relatorio"][0].path);
    }

    console.error(" ErRO CRÍTICO DETALHADO NO SEQUELIZE:", error);
    return res.status(500).json({
      error: `Falha na consistência relacional: ${error.message}`,
    });
  }
};

exports.criarCategoria = async (req, res) => {
  try {
    const nova = await CategoriaExame.create({ nome: req.body.nome });
    return res.status(201).json(nova);
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return res.status(500).json({ error: "Erro ao criar categoria." });
  }
};

exports.criarTipo = async (req, res) => {
  try {
    const novo = await TipoExame.create({
      nome: req.body.nome,
      id_categoria: Number.parseInt(req.body.id_categoria, 10),
    });
    return res.status(201).json(novo);
  } catch (error) {
    console.error("Erro ao criar tipo:", error);
    return res.status(500).json({ error: "Erro ao criar tipo de exame." });
  }
};

// =========================================================================
// --- 3. OPERAÇÕES DE MANUTENÇÃO (PUT / DELETE)                         ---
// =========================================================================

exports.editarExame = async (req, res) => {
  const { data_exame, observacoes } = req.body;
  const utilizadorId = obterUtilizadorSessao(req);

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
    return res.json({ message: "Exame updated com sucesso!" });
  } catch (error) {
    console.error("Erro ao editar exame:", error);
    return res.status(500).json({ error: "Erro ao editar o registo." });
  }
};

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
    // 1. Remove os vínculos na tabela intermédia com segurança atómica
    await ExameTipoExame.destroy({ where: { id_exame: ids }, transaction: t });

    // 2. Remove os registos principais de exames
    await Exame.destroy({
      where: { id: ids, utilizador_id: utilizadorId },
      transaction: t,
    });

    // 3. Consolida a transação na base de dados (Aiven)
    await t.commit();

    return res.json({
      message: "Registos expurgados com sucesso da base de dados.",
    });
  } catch (error) {
    await t.rollback();
    console.error("Erro na remoção em massa:", error);
    return res
      .status(500)
      .json({ error: "Erro interno no processamento de remoção." });
  }
};

// =========================================================================
// --- 4. INTEROPERABILIDADE E PARTILHA (PORTAL DO MÉDICO)               ---
// =========================================================================

exports.gerarLinkPartilha = async (req, res) => {
  const { examesIds, horasValidade } = req.body;
  const utilizadorId = obterUtilizadorSessao(req);

  if (!examesIds || !Array.isArray(examesIds) || examesIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Selecione pelo menos um exame válido." });
  }

  try {
    const token = crypto.randomBytes(16).toString("hex");

    // 1. IMPORTANTE: Usar parseFloat também no backend!
    const horasParsed = Number.parseFloat(horasValidade);
    const horas =
      Number.isNaN(horasParsed) || horasParsed <= 0 ? 2 : horasParsed;

    // 2. Calcula a data somando os milissegundos exatos à data atual do servidor
    const dataExpiracao = new Date(Date.now() + horas * 60 * 60 * 1000);

    await Partilha.create({
      token,
      exames_ids: examesIds.join(","),
      data_expiracao: dataExpiracao, // O Sequelize vai converter isto corretamente para o fuso da BD
      utilizador_id: Number(utilizadorId),
    });

    return res.json({ token });
  } catch (error) {
    console.error("Erro ao processar link interoperável:", error);
    return res.status(500).json({
      error: `Erro interno ao criar credencial de partilha: ${error.message}`,
    });
  }
};

exports.visualizarPartilha = async (req, res) => {
  const { token } = req.params;

  try {
    // 1. Procura a credencial de partilha na Base de Dados
    const partilha = await Partilha.findOne({ where: { token } });

    // 2. Se o token não existir, serve diretamente o ficheiro 404 da pasta public
    if (!partilha) {
      return res
        .status(404)
        .sendFile(path.join(__dirname, "../../public/404.html"));
    }

    // 3. Validação robusta do tempo por milissegundos (evita problemas de fuso horário)
    if (new Date(partilha.data_expiracao).getTime() < Date.now()) {
      return res
        .status(404)
        .sendFile(path.join(__dirname, "../../public/404.html"));
    }

    // 4. Se estiver tudo correto e dentro do tempo, serve a página do portal médico
    return res.sendFile(path.join(__dirname, "../../public/partilha.html"));
  } catch (error) {
    console.error("Erro ao validar visualização de partilha:", error);
    // Em caso de erro crítico de BD, serve também o 404 de segurança
    return res
      .status(404)
      .sendFile(path.join(__dirname, "../../public/404.html"));
  }
};

exports.getDadosPartilha = async (req, res) => {
  const { token } = req.params;

  try {
    const partilha = await Partilha.findOne({ where: { token } });

    if (!partilha) {
      return res.status(404).json({ error: "Link de partilha inválido." });
    }

    if (new Date(partilha.data_expiracao).getTime() < Date.now()) {
      return res
        .status(410)
        .json({ error: "Este link de partilha clínica já expirou." });
    }

    const ids = partilha.exames_ids
      .split(",")
      .map((id) => Number.parseInt(id, 10));

    const exames = await Exame.findAll({
      where: { id: ids },
      include: [
        {
          model: TipoExame,
          as: "TiposExames",
          attributes: ["nome"],
          through: { attributes: ["resultado", "relatorio"] },
        },
      ],
    });

    const examesFormatados = exames.map((ex) => {
      const tipo = ex.TiposExames?.[0];
      return {
        nome: tipo ? tipo.nome : "Exame Clínico",
        data: ex.data_exame,
        observacoes: ex.observacoes || "Sem observações.",
        resultado: tipo?.ExameTipoExame ? tipo.ExameTipoExame.resultado : null,
        relatorio: tipo?.ExameTipoExame ? tipo.ExameTipoExame.relatorio : null,
      };
    });

    return res.json(examesFormatados);
  } catch (error) {
    console.error("ERRO CRÍTICO NA EXTRAÇÃO DE DADOS PARTILHADOS:", error);
    return res.status(500).json({
      error: `Falha interna ao processar dados de interoperabilidade: ${error.message}`,
    });
  }
};
