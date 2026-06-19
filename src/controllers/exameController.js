const { Exame, TipoExame, ExameTipoExame } = require("../models/Exame");
const CategoriaExame = require("../models/CategoriaExame");
const Partilha = require("../models/Partilha");
const { sequelize } = require("../config/db");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const obterUtilizadorSessao = (req) => {
  let rawId = req.session?.userId;
  if (rawId && typeof rawId === "object") {
    return rawId.id_utilizador || rawId.id || rawId.utilizador_id || 4;
  }
  return Number.parseInt(rawId, 10) || 4; // Fallback estável Nadia Bento
};

// =========================================================================
// --- 1. LISTAGENS E FILTROS EM CASCATA                                 ---
// =========================================================================

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

  const ficheiroExame =
    req.files && req.files["resultado_file"]
      ? req.files["resultado_file"][0].filename
      : null;
  const ficheiroRelatorio =
    req.files && req.files["relatorio"]
      ? req.files["relatorio"][0].filename
      : null;

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
    // Faz o rollback imediato da transação para não deixar lixo na BD
    await t.rollback();

    // Apaga os ficheiros PDFs temporários se eles tiverem sido feito upload pelo Multer
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

    console.error(" ERRO CRÍTICO DETALHADO NO SEQUELIZE:", error);

    // Devolve o erro para o teu frontend em formato JSON
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
    return res.json({ message: "Exame atualizado com sucesso!" });
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

// =========================================================================
// --- 4. INTEROPERABILIDADE E PARTILHA (PORTAL DO MÉDICO)               ---
// =========================================================================

exports.gerarPartilha = async (req, res) => {
  const { examesIds } = req.body;
  const utilizadorId = obterUtilizadorSessao(req);

  if (!examesIds || !Array.isArray(examesIds) || examesIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Selecione pelo menos um exame válido." });
  }

  try {
    const token = crypto.randomBytes(16).toString("hex");
    const dataExpiracao = new Date(Date.now() + 48 * 60 * 60 * 1000); // Janela estrita de 48h

    await Partilha.create({
      token,
      exames_ids: examesIds.join(","),
      data_expiracao: dataExpiracao,
      utilizador_id: Number(utilizadorId),
    });

    return res.json({ token });
  } catch (error) {
    console.error("Erro ao processar link interoperável:", error.message);
    return res
      .status(500)
      .json({ error: "Erro interno ao criar credencial de partilha." });
  }
};

exports.visualizarPartilha = (req, res) => {
  return res.sendFile(path.join(__dirname, "../../public/partilha.html"));
};

exports.getDadosPartilha = async (req, res) => {
  const { token } = req.params;

  try {
    // 1. Procura explícita usando o token
    const partilha = await Partilha.findOne({ where: { token } });

    if (!partilha) {
      return res.status(404).json({ error: "Link de partilha inválido." });
    }

    // 2. Validação segura do fuso horário da data de expiração
    if (new Date(partilha.data_expiracao).getTime() < Date.now()) {
      return res
        .status(410)
        .json({ error: "Este link de partilha clínica já expirou." });
    }

    // Corta e converte a string de IDs ("1,2,3") num array de inteiros
    const ids = partilha.exames_ids
      .split(",")
      .map((id) => Number.parseInt(id, 10));

    // 3. Procura os exames correspondentes
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

    // 4. Formata a resposta para o teu Frontend interoperável
    const examesFormatados = exames.map((ex) => {
      const tipo = ex.TiposExames?.[0];
      return {
        nome: tipo ? tipo.nome : "Exame Clínico",
        data: ex.data_exame,
        observacoes: ex.observacoes || "Sem observações.",
        // Garante o mapeamento seguro da tabela intermédia Exame_TipoExame
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
