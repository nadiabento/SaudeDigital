const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Partilha = sequelize.define(
  "Partilha",
  {
    id_partilha: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id_partilha",
    },
    token: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
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
      field: "utilizador_id",
    },
  },
  {
    tableName: "Partilha",
    timestamps: false,
  },
);

module.exports = Partilha;
