const db = require("../config/db"); // Liga à tua base de dados

// Função para apagar um registo
exports.apagar = async (req, res) => {
    // O ID vem do pedido do cliente (ex: o número 55)
    const idRegisto = req.params.id; 

    try {
        // Pede à base de dados para apagar. 
        // ATENÇÃO: Confirma se o nome da tua tabela é mesmo 'SinaisVitais' ou 'SinalVital'
        await db.sequelize.query(
            "DELETE FROM SinaisVitais WHERE id = ?", 
            {
                replacements: [idRegisto],
                type: db.sequelize.QueryTypes.DELETE
            }
        );

        // Responde ao Frontend: "Tudo OK, apaguei!"
        res.status(200).json({ message: "Registo apagado com sucesso!" });

    } catch (error) {
        console.error("Erro ao apagar no backend:", error);
        res.status(500).json({ error: "Erro interno ao tentar apagar." });
    }
};