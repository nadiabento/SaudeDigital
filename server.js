const express = require("express");
const session = require("express-session");
const path = require("node:path");
const db = require("./src/config/db");
const examenRoutes = require("./src/routes/exameRoutes");
const authRoutes = require("./src/routes/authRoutes");
const medRoutes = require("./src/routes/medRoutes");
const consultaRoutes = require("./src/routes/consultaRoutes");
const sinalVitalRoutes = require("./src/routes/sinalVitalRoutes");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Configuração da pasta pública de uploads
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Configuração de Sessão de Utilizador
app.use(
  session({
    secret: process.env.SESSION_SECRET || "chave_de_reserva_segura",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }),
);

// --- ROTAS DA API ---
app.use("/api/exames", examenRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/medicacao", medRoutes);
app.use("/api/consultas", consultaRoutes);
app.use("/api/sinais-vitais", sinalVitalRoutes);

// --- ROTA DIRETA DO DASHBOARD (RESUMO) ---
app.get("/api/dashboard/resumo", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ erro: "Não autenticado" });

    // 1. Procurar a PRÓXIMA consulta
    const [consultas] = await db.execute(
      "SELECT data_hora FROM Consulta WHERE id_utilizador = ? AND data_hora >= NOW() ORDER BY data_hora ASC LIMIT 1",
      [userId],
    );

    let proximaConsulta = "Sem consultas";
    if (consultas.length > 0) {
      const data = new Date(consultas[0].data_hora);
      proximaConsulta =
        data.toLocaleDateString("pt-PT") +
        " às " +
        data.toLocaleTimeString("pt-PT", {
          hour: "2-digit",
          minute: "2-digit",
        });
    }

    // 2. Contar os Medicamentos ATIVOS
    const [medicamentos] = await db.execute(
      "SELECT COUNT(*) as total FROM Medicamento WHERE id_utilizador = ? AND estado = 'Ativo'",
      [userId],
    );
    const totalMedicamentos = medicamentos[0].total;

    // 3. Contar os Efeitos Secundários
    const [efeitos] = await db.execute(
      `SELECT COUNT(*) as total FROM Efeito_Secundario e 
             JOIN Medicamento m ON e.id_medicamento = m.id 
             WHERE m.id_utilizador = ?`,
      [userId],
    );
    const totalEfeitos = efeitos[0].total;

    res.status(200).json({ proximaConsulta, totalMedicamentos, totalEfeitos });
  } catch (error) {
    console.error("Erro no Dashboard:", error);
    res.status(500).json({ erro: "Erro ao carregar os dados" });
  }
});

// --- GUARDAR NOVO SINAL VITAL ---
app.post("/api/dashboard/sinais-vitais", async (req, res) => {
  try {
    const userId = req.session.userId;
    const { data_registo, tipo_metrica, valor_primario, valor_secundario } =
      req.body;

    if (!userId) return res.status(401).json({ erro: "Não autenticado" });

    await db.execute(
      `INSERT INTO Sinal_Vital (id_utilizador, tipo_metrica, valor_primario, valor_secundario, data_registo) 
             VALUES (?, ?, ?, ?, ?)`,
      [userId, tipo_metrica, valor_primario, valor_secundario, data_registo],
    );

    res.status(201).json({ mensagem: "Registo guardado!" });
  } catch (error) {
    console.error("Erro ao guardar sinal vital:", error);
    res.status(500).json({ erro: "Erro interno ao guardar na BD" });
  }
});

// --- ROTA PARA OS GRÁFICOS (Histórico) ---
app.get("/api/dashboard/historico-vitals", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ erro: "Não autenticado" });

    const [registos] = await db.execute(
      `SELECT tipo_metrica, valor_primario, valor_secundario, data_registo 
         FROM Sinal_Vital 
         WHERE id_utilizador = ? 
         AND tipo_metrica IN ('Frequencia Cardiaca', 'Glicose', 'Pressao Arterial', 'Peso', 'Colesterol')
         ORDER BY data_registo ASC LIMIT 50`,
      [userId],
    );

    res.status(200).json(registos);
  } catch (error) {
    console.error("Erro nos gráficos:", error);
    res.status(500).json({ erro: "Erro ao carregar gráficos" });
  }
});

// --- ROTA CRUD PARA SINAIS VITAIS (CRUD COMPLETO) ---
app.get("/api/vitals", async (req, res) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ erro: "Não autenticado" });
    const [results] = await db.execute(
      "SELECT * FROM Sinal_Vital WHERE id_utilizador = ? ORDER BY data_registo DESC",
      [req.session.userId],
    );
    res.json(results);
  } catch (err) {
    res.status(500).send("Erro ao buscar");
  }
});

app.delete("/api/vitals/:id", async (req, res) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ erro: "Não autenticado" });
    await db.execute(
      "DELETE FROM Sinal_Vital WHERE id = ? AND id_utilizador = ?",
      [req.params.id, req.session.userId],
    );
    res.send("Apagado com sucesso");
  } catch (err) {
    res.status(500).send("Erro ao apagar");
  }
});

app.post("/api/vitals", async (req, res) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ erro: "Não autenticado" });
    const { id, data, tipo, valor1, valor2 } = req.body;
    if (id) {
      await db.execute(
        "UPDATE Sinal_Vital SET data_registo=?, tipo_metrica=?, valor_primario=?, valor_secundario=? WHERE id=? AND id_utilizador=?",
        [data, tipo, valor1, valor2, id, req.session.userId],
      );
      res.send("Atualizado");
    } else {
      await db.execute(
        "INSERT INTO Sinal_Vital (id_utilizador, data_registo, tipo_metrica, valor_primario, valor_secundario) VALUES (?, ?, ?, ?, ?)",
        [req.session.userId, data, tipo, valor1, valor2],
      );
      res.send("Criado");
    }
  } catch (err) {
    res.status(500).send("Erro na operação");
  }
});

// INICIALIZAÇÃO E TESTE DA DB
db.getConnection()
  .then((connection) => {
    console.log("SUCESSO: Ligação à Base de Dados estabelecida!");
    connection.release();
    app.listen(PORT, () => {
      console.log(`Servidor a correr em http://localhost:${PORT}`);
    });
  })
  .catch((error_) => {
    console.error("ERRO de BD:", error_.message);
  });
