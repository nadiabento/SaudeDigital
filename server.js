const express = require('express');
const db = require('./src/config/db'); 
require('dotenv').config();

const app = express();

// FASE I: Servir as páginas HTML/CSS estáticas 
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// FASE I: Testar se a Base de Dados está online no servidor da ESTGA
db.getConnection()
    .then((connection) => {
        console.log('SUCESSO: A Base de Dados da ESTGA (Fase I) está ligada!');
        connection.release(); 
        
        app.listen(PORT, () => {
            console.log(`Páginas HTML da Fase I a correr em http://localhost:${PORT}`);
        });
    })
    .catch((erro) => {
        console.error('ERRO: Não foi possível ligar à Base de Dados.', erro.message);
    });