const db = require("../config/db"); // Liga à tua base de dados

// Função para apagar um registo DE FORMA SEGURA
exports.apagar = async (req, res) => {
    const idRegisto = req.params.id; 
    const idUtilizadorLogado = req.session.userId; // O ID de quem clicou no botão

    // 1. Verifica se a pessoa tem login feito
    if (!idUtilizadorLogado) {
        return res.status(401).json({ error: "Sessão inválida ou expirada." });
    }

    try {
        // 2. A MAGIA: Só apaga se o registo for X E pertencer ao Utilizador Y
        const resultado = await db.sequelize.query(
            "DELETE FROM Sinal_Vital WHERE id = ? AND id_utilizador = ?", 
            {
                replacements: [idRegisto, idUtilizadorLogado],
                type: db.sequelize.QueryTypes.DELETE
            }
        );

        res.status(200).json({ message: "Registo apagado com sucesso!" });

    } catch (error) {
        console.error("Erro ao apagar no backend:", error);
        res.status(500).json({ error: "Erro interno ao tentar apagar." });
    }
};