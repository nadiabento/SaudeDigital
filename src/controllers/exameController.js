const db = require("../config/db");
const fs = require("fs");
const path = require("path");

/**
 * --- LISTAGENS (GET) ---
 */

// Listar categorias em ordem alfabética
exports.listarCategorias = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM Categoria_Exame ORDER BY nome ASC",
    );
    res.json(rows);
  } catch (error) {
    console.error("Erro ao listar categorias:", error);
    res.status(500).json({ error: "Erro ao buscar categorias" });
  }
};

// Listar tipos filtrados por categoria
exports.listarTiposPorCategoria = async (req, res) => {
  const { id_categoria } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT id, nome FROM Tipo_Exame WHERE id_categoria = ? ORDER BY nome ASC",
      [id_categoria],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar tipos" });
  }
};

// Listar histórico completo com JOINs
exports.listarHistorico = async (req, res) => {
  try {
    const query = `
            SELECT E.id, E.data_exame AS data, TE.nome, ETE.resultado 
            FROM Exame E
            JOIN Exame_TipoExame ETE ON E.id = ETE.id_exame
            JOIN Tipo_Exame TE ON ETE.id_tipo_exame = TE.id
            ORDER BY E.data_exame DESC`;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * --- CRIAÇÃO (POST) ---
 */

// Criar nova Classe/Categoria via Modal
exports.criarCategoria = async (req, res) => {
  console.log("Recebido pedido para criar categoria:", req.body); // Debug no terminal
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: "O nome é obrigatório." });

    await db.query("INSERT INTO Categoria_Exame (nome) VALUES (?)", [nome]);
    res.status(201).json({ message: "Categoria criada!" });
  } catch (error) {
    console.error("Erro SQL criarCategoria:", error);
    res.status(500).json({ error: error.message });
  }
};

