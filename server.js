const express = require("express");
const session = require("express-session"); // ADICIONADO: Para gerir o login
const db = require("./src/config/db");
const exameRoutes = require("./src/routes/exameRoutes");
const authRoutes = require("./src/routes/authRoutes"); 
const clinicaRoutes = require("./src/routes/clinicaRoutes"); // <-- NOVA ROTA AQUI
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Permite que o Express entenda dados enviados em formato JSON (essencial para API)
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ADICIONADO: Extra segurança para leitura de formulários

// Serve os ficheiros estáticos (HTML, CSS, JS do frontend)
app.use(express.static("public"));

// ADICIONADO: Configuração das sessões (para o utilizador ficar com sessão iniciada)
app.use(session({
    secret: process.env.SESSION_SECRET || 'chave_de_reserva_segura',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

// --- ROTAS DA API ---

// Regista as rotas de exames da equipa com o prefixo /api/exames
app.use("/api/exames", exameRoutes);

// Regista as tuas rotas de autenticação com o prefixo /api/auth
app.use("/api/auth", authRoutes);

// Regista as rotas da clinica (Unidades, Especialidades, Médicos) 
app.use("/api/clinica", clinicaRoutes); // 


// INICIALIZAÇÃO E TESTE DA DB 

db.getConnection()
  .then((connection) => {
    console.log("SUCESSO: Ligação à Base de Dados da ESTGA estabelecida!");
    connection.release();

    app.listen(PORT, () => {
      console.log(`Servidor a correr em http://localhost:${PORT}`);
      console.log(`Frontend: http://localhost:${PORT}/index.html`);
      console.log(`API Categorias: http://localhost:${PORT}/api/exames/categorias`);
      console.log(`API Autenticação: Pronta a receber pedidos em /api/auth`); 
      console.log(`API Clínica: Pronta a receber pedidos em /api/clinica`); 
    });
  })
  .catch((erro) => {
    console.error(
      "ERRO: Falha crítica na ligação à Base de Dados:",
      erro.message,
    );
  });