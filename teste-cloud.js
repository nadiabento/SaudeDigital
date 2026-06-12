const { Sequelize } = require("sequelize");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// 1. Testar Conexão com o Aiven (MySQL)
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Obrigatório para o Aiven
      },
    },
    logging: false,
  },
);

// 2. Testar Conexão com o Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

async function correrTeste() {
  console.log("🚀 A iniciar testes de infraestrutura cloud...");

  // --- TESTE 1: AIVEN ---
  try {
    await sequelize.authenticate();
    console.log(
      "✅ [Aiven MySQL] Conexão bem-sucedida! O Sequelize conseguiu entrar na defaultdb.",
    );
  } catch (error) {
    console.error("❌ [Aiven MySQL] Erro de conexão:", error.message);
  }

  // --- TESTE 2: SUPABASE STORAGE ---
  try {
    // Vamos criar um ficheiro de texto falso para simular um upload de PDF
    const nomeFicheiroFalso = `teste-${Date.now()}.txt`;
    const conteudoFalso = "Ficheiro de teste para o sistema SaudeDigital.";

    console.log(
      `\n📤 A tentar enviar ficheiro para o bucket '${process.env.SUPABASE_BUCKET}'...`,
    );

    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(nomeFicheiroFalso, Buffer.from(conteudoFalso), {
        contentType: "text/plain",
      });

    if (error) throw error;

    // Ir buscar a URL pública
    const { data: urlData } = supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(nomeFicheiroFalso);

    console.log("✅ [Supabase Storage] Upload concluído com sucesso!");
    console.log(`🔗 Link público gerado: ${urlData.publicUrl}`);
    console.log(
      "\n✨ Se o link acima abrir no teu browser, a tua nuvem está 100% operacional!",
    );
  } catch (error) {
    console.error("❌ [Supabase Storage] Erro no upload:", error.message);
  }

  process.exit();
}

correrTeste();