// Criar novo Tipo de Exame via Modal
exports.criarTipo = async (req, res) => {
  console.log("📥 Recebido pedido para criar tipo:", req.body);
  try {
    const { nome, id_categoria } = req.body;

    // Adicionado valor para 'descricao' caso a tua tabela exija (podes mudar para texto vazio)
    const query =
      "INSERT INTO Tipo_Exame (nome, id_categoria, descricao) VALUES (?, ?, ?)";
    await db.query(query, [nome, id_categoria, "Adicionado manualmente"]);

    res.status(201).json({ message: "Tipo criado!" });
  } catch (error) {
    console.error("Erro SQL criarTipo:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * --- REGISTO PRINCIPAL (UPLOAD) ---
 */

exports.registarExame = async (req, res) => {
  const { data_exame, observacoes, id_tipo_exame, local_realizacao } = req.body;
  const nomeFicheiro = req.file ? req.file.filename : null;

  // --- RECOLHA DO ID (Tem de ser igual ao que está no authController) ---
  const utilizadorId = req.session.userId;

  console.log("Sessão atual:", req.session); // Debug: verifica se o ID aparece no terminal

  if (!utilizadorId) {
    return res
      .status(401)
      .json({ error: "Sessão expirada. Por favor, faça login novamente." });
  }

  try {
    const [resultExame] = await db.query(
      "INSERT INTO Exame (data_exame, local_realizacao, observacoes, utilizador_id) VALUES (?, ?, ?, ?)",
      [
        data_exame,
        local_realizacao || "SaúdeDigital Clinic",
        observacoes,
        utilizadorId,
      ],
    );

    await db.query(
      "INSERT INTO Exame_TipoExame (id_exame, id_tipo_exame, resultado) VALUES (?, ?, ?)",
      [resultExame.insertId, id_tipo_exame, nomeFicheiro],
    );

    res.status(200).json({ message: "Exame guardado com sucesso!" });
  } catch (error) {
    console.error("Erro SQL:", error);
    res.status(500).json({ error: "Erro ao guardar exame." });
  }
};

// Também deves filtrar o histórico para o utilizador não ver exames de outras pessoas
exports.listarHistorico = async (req, res) => {
  const utilizadorId = req.session.userId;

  if (!utilizadorId) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const query = `
            SELECT E.id, E.data_exame AS data, TE.nome, ETE.resultado 
            FROM Exame E
            JOIN Exame_TipoExame ETE ON E.id = ETE.id_exame
            JOIN Tipo_Exame TE ON ETE.id_tipo_exame = TE.id
            WHERE E.utilizador_id = ?
            ORDER BY E.data_exame DESC`;

    const [rows] = await db.query(query, [utilizadorId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- ELIMINAR EM MASSA (E INDIVIDUAL) ---
// --- ELIMINAR EM MASSA (E INDIVIDUAL) ---
exports.eliminarMassa = async (req, res) => {
  const { ids } = req.body;
  const utilizadorId = req.session.userId;

  if (!utilizadorId) {
    return res
      .status(401)
      .json({ error: "Sessão expirada. Faça login novamente." });
  }

  if (!ids || ids.length === 0) {
    return res.status(400).json({ error: "Nenhum exame selecionado." });
  }

  try {
    // 1. Procurar os nomes dos ficheiros PDF para apagar do disco
    const [ficheiros] = await db.query(
      "SELECT resultado FROM Exame_TipoExame WHERE id_exame IN (?)",
      [ids],
    );

    // 2. Apagar primeiro da tabela Exame_TipoExame (tabela filha)
    await db.query("DELETE FROM Exame_TipoExame WHERE id_exame IN (?)", [ids]);

    // 3. Apagar da tabela Exame (tabela pai), validando o dono
    const [resultado] = await db.query(
      "DELETE FROM Exame WHERE id IN (?) AND utilizador_id = ?",
      [ids, utilizadorId],
    );

    // 4. Remover os ficheiros físicos da pasta uploads
    if (resultado.affectedRows > 0) {
      ficheiros.forEach((f) => {
        if (f.resultado) {
          const caminhoFicheiro = path.join(
            __dirname,
            "../../public/uploads/",
            f.resultado,
          );
          if (fs.existsSync(caminhoFicheiro)) {
            fs.unlinkSync(caminhoFicheiro);
          }
        }
      });
    }

    res.json({
      message: "Eliminado com sucesso!",
      quantidade: resultado.affectedRows,
    });
  } catch (error) {
    console.error("Erro ao eliminar:", error);
    res.status(500).json({ error: "Erro interno ao apagar da base de dados." });
  }
};

// --- GERAR TOKEN DE PARTILHA (Lógica Simplificada) ---
exports.gerarPartilha = async (req, res) => {
  // 1. Pegar os IDs que vêm do Frontend (repara que o nome deve coincidir: examesIds)
  const { examesIds } = req.body;
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ error: "Sessão expirada." });
  if (!examesIds || examesIds.length === 0)
    return res.status(400).json({ error: "Nenhum exame selecionado." });

  // 2. Gerar um Token seguro e único
  const token = crypto.randomBytes(16).toString("hex");

  // 3. Definir a validade (48 horas a partir de AGORA)
  const expiracao = new Date();
  expiracao.setHours(expiracao.getHours() + 48);

  try {
    // 4. GRAVAR NA BASE DE DADOS (O passo que faltava!)
    // Transformamos o array [1,2,3] numa string "1,2,3" para caber no campo TEXT
    await db.query(
      "INSERT INTO Partilha (token, exames_ids, data_expiracao, utilizador_id) VALUES (?, ?, ?, ?)",
      [token, examesIds.join(","), expiracao, userId],
    );

    // 5. Retornar o token real para o Frontend
    res.json({ token: token });
  } catch (error) {
    console.error("Erro ao gravar partilha:", error);
    res.status(500).json({ error: "Erro interno ao gerar link de partilha." });
  }
};

const crypto = require("crypto");

exports.visualizarPartilha = async (req, res) => {
  const { token } = req.params;

  try {
    // 1. Procurar o token e verificar se ainda é válido
    const [rows] = await db.query(
      "SELECT * FROM Partilha WHERE token = ? AND data_expiracao > NOW()",
      [token],
    );

    if (rows.length === 0) {
      return res.status(404).send(`
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc3545;">Link Expirado ou Inválido</h1>
          <p>Este link de partilha já não está ativo por motivos de segurança.</p>
          <a href="/" style="color: #0d6efd;">Voltar à página inicial</a>
        </body>
      `);
    }

    // 2. Extrair IDs e procurar os exames correspondentes
    const ids = rows[0].exames_ids.split(",");
    const [exames] = await db.query(
      `SELECT TE.nome, E.data_exame, E.observacoes, ETE.resultado 
       FROM Exame E
       JOIN Exame_TipoExame ETE ON E.id = ETE.id_exame
       JOIN Tipo_Exame TE ON ETE.id_tipo_exame = TE.id
       WHERE E.id IN (?)`,
      [ids],
    );

    // 3. Gerar a lista de exames em HTML
    const listaHTML = exames
      .map((ex) => {
        const dataFormatada = ex.data_exame
          ? new Date(ex.data_exame).toLocaleDateString("pt-PT")
          : "---";

        return `
        <div style="border: 1px solid #eee; padding: 20px; margin-bottom: 15px; border-radius: 15px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
             <div>
                <strong style="display: block; color: #333; font-size: 1.1rem; margin-bottom: 4px;">${ex.nome}</strong>
                <small style="color: #888; font-weight: 500;">Data: ${dataFormatada}</small>
             </div>
             ${
               ex.resultado
                 ? `<a href="/uploads/${ex.resultado}" target="_blank" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.85rem; box-shadow: 0 4px 6px rgba(220, 53, 69, 0.2);">Ver PDF</a>`
                 : '<span style="color: #ccc; font-size: 0.8rem;">Sem PDF</span>'
             }
          </div>
        
          ${
            ex.observacoes
              ? `
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #eee; color: #555; font-size: 0.9rem; line-height: 1.4;">
                  <strong style="color: #444;">Observações:</strong> ${ex.observacoes}
              </div>
          `
              : ""
          }
        </div>`;
      })
      .join("");

    // 4. Enviar a página completa
    res.send(`
        <!DOCTYPE html>
        <html lang="pt">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SaúdeDigital | Consulta Clínica</title>
        </head>
        <body style="font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f7f6; padding: 20px; margin: 0; color: #333;">
            <div style="max-width: 650px; margin: 40px auto; background: white; padding: 40px; border-radius: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 35px;">
                    <h2 style="color: #0d6efd; margin-bottom: 5px; font-weight: 800; letter-spacing: -0.5px;">SaúdeDigital</h2>
                    <p style="color: #777; margin: 0; font-size: 0.95rem;">Portal de Partilha Clínica</p>
                </div>
                
                <div style="background: #e7f0ff; color: #0046af; padding: 18px; border-radius: 12px; font-size: 0.85rem; margin-bottom: 30px; line-height: 1.5; border-left: 4px solid #0d6efd;">
                    <strong>Nota ao Profissional:</strong> Estes documentos foram partilhados pelo paciente para fins de consulta imediata. Este link é temporário (48h) e seguro.
                </div>
                
                <div style="margin-bottom: 20px;">
                    ${listaHTML}
                </div>
                
                <div style="text-align: center; margin-top: 40px; padding-top: 25px; border-top: 1px solid #f0f0f0;">
                    <p style="color: #bbb; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">
                        Segurança SaúdeDigital &copy; 2026<br>Acesso via Token Encriptado
                    </p>
                </div>
            </div>
        </body>
        </html>
    `);
  } catch (error) {
    console.error("Erro na visualização:", error);
    res.status(500).send("Erro ao carregar os exames.");
  }
};

exports.visualizarPartilha = async (req, res) => {
  const { token } = req.params;

  try {
    // 1. Procurar o token e verificar se ainda é válido (data_expiracao > agora)
    const [rows] = await db.query(
      "SELECT * FROM Partilha WHERE token = ? AND data_expiracao > NOW()",
      [token],
    );

    if (rows.length === 0) {
      return res.status(404).send(`
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc3545;">Link Expirado ou Inválido</h1>
          <p>Este link de partilha já não está ativo por motivos de segurança.</p>
          <a href="/" style="color: #0d6efd;">Voltar à página inicial</a>
        </body>
      `);
    }

    // 2. Extrair IDs e procurar os exames correspondentes
    const ids = rows[0].exames_ids.split(",");
    const [exames] = await db.query(
      `SELECT TE.nome, E.data_exame, E.observacoes, ETE.resultado 
   FROM Exame E
   JOIN Exame_TipoExame ETE ON E.id = ETE.id_exame
   JOIN Tipo_Exame TE ON ETE.id_tipo_exame = TE.id
   WHERE E.id IN (?)`,
      [ids],
    );

    // 3. Gerar a lista de exames em HTML
    const listaHTML = exames
      .map((ex) => {
        // Correção da data para evitar problemas de fuso horário
        const dataFormatada = ex.data_exame
          ? new Date(ex.data_exame)
              .toISOString()
              .split("T")[0]
              .split("-")
              .reverse()
              .join("/")
          : "---";

        return `
        <div style="border: 1px solid #eee; padding: 15px; margin-bottom: 15px; border-radius: 12px; background: #fff;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
             <div>
                <strong style="display: block; color: #333; font-size: 1.1rem;">${ex.nome}</strong>
                <small style="color: #666;">Data: ${new Date(ex.data_exame).toLocaleDateString("pt-PT")}</small>
             </div>
            ${ex.resultado ? `<a href="/uploads/${ex.resultado}" ...>Ver PDF</a>` : ""}
          </div>
        
          ${
            ex.observacoes
              ? `
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd; color: #555; font-size: 0.9rem;">
                  <strong>Observações:</strong> ${ex.observacoes}
              </div>
        `
              : ""
          }
        </div>
  `;
      })
      .join("");

    // 4. Enviar a página completa
    res.send(`
        <!DOCTYPE html>
        <html lang="pt">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SaúdeDigital | Consulta de Exames</title>
        </head>
        <body style="font-family: -apple-system, system-ui, sans-serif; background: #f0f2f5; padding: 20px; margin: 0;">
            <div style="max-width: 600px; margin: 40px auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #0d6efd; margin-bottom: 5px;">SaúdeDigital</h2>
                    <p style="color: #666; margin: 0;">Portal de Partilha Clínica</p>
                </div>
                
                <p style="color: #444; line-height: 1.5; background: #e7f0ff; padding: 15px; border-radius: 10px; font-size: 0.9rem;">
                    <strong>Nota ao Profissional:</strong> Estes documentos foram partilhados pelo paciente para fins de consulta imediata. Este link é temporário.
                </p>
                
                <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
                
                <div style="margin-bottom: 20px;">
                    ${listaHTML}
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
                        Segurança SaúdeDigital &copy; 2026<br>Link expira automaticamente
                    </p>
                </div>
            </div>
        </body>
        </html>
    `);
  } catch (error) {
    console.error("Erro na visualização:", error);
    res
      .status(500)
      .send(
        "Ocorreu um erro ao carregar os exames. Tente novamente mais tarde.",
      );
  }
};

exports.editarExame = async (req, res) => {
  const { id } = req.params;
  const { data_exame, observacoes } = req.body;
  const utilizadorId = req.session.userId;

  try {
    await db.query(
      "UPDATE Exame SET data_exame = ?, observacoes = ? WHERE id = ? AND utilizador_id = ?",
      [data_exame, observacoes, id, utilizadorId],
    );
    res.json({ message: "Exame atualizado com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar exame." });
  }
};
