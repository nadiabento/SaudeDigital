const express = require("express");
const db = require("./src/config/db");
const exameRoutes = require("./src/routes/exameRoutes"); // Importar as novas rotas
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Permite que o Express entenda dados enviados em formato JSON (essencial para API)
app.use(express.json());

// Serve os ficheiros estáticos (HTML, CSS, JS do frontend)
app.use(express.static("public"));

// ROTAS DA AP

// Regista as rotas de exames com o prefixo /api/exames
app.use("/api/exames", exameRoutes);

//INICIALIZAÇÃO E TESTE DA DB ---

db.getConnection()
  .then((connection) => {
    console.log("SUCESSO: Ligação à Base de Dados da ESTGA estabelecida!");
    connection.release();

    app.listen(PORT, () => {
      console.log(`Servidor a correr em http://localhost:${PORT}`);
      console.log(`Frontend: http://localhost:${PORT}`);
      console.log(
        `API Categorias: http://localhost:${PORT}/api/exames/categorias`,
      );
    });
  })
  .catch((erro) => {
    console.error(
      "ERRO: Falha crítica na ligação à Base de Dados:",
      erro.message,
    );
  });

console.log("Conteúdo de exameRoutes:", exameRoutes);
app.use("/api/exames", exameRoutes);
