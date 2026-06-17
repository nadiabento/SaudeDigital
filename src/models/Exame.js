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

// Mapeamento da Tabela Ponte (Exame_TipoExame) com atributos extras
const ExameTipoExame = sequelize.define(
  "ExameTipoExame",
  {
    resultado: {
      type: DataTypes.STRING, // Guarda o PDF do Exame
      allowNull: true,
    },
    relatorio: {
      type: DataTypes.STRING, //
      allowNull: true,
    },
  },
  {
    tableName: "Exame_TipoExame",
    timestamps: false,
  },
);

// Configuração de N para N (BelongsToMany)
Exame.belongsToMany(TipoExame, {
  through: ExameTipoExame,
  foreignKey: "id_exame",
});
TipoExame.belongsToMany(Exame, {
  through: ExameTipoExame,
  foreignKey: "id_tipo_exame",
});

// Exportamos os modelos e a tabela ponte estruturada
module.exports = { Exame, TipoExame, ExameTipoExame };
