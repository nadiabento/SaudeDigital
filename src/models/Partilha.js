const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Partilha = sequelize.define(
  "Partilha",
  {
    token: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false,
      autoIncrement: false, // Força o Sequelize a não procurar um ID numérico
      field: "token",
    },
    exames_ids: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "exames_ids",
    },
    data_expiracao: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "data_expiracao",
    },
    utilizador_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "utilizador_id", // Bate certo com o teu field 'utilizador_id' do Workbench
    },
  },
  {
    tableName: "Partilha",
    timestamps: false,
  },
);

module.exports = Partilha;
