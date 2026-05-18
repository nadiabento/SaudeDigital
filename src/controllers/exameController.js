const Exame = require("../models/exame");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// --- LISTAGENS ---
exports.listarCategorias = async (req, res) => {
  try {
    const rows = await Exame.listarCategorias();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar categorias" });
  }
};

exports.listarTiposPorCategoria = async (req, res) => {
  try {
    // Esta função usa o parâmetro da URL (id_categoria)
    const rows = await Exame.listarTiposPorCategoria(req.params.id_categoria);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar tipos" });
  }
};

exports.listarHistorico = async (req, res) => {
  const utilizadorId = req.session.userId;

  // 1. Verificar primeiro se o utilizador está logado
  if (!utilizadorId) return res.status(401).json({ error: "Não autorizado" });

  try {
    // 2. Definir as variáveis de paginação ANTES de as usar
    const pagina = parseInt(req.query.page) || 1;
    const limite = 10;
    const offset = (pagina - 1) * limite;

    // 3. Chamar o Model para buscar os dados e o total
    const rows = await Exame.listarHistoricoPaginado(
      utilizadorId,
      limite,
      offset,
    );
    const total = await Exame.contarTotal(utilizadorId);

    // 4. Enviar a resposta com o cálculo correto
    res.json({
      exames: rows,
      totalPaginas: Math.ceil(total / limite),
      paginaAtual: pagina,
    });
  } catch (error) {
    console.error("Erro no listarHistorico:", error);
    res.status(500).json({ error: "Erro interno ao carregar histórico." });
  }
};

// --- PORTAL DO MÉDICO ---
exports.visualizarPartilha = (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/partilha.html"));
};

exports.getDadosPartilha = async (req, res) => {
  try {
    const partilha = await Exame.getDadosPartilha(req.params.token);
    if (!partilha || partilha.length === 0)
      return res.status(404).json({ error: "Link inválido" });

    const ids = partilha[0].exames_ids.split(",").map(Number);
    const exames = await Exame.buscarExamesPorIds(ids);
    res.json(exames);
  } catch (error) {
    res.status(500).json({ error: "Erro interno" });
  }
};

// --- CRIAÇÃO ---
exports.criarCategoria = async (req, res) => {
  try {
    if (!req.body.nome)
      return res.status(400).json({ error: "O nome é obrigatório." });
    await Exame.criarCategoria(req.body.nome);
    res.status(201).json({ message: "Categoria criada!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.criarTipo = async (req, res) => {
  try {
    const { nome, id_categoria } = req.body;
    if (!nome || !id_categoria)
      return res.status(400).json({ error: "Dados incompletos." });
    await Exame.criarTipo(nome, id_categoria);
    res.status(201).json({ message: "Tipo de exame criado!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao guardar." });
  }
};

exports.registarExame = async (req, res) => {
  const { data_exame, observacoes, id_tipo_exame, local_realizacao } = req.body;
  const utilizadorId = req.session.userId;
  if (!utilizadorId) return res.status(401).json({ error: "Sessão expirada." });

  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  if (new Date(data_exame) > hoje)
    return res.status(400).json({ error: "Data superior à atual." });

  try {
    const nomeFicheiro = req.file ? req.file.filename : null;
    await Exame.registarCompleto(
      data_exame,
      local_realizacao || "SaúdeDigital Clinic",
      observacoes,
      utilizadorId,
      id_tipo_exame,
      nomeFicheiro,
    );
    res.status(200).json({ message: "Exame guardado com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao guardar exame." });
  }
};

// --- MANUTENÇÃO ---
exports.editarExame = async (req, res) => {
  try {
    await Exame.editar(
      req.params.id,
      req.body.data_exame,
      req.body.observacoes,
      req.session.userId,
    );
    res.json({ message: "Exame atualizado!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar." });
  }
};

exports.eliminarMassa = async (req, res) => {
  const { ids } = req.body;
  const utilizadorId = req.session.userId;
  if (!utilizadorId || !ids)
    return res.status(401).json({ error: "Erro na eliminação." });

  try {
    const ficheiros = await Exame.buscarFicheiros(ids);
    const resultado = await Exame.eliminarMassa(ids, utilizadorId);

    if (resultado.affectedRows > 0) {
      ficheiros.forEach((f) => {
        if (f.resultado) {
          const caminho = path.join(
            __dirname,
            "../../public/uploads/",
            f.resultado,
          );
          if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
        }
      });
    }
    res.json({ message: "Eliminado!", quantidade: resultado.affectedRows });
  } catch (error) {
    res.status(500).json({ error: "Erro interno." });
  }
};

exports.gerarPartilha = async (req, res) => {
  const { examesIds } = req.body;
  const userId = req.session.userId;
  if (!userId || !examesIds)
    return res.status(401).json({ error: "Erro na partilha." });

  const token = crypto.randomBytes(16).toString("hex");
  const expiracao = new Date();
  expiracao.setHours(expiracao.getHours() + 48);

  try {
    await Exame.salvarPartilha(token, examesIds.join(","), expiracao, userId);
    res.json({ token: token });
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar link." });
  }
};
