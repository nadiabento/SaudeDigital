const express = require("express");
const router = express.Router();
const consultaController = require("../controllers/consultaController");
const db = require("../config/db");
const { QueryTypes } = require("sequelize"); // Destructuring para usar QueryTypes diretamente sem escrever db.sequelize.QueryTypes

// ============================================================================
// --- ROTAS GET: LISTAGENS E LEITURA DE DADOS ---
// ============================================================================

// Rotas delegadas para o Controlador (ConsultaController)
router.get("/unidades", consultaController.getUnidades);
router.get("/todos-medicos", consultaController.getTodosMedicos);
router.get("/historico", consultaController.listarHistorico);
router.get("/todas-especialidades", consultaController.getTodasEspecialidades);
router.get("/medico-unidades/:id_medico", consultaController.getUnidadesDoMedico);
router.get("/catalogo-medicamentos", consultaController.getCatalogoMedicamentos);
router.get('/visualizar-partilha/:token', consultaController.visualizarPartilha);
/**
 * GET /api/consultas/:id/medicamentos
 * Finalidade: Vai buscar a lista de medicamentos vinculados a uma consulta que já foi realizada.
 */
router.get("/:id/medicamentos", consultaController.getMedicamentosDaConsulta);

/**
 * GET /api/consultas/medicos
 * Finalidade: Retorna a lista de médicos formatada para o componente de gestão de conta (conta.js).
 * Nota de Engenharia: Usa o "AS id" para mapear a chave primária real (id_medico) para o nome esperado pelo frontend.
 */
router.get("/medicos", async (req, res) => {
  try {
    const medicos = await db.sequelize.query(
      "SELECT id_medico AS id, nome FROM Medico ORDER BY nome ASC",
      { type: QueryTypes.SELECT } // Diz ao Sequelize para retornar apenas um Array limpo de objetos JSON
    );
    res.json(medicos);
  } catch (error) {
    console.error("Erro ao listar médicos:", error);
    res.status(500).json({ error: "Erro interno ao listar médicos." });
  }
});

// ============================================================================
// --- ROTAS POST / PUT / DELETE: ALTERAÇÃO DE ESTADO E CRIAÇÃO ---
// ============================================================================

router.post("/", consultaController.registarConsulta);
router.post("/unidades", consultaController.criarUnidade);
router.post("/medicos", consultaController.adicionarMedico);
router.post("/partilha", consultaController.gerarPartilha);
router.put("/:id", consultaController.editarConsulta);
router.delete("/massa", consultaController.eliminarMassa);
router.post( "/especialidades",consultaController.criarEspecialidade);
router.post("/:id/medicamentos", consultaController.vincularMedicamentoAConsulta);
router.delete("/medicamentos/:id", consultaController.eliminarMedicamentoVinculado);

/**
 * DELETE /api/consultas/medicos/:id
 * Finalidade: Elimina um médico do sistema de forma segura.
 * Restrição de Integridade Referencial: Bloqueia a remoção se o médico já tiver consultas marcadas,
 * evitando erros de chave estrangeira (Foreign Key Constraint) na base de dados Cloud.
 */
router.delete("/medicos/:id", async (req, res) => {
  const { id } = req.params; // Captura o ID passado na URL
  try {
    // 1. Verifica a existência de dependências na tabela Consulta
    const [consultas] = await db.sequelize.query(
      "SELECT id FROM Consulta WHERE id_medico = ? LIMIT 1",
      { 
        replacements: [id],         // Substituição posicional segura para o caractere '?'
        type: QueryTypes.SELECT     // Define que é uma leitura de dados
      }
    );

    // Se o array de retorno contiver dados, cancela a operação enviando o código HTTP 400 (Bad Request)
    if (consultas) {
      return res.status(400).json({ error: "Este médico tem consultas associadas e não pode ser removido." });
    }

    // 2. Se não houver dependências, executa a remoção permanente
    await db.sequelize.query("DELETE FROM Medico WHERE id_medico = ?", {
      replacements: [id],
      type: QueryTypes.DELETE       // Avisa o Sequelize que é uma operation de eliminação
    });
    res.json({ message: "Médico removido com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao remover médico." });
  }
});

// ============================================================================
// --- INTEGRAÇÃO: GESTÃO DETALHADA DE MÉDICOS (CLÍNICAS E CADASTRO) ---
// ============================================================================

/**
 * PUT /api/consultas/medicos/:id/locais
 * Finalidade: Sincroniza os locais de trabalho (clínicas/unidades) de um médico específico.
 * Mecânica Relacional (Muitos-para-Muitos): 
 * 1. Remove todas as associações antigas do médico na tabela intermédia (Medico_Unidade).
 * 2. Insere as novas unidades assinaladas no frontend uma a uma dentro de um ciclo (loop).
 */
router.put('/medicos/:id/locais', async (req, res) => {
    const { id } = req.params;
    const { unidades } = req.body; // Array contendo os IDs das unidades enviadas pelo JSON

    // Validação preventiva de integridade
    if (!unidades || !Array.isArray(unidades) || unidades.length === 0) {
        return res.status(400).json({ error: "Selecione pelo menos um local de trabalho." });
    }

    try {
        // Passo A: Limpar histórico relacional do médico
        await db.sequelize.query("DELETE FROM Medico_Unidade WHERE id_medico = ?", {
            replacements: [id],
            type: QueryTypes.DELETE
        });

        // Passo B: Inserir novos vínculos ativos na Cloud (Aiven)
        for (const idUnidade of unidades) {
            await db.sequelize.query(
                "INSERT INTO Medico_Unidade (id_medico, id_unidade) VALUES (?, ?)", 
                {
                    replacements: [id, idUnidade], // O Sequelize limpa e injeta os IDs na ordem exata dos '?'
                    type: QueryTypes.INSERT         // Avisa o driver que é uma inserção de dados
                }
            );
        }
        res.json({ message: "Locais de trabalho atualizados!" });
    } catch (error) {
        console.error("Erro no endpoint /locais:", error);
        res.status(500).json({ error: "Erro ao atualizar locais no Aiven." });
    }
});

/**
 * POST /api/consultas/medicos/editar
 * Finalidade: Altera os dados básicos (Nome e Especialidade) do cadastro de um médico.
 * Segurança (SQL Injection): O uso de parâmetros posicionais `?` combinados com o array `replacements` 
 * garante que os dados de texto digitados pelo utilizador sejam tratados como literais e nunca como código SQL.
 */
router.post('/medicos/editar', async (req, res) => {
    // Desestrutura os dados obrigatórios recebidos do formulário do frontend
    const { id_medico, nome, id_especialidade } = req.body;

    if (!id_medico || !nome || !id_especialidade) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    try {
        // Executa o comando de atualização na tabela do Aiven Cloud
        await db.sequelize.query(
            "UPDATE Medico SET nome = ?, id_especialidade = ? WHERE id_medico = ?", 
            {
                // A ordem dos elementos no Array TEM de ser idêntica à ordem das '?' na String SQL acima:
                // 1º '?' = nome, 2º '?' = id_especialidade, 3º '?' = id_medico
                replacements: [nome, id_especialidade, id_medico],
                type: QueryTypes.UPDATE // Define o tipo como atualização de registo
            }
        );
        res.json({ message: "Cadastro do médico updated!" });
    } catch (error) {
        console.error("Erro no endpoint /medicos/editar:", error);
        res.status(500).json({ error: "Erro ao atualizar dados do médico." });
    }
});

module.exports = router; // Exporta o router configurado para ser montado no server.js