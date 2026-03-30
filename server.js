// 1. Importar as bibliotecas necessárias
const express = require('express');
const dotenv = require('dotenv');
const db = require('./src/config/db'); // Ligação que o Elemento 1 criou

// 2. Configurar as variáveis de ambiente (do ficheiro .env)
dotenv.config();

const app = express();

// 3. Middlewares básicos
app.use(express.json()); // Para o Elemento 4 conseguir receber dados em JSON [cite: 7]
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Para o Elemento 3 mostrar o protótipo HTML 

// 4. Importar as Rotas (Cada elemento terá o seu ficheiro)
const authRoutes = require('./src/routes/authRoutes');
const clinicaRoutes = require('./src/routes/clinicaRoutes');
const medRoutes = require('./src/routes/medRoutes');

// 5. Usar as Rotas
app.use('/auth', authRoutes);
app.use('/clinica', clinicaRoutes);
app.use('/medicacao', medRoutes);

// 6. Rota base para testar se o servidor está vivo
app.get('/', (req, res) => {
    res.send('Servidor de Gestão Clínica a funcionar! 🚀');
});

// 7. Arrancar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});