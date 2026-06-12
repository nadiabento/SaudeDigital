const mysql = require("mysql2/promise");
const { Sequelize } = require("sequelize");
require("dotenv").config();

// 1. LIGAÇÃO TRADICIONAL POOL (Com SSL para o Aiven)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 23614,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false, // Obrigatório para o Aiven Cloud
  },
});

// 2. INSTÂNCIA DO SEQUELIZE (Com SSL para o Aiven)
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 23614,
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Obrigatório para o Aiven Cloud
      },
    },
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
      "✔ Sequelize: Conexão com o servidor do Aiven estabelecida com sucesso!",
    ),
  )
  .catch((err) => {
    console.error("❌ Sequelize: Erro crítico de credenciais no Aiven:");
    console.error(err.message);
  });

// 3. RETORNO DE COMPATIBILIDADE HÍBRIDA
pool.Sequelize = Sequelize;
pool.sequelize = sequelize;
pool.define = sequelize.define.bind(sequelize);

module.exports = pool;
