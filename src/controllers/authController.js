// src/controllers/authController.js
const bcrypt = require('bcrypt'); 
const User = require('../models/User'); 

const authController = {
    // 1. Função de Registo
    registar: async (req, res) => {
        try {
            const { nome, email, password, data_nascimento, grupo_sanguineo } = req.body;

            const utilizadorExistente = await User.encontrarEmail(email);
            if (utilizadorExistente) {
                return res.status(400).json({ erro: 'Este e-mail já está registado.' });
            }

            const password_hash = await bcrypt.hash(password, 10);

            const novoUserId = await User.criar({
                nome,
                email,
                password_hash,
                data_nascimento,
                grupo_sanguineo
            });

            res.status(201).json({ mensagem: 'Conta criada com sucesso!', id: novoUserId });

        } catch (error) {
            console.error(error);
            res.status(500).json({ erro: 'Erro interno no servidor ao registar.' });
        }
    },

    // 2. Função de Login
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            const utilizador = await User.encontrarEmail(email);
            
            if (!utilizador) {
                return res.status(401).json({ erro: 'E-mail ou palavra-passe incorretos.' });
            }

            const passwordCorreta = await bcrypt.compare(password, utilizador.password_hash);
            
            if (!passwordCorreta) {
                return res.status(401).json({ erro: 'E-mail ou palavra-passe incorretos.' });
            }

            req.session.userId = utilizador.id; 

            res.status(200).json({ mensagem: 'Login efetuado com sucesso!', redirecionar: '/dashboard.html' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ erro: 'Erro interno no servidor ao fazer login.' });
        }
    }
};

module.exports = authController;