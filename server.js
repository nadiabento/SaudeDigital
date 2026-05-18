const express = require("express");
const session = require("express-session"); 
const db = require("./src/config/db");
const exameRoutes = require("./src/routes/exameRoutes");
const authRoutes = require("./src/routes/authRoutes"); 
const medRoutes = require("./src/routes/medRoutes");
const consultaRoutes = require("./src/routes/consultaRoutes"); 
require("dotenv").config();

// <--- ADICIONADO: Bibliotecas para o envio de emails automáticos
const cron = require('node-cron');
const nodemailer = require('nodemailer');

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

// <--- ADICIONADO: Configuração da conta de email que vai enviar os lembretes
// (Aconselho a criarem um Gmail de propósito para o projeto SaúdeDigital)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'saudedigital.projeto@gmail.com', 
        pass: process.env.EMAIL_PASS || 'vossa_password_de_aplicacao' 
    }
});

// INICIALIZAÇÃO E TESTE DA DB 
db.getConnection()
  .then((connection) => {
    console.log("SUCESSO: Ligação à Base de Dados da ESTGA estabelecida!");
    connection.release();

    // <--- ADICIONADO: Tarefa Automática que corre todos os dias às 08:00
    cron.schedule('0 8 * * *', async () => {
        console.log('⏰ A iniciar verificação de consultas para amanhã...');
        
        try {
            // Consulta MySQL para ir buscar apenas as consultas do dia seguinte
            // (Atenção: verifica se os nomes das tuas tabelas batem certo com este código)
            const query = `
                SELECT c.data_hora, m.nome AS medico, e.nome AS especialidade, u.email AS paciente_email
                FROM consultas c
                JOIN medicos m ON c.id_medico = m.id_medico
                JOIN especialidades e ON c.id_especialidade = e.id_especialidade
                JOIN utilizadores u ON c.id_utilizador = u.id_utilizador
                WHERE DATE(c.data_hora) = CURDATE() + INTERVAL 1 DAY
            `;
            
            // Fazemos o pedido à base de dados MySQL
            const [consultasDeAmanha] = await db.query(query);

            if (consultasDeAmanha.length > 0) {
                // Loop: envia um email por cada consulta encontrada
                for (const consulta of consultasDeAmanha) {
                    const horaFormatada = new Date(consulta.data_hora).toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'});
                    
                    const mensagem = {
                        from: process.env.EMAIL_USER || 'saudedigital.projeto@gmail.com',
                        to: consulta.paciente_email,
                        subject: 'SaúdeDigital - Lembrete de Consulta 🩺',
                        text: `Olá! Lembramos que tem uma consulta de ${consulta.especialidade} com ${consulta.medico} amanhã às ${horaFormatada}. Não se atrase!`
                    };

                    await transporter.sendMail(mensagem);
                    console.log(`✅ Lembrete enviado com sucesso para ${consulta.paciente_email}`);
                }
            } else {
                console.log('💤 Não há consultas agendadas para amanhã.');
            }

        } catch (erro) {
            console.error('❌ Erro a verificar as consultas ou a enviar emails:', erro);
        }
    });

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