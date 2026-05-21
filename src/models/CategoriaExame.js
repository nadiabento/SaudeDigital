const { DataTypes } = require("sequelize");
const sequelize = require("../config/db"); // A tua ligação Sequelize

const CategoriaExame = sequelize.define(
  "CategoriaExame",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id", // Mapeia exatamente para a coluna da BD
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "Categoria_Exame",
    timestamps: false,
  },
);

module.exports = CategoriaExame;
