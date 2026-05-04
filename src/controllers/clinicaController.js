const db = require('../config/db'); // Ligação à base de dados

// 1. Obter todas as Unidades de Saúde
exports.getUnidades = async (req, res) => {
    try {
        const [unidades] = await db.query('SELECT * FROM Unidade_Saude');
        res.json(unidades);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao obter unidades de saúde' });
    }
};

// 2. Obter Especialidades que existem numa Unidade específica
exports.getEspecialidadesDaUnidade = async (req, res) => {
    try {
        const { id_unidade } = req.params;
        // Fazemos um JOIN para ir buscar apenas as especialidades que têm médicos nessa unidade
        const query = `
            SELECT DISTINCT e.id_especialidade, e.nome 
            FROM Especialidade e
            JOIN Medico m ON e.id_especialidade = m.id_especialidade
            WHERE m.id_unidade = ?
        `;
        const [especialidades] = await db.query(query, [id_unidade]);
        res.json(especialidades);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao obter especialidades' });
    }
};

// 3. Obter Médicos de uma Especialidade e Unidade específicas
exports.getMedicos = async (req, res) => {
    try {
        const { id_unidade, id_especialidade } = req.params;
        const query = 'SELECT id_medico, nome FROM Medico WHERE id_unidade = ? AND id_especialidade = ?';
        const [medicos] = await db.query(query, [id_unidade, id_especialidade]);
        res.json(medicos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao obter médicos' });
    }
};