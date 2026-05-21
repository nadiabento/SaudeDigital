const mysql = require("mysql2/promise");
const { Sequelize } = require("sequelize");
require("dotenv").config();

// 1. LIGAÇÃO TRADICIONAL (Ajustada para DB_PASS e DB_PORT do teu .env)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS, // Sincronizado com o teu .env
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306, // Garante que usa a porta 3306 da UA
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 2. INSTÂNCIA DO SEQUELIZE (Corrigida com os mapeamentos exatos e parâmetros explícitos)
const sequelize = new Sequelize(
  process.env.DB_NAME, // Nome da BD
  process.env.DB_USER, // Utilizador
  process.env.DB_PASS, // Sincronizado para ler a tua password (E&dDa6aQCWH5s5zJ)
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: false, // Mantém os logs de SQL limpos no terminal
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

// Testar a ligação do Sequelize em background
sequelize
  .authenticate()
  .then(() =>
    console.log(
      "✔ Sequelize: Conexão com o servidor da UA estabelecida com sucesso!",
    ),
  )
  .catch((err) => {
    console.error("❌ Sequelize: Erro crítico de credenciais na UA:");
    console.error(err.message);
  });

// 3. RETORNO DE COMPATIBILIDADE HÍBRIDA
pool.Sequelize = Sequelize;
pool.sequelize = sequelize;
pool.define = sequelize.define.bind(sequelize);

module.exports = pool;
