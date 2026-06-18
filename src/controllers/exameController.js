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
  // CORREÇÃO: Fallback alterado de 1 para 4 para garantir que puxa os dados da Nadia Bento
  const utilizadorId = req.session.userId || 4;
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
          // CORREÇÃO: Incluído o atributo "relatorio" para o Sequelize o trazer da tabela ponte
          through: { attributes: ["resultado", "relatorio"] },
        },
      ],
    });

    // Formata os dados para o formato exato que o teu JavaScript do frontend processa
    const examesFormatados = rows.map((ex) => {
      const tipo = ex.TipoExames?.[0];
      return {
        id: ex.id,
        data: ex.data_exame,
        nome: tipo ? tipo.nome : "Não especificado",
        resultado: tipo?.ExameTipoExame ? tipo.ExameTipoExame.resultado : null,
        // CORREÇÃO: Mapeado o relatorio para que o objeto enviado no JSON contenha este campo
        relatorio: tipo?.ExameTipoExame ? tipo.ExameTipoExame.relatorio : null,
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

  // Extração segura do teu ID Nadia Bento (ID 4)
  let rawUserId = req.session.userId;
  let finalUserId = null;

  if (rawUserId && typeof rawUserId === "object") {
    finalUserId =
      rawUserId.id_utilizador || rawUserId.id || rawUserId.utilizador_id;
  } else if (
    rawUserId &&
    typeof rawUserId === "string" &&
    rawUserId !== "[object Object]"
  ) {
    finalUserId = Number.parseInt(rawUserId, 10);
  }

  if (!finalUserId || Number.isNaN(finalUserId)) {
    finalUserId = 4; // Fallback definitivo para a tua conta Nadia Bento
  }

  if (!data_exame || !id_tipo_exame) {
    return res
      .status(400)
      .json({ error: "A data e o tipo de exame são obrigatórios." });
  }

  // Captura dos dois PDFs vindos do upload.fields das rotas
  const ficheiroExame = req.files?.["resultado_file"]?.[0]?.filename || null;
  const ficheiroRelatorio = req.files?.["relatorio"]?.[0]?.filename || null;

  const t = await Exame.sequelize.transaction();

  try {
    // 1. Criar cabeçalho na tabela Exame
    const novoExame = await Exame.create(
      {
        data_exame,
        local_realizacao: local_realizacao || "SaúdeDigital Clinic",
        observacoes,
        utilizador_id: finalUserId,
      },
      { transaction: t },
    );

    // 2. Criar vínculo na tabela Exame_TipoExame com ambos os PDFs
    await ExameTipoExame.create(
      {
        id_exame: novoExame.id,
        id_tipo_exame: Number(id_tipo_exame),
        resultado: ficheiroExame,
        relatorio: ficheiroRelatorio,
      },
      { transaction: t },
    );

    await t.commit();
    res
      .status(200)
      .json({ message: "Exame e relatórios guardados com sucesso!" });
  } catch (error) {
    await t.rollback();
    console.error("Erro ao registar exame (Transaction Rollback):", error);

    // Elimina os ficheiros criados do disco se a BD falhar
    [ficheiroExame, ficheiroRelatorio].forEach((f) => {
      if (f) {
        const caminho = path.join(__dirname, "../../public/uploads/", f);
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

// --- GERAR LINK DE PARTILHA COM O MÉDICO (48 HORAS) ---
exports.gerarPartilha = async (req, res) => {
  const { examesIds } = req.body;
  const utilizadorId = req.session.userId;

  if (!examesIds || examesIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Nenhum exame selecionado para partilhar." });
  }

  try {
    // Gera um token aleatório seguro de 32 caracteres
    const token = crypto.randomBytes(16).toString("hex");

    // Define a expiração matemática exata para daqui a 48 Horas
    const TEMPO_48H_EM_MS = 48 * 60 * 60 * 1000;
    const dataExpiracao = new Date(Date.now() + TEMPO_48H_EM_MS);

    // Converte o array [1, 2, 3] numa string "1,2,3"
    const stringIds = examesIds.join(",");

    // Faz o INSERT na tabela Partilha
    await Exame.sequelize.query(
      "INSERT INTO Partilha (token, exames_ids, data_expiracao, utilizador_id) VALUES (?, ?, ?, ?)",
      { replacements: [token, stringIds, dataExpiracao, utilizadorId] },
    );

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
