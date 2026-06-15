const mysql = require("mysql2/promise");
const { Sequelize } = require("sequelize");
require("dotenv").config();

// 1. LIGAÇÃO TRADICIONAL POOL LOCAL
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "defaultdb",
  port: Number(process.env.DB_PORT) || 3306, //
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 2. INSTÂNCIA DO SEQUELIZE LOCAL
const sequelize = new Sequelize(
  process.env.DB_NAME || "defaultdb",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: false,
    dialectOptions: {},
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

// Testar a ligação do Sequelize no Workbench
sequelize
  .authenticate()
  .then(() =>
    console.log(
      "✔ Sequelize: Conexão com o MySQL WORKBENCH LOCAL estabelecida com sucesso!",
    ),
  )
  .catch((err) => {
    console.error("❌ Sequelize: Erro de ligação ao Workbench Local:");
    console.error(err.message);
  });

// 3. RETORNO DE COMPATIBILIDADE HÍBRIDA
pool.Sequelize = Sequelize;
pool.sequelize = sequelize;
pool.define = sequelize.define.bind(sequelize);

module.exports = pool;
