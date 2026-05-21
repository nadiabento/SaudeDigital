const express = require("express");
const session = require("express-session");
const path = require("path"); // Mover para o topo junto dos restantes módulos
const db = require("./src/config/db");
const exameRoutes = require("./src/routes/exameRoutes");
const authRoutes = require("./src/routes/authRoutes");
const medRoutes = require("./src/routes/medRoutes");
const consultaRoutes = require("./src/routes/consultaRoutes");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Configuração da pasta pública de uploads para ficheiros anexados (ex: PDFs de exames)
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Configuração de Sessão de Utilizador
app.use(
  session({
    secret: process.env.SESSION_SECRET || "chave_de_reserva_segura",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Definir como true se usares HTTPS em produção
  }),
);

// --- ROTAS DA API ---
app.use("/api/exames", exameRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/medicacao", medRoutes);
app.use("/api/consultas", consultaRoutes);

// --- ROTA DIRETA DO DASHBOARD (RESUMO) ---
app.get("/api/dashboard/resumo", async (req, res) => {
  console.log("ALERTA: O Safari acabou de pedir o resumo do Dashboard!");

  try {
    const userId = req.session.userId;
    if (!userId) {
      console.log("Aviso: Tentativa de ver dashboard sem login.");
      return res.status(401).json({ erro: "Não autenticado" });
    }

    // 1. Procurar a PRÓXIMA consulta agendada
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

    // 3. Contar os Efeitos Secundários registados associados aos medicamentos do utilizador
    const [efeitos] = await db.execute(
      `SELECT COUNT(*) as total 
             FROM Efeito_Secundario e 
             JOIN Medicamento m ON e.id_medicamento = m.id 
             WHERE m.id_utilizador = ?`,
      [userId],
    );
    const totalEfeitos = efeitos[0].total;

    console.log("Sucesso: A enviar dados para o frontend!");
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

    // Inserção na base de dados utilizando Prepared Statements para evitar SQL Injection
    await db.execute(
      `INSERT INTO Sinal_Vital (id_utilizador, tipo_metrica, valor_primario, valor_secundario, data_registo) 
             VALUES (?, ?, ?, ?, ?)`,
      [userId, tipo_metrica, valor_primario, valor_secundario, data_registo],
    );

    console.log(
      `Sucesso: ${tipo_metrica} registado para o utilizador ${userId}`,
    );
    res.status(201).json({ mensagem: "Registo guardado!" });
  } catch (error) {
    console.error("Erro ao guardar sinal vital:", error);
    res.status(500).json({ erro: "Erro interno ao guardar na BD" });
  }
});

// --- ROTA PARA OS GRÁFICOS  ---
app.get("/api/dashboard/historico-vitals", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ erro: "Não autenticado" });


        // Adicionados 'Peso' e 'Colesterol' no filtro SQL
        const [registos] = await db.execute(
            `SELECT tipo_metrica, valor_primario, valor_secundario, data_registo 
             FROM Sinal_Vital 
             WHERE id_utilizador = ? AND tipo_metrica IN ('Frequencia Cardiaca', 'Glicose', 'Pressao Arterial', 'Peso', 'Colesterol')
             ORDER BY data_registo ASC LIMIT 50`,
            [userId]
        );



    res.status(200).json(registos);
  } catch (error) {
    console.error("Erro nos gráficos:", error);
    res.status(500).json({ erro: "Erro ao carregar gráficos" });
  }
});

// INICIALIZAÇÃO E TESTE DA DB 
db.getConnection()
  .then((connection) => {
    console.log("SUCESSO: Ligação à Base de Dados estabelecida!");
    connection.release(); // Liberta a conexão de volta para o Pool de conexões

    app.listen(PORT, () => {
      console.log(`Servidor a correr em http://localhost:${PORT}`);
      console.log(`API Dashboard está ATIVA em: /api/dashboard/resumo`);
    });
  })
  .catch((erro) => {
    console.error("ERRO de BD:", erro.message);
  });
