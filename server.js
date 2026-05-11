const express = require("express");
const session = require("express-session"); 
const db = require("./src/config/db");
const exameRoutes = require("./src/routes/exameRoutes");
const authRoutes = require("./src/routes/authRoutes"); 
const medRoutes = require("./src/routes/medRoutes");
const consultaRoutes = require("./src/routes/consultaRoutes"); 
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const path = require("path");
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'chave_de_reserva_segura',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

// --- ROTAS DA API ---
app.use("/api/exames", exameRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/medicacao", medRoutes);
app.use("/api/consultas", consultaRoutes); 

// INICIALIZAÇÃO E TESTE DA DB 
db.getConnection()
  .then((connection) => {
    console.log("SUCESSO: Ligação à Base de Dados da ESTGA estabelecida!");
    connection.release();

    app.listen(PORT, () => {
      console.log(`Servidor a correr em http://localhost:${PORT}`);
      console.log(`API Exames: /api/exames`);
      console.log(`API Autenticação: /api/auth`);
      console.log(`API Medicação: /api/medicacao`);
      console.log(`API Consultas: /api/consultas`); 
    });
  })
  .catch((erro) => {
    console.error("ERRO: Falha crítica na ligação à Base de Dados:", erro.message);
  });