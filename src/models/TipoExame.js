const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const CategoriaExame = require("./CategoriaExame");

const TipoExame = sequelize.define(
  "TipoExame",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    id_categoria: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: CategoriaExame, key: "id" },
    },
  },
  {
    tableName: "Tipo_Exame",
    timestamps: false,
  },
);

// Relacionamento Cascata: Uma Categoria tem muitos Tipos
CategoriaExame.hasMany(TipoExame, { foreignKey: "id_categoria" });
TipoExame.belongsTo(CategoriaExame, { foreignKey: "id_categoria" });

module.exports = TipoExame;
