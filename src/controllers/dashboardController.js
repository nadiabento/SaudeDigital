// src/controllers/dashboardController.js
const db = require('../config/db');

const dashboardController = {
    resumo: async (req, res) => {
        try {
            // Vai buscar o ID do utilizador que fez login
            const userId = req.session.userId;
            
            if (!userId) {
                return res.status(401).json({ erro: "Utilizador não autenticado" });
            }

            // 1. Procurar a PRÓXIMA consulta (a primeira que seja depois de hoje)
            const [consultas] = await db.execute(
                'SELECT data_hora FROM Consulta WHERE id_utilizador = ? AND data_hora >= NOW() ORDER BY data_hora ASC LIMIT 1',
                [userId]
            );
            
            let proximaConsulta = "Sem consultas";
            if (consultas.length > 0) {
                const data = new Date(consultas[0].data_hora);
                // Formata a data para ficar bonita (Ex: 15/05/2026 às 14:30)
                proximaConsulta = data.toLocaleDateString('pt-PT') + ' às ' + data.toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'});
            }

            // 2. Contar os Medicamentos ATIVOS
            const [medicamentos] = await db.execute(
                "SELECT COUNT(*) as total FROM Medicamento WHERE id_utilizador = ? AND estado = 'Ativo'",
                [userId]
            );
            const totalMedicamentos = medicamentos[0].total;

            // 3. Contar os Efeitos Secundários
            const [efeitos] = await db.execute(
                'SELECT COUNT(*) as total FROM Efeito_Secundario WHERE id_utilizador = ?',
                [userId]
            );
            const totalEfeitos = efeitos[0].total;

            // Envia tudo empacotado para o teu Frontend!
            res.status(200).json({
                proximaConsulta,
                totalMedicamentos,
                totalEfeitos
            });

        } catch (error) {
            console.error("Erro no Dashboard:", error);
            res.status(500).json({ erro: "Erro ao carregar os dados" });
        }
    }
};

module.exports = dashboardController;