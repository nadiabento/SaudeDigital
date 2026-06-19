const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const TipoExame = require("./TipoExame");

const Exame = sequelize.define(
  "Exame",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    data_exame: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    local_realizacao: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    utilizador_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "Exame",
    timestamps: false,
  },
);

const ExameTipoExame = sequelize.define(
  "ExameTipoExame",
  {
    id_exame: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: "Exame", key: "id" },
      field: "id_exame",
    },
    id_tipo_exame: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: "Tipo_Exame", key: "id" },
      field: "id_tipo_exame",
    },
    resultado: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    relatorio: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "Exame_TipoExame",
    timestamps: false,
  },
);

// Vinculação explícita de chaves para anular o CamelCase automático
Exame.belongsToMany(TipoExame, {
  through: ExameTipoExame,
  foreignKey: "id_exame",
  otherKey: "id_tipo_exame",
});
TipoExame.belongsToMany(Exame, {
  through: ExameTipoExame,
  foreignKey: "id_tipo_exame",
  otherKey: "id_exame",
});

module.exports = { Exame, TipoExame, ExameTipoExame };
