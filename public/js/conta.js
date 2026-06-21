document.addEventListener("DOMContentLoaded", () => {
  carregarDadosPerfil();
  carregarArraysModicacao();

  const formPerfil = document.getElementById("formAtualizarPerfil");
  if (formPerfil) {
    formPerfil.addEventListener("submit", atualizarDadosPerfil);
  }

  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest(".position-relative")) {
      esconderTodasAsListas();
    }
  });
});

// Instâncias Globais de Memória Otimizada
let listaMedicos = [];
let listaUnidades = [];
let listaMedicamentos = [];
let listaEfeitos = [];
let listaCategorias = [];
let listaTipos = [];

// Tabelas Hash para pesquisa de duplicados em tempo constante O(1)
let medicosSet = new Set();
let categoriasSet = new Set();
let tiposSet = new Set();

const idsSelecionados = {
  medico: null,
  unidade: null,
  medicamento: null,
  efeito: null,
  categoria: null,
  tipo: null,
};

// --- 1. CHAMADAS ATUALIZADAS, ASSÍNCRONAS E SINCRONIZADAS ---
async function carregarArraysModicacao() {
  try {
    const [resMed, resCat, resTip] = await Promise.all([
      fetch("/api/consultas/medicos"),
      fetch("/api/exames/categorias"),
      fetch("/api/exames/tipos-todos"), // Rota agnóstica corrigida
    ]);

    if (!resMed.ok || !resCat.ok || !resTip.ok) {
      throw new Error(
        "Falha na resposta HTTP de rede ao sincronizar catálogos.",
      );
    }

    listaMedicos = await resMed.json();
    listaCategorias = await resCat.json();
    listaTipos = await resTip.json();

    // Mutação estrutural estável O(1)
    medicosSet = new Set(listaMedicos.map((m) => m.nome.toLowerCase().trim()));
    categoriasSet = new Set(
      listaCategorias.map((c) => c.nome.toLowerCase().trim()),
    );
    tiposSet = new Set(listaTipos.map((t) => t.nome.toLowerCase().trim()));

    // Inicializa os filtros dinâmicos na interface do utilizador
    configureFiltrosDinamicos();
  } catch (error) {
    console.error("Erro de I/O detetado:", error);
    Swal.fire({
      icon: "error",
      title: "Erro de Sincronização",
      text: "Não foi possível carregar os catálogos estruturais do servidor.",
      confirmButtonColor: "#0d6efd",
    });
  }
}

function validarNovaCategoria(nomeCategoria) {
  const limpo = nomeCategoria.toLowerCase().trim();
  if (categoriasSet.has(limpo)) {
    Swal.fire({
      icon: "warning",
      title: "Registo Duplicado",
      text: "Esta categoria já se encontra ativa no seu perfil clínico.",
      confirmButtonColor: "#dc3545",
    });
    return false;
  }
  return true;
}

// --- 2. CONFIGURAÇÃO DOS CAMPOS DE AUTOCOMPLETE ---
function configureFiltrosDinamicos() {
  setupFiltroUnico(
    "inputBuscarMedico",
    "sugestoesMedico",
    listaMedicos,
    "nome",
    "medico",
  );
  setupFiltroUnico(
    "inputBuscarUnidade",
    "sugestoesUnidade",
    listaUnidades,
    "nome",
    "unidade",
  );
  setupFiltroUnico(
    "inputBuscarMedicamento",
    "sugestoesMedicamento",
    listaMedicamentos,
    "nome_medicamento",
    "medicamento",
  );
  setupFiltroUnico(
    "inputBuscarEfeito",
    "sugestoesEfeito",
    listaEfeitos,
    "sintoma",
    "efeito",
  );
  setupFiltroUnico(
    "inputBuscarCategoria",
    "sugestoesCategoria",
    listaCategorias,
    "nome",
    "categoria",
  );
  setupFiltroUnico(
    "inputBuscarTipo",
    "sugestoesTipo",
    listaTipos,
    "nome",
    "tipo",
  );
}

function setupFiltroUnico(inputId, listaUlId, dadosArray, campoBusca, chaveId) {
  const input = document.getElementById(inputId);
  const ul = document.getElementById(listaUlId);

  if (!input || !ul) return;

  input.addEventListener("input", () => {
    const termo = input.value.trim().toLowerCase();
    ul.innerHTML = "";
    idsSelecionados[chaveId] = null;

    if (!termo) {
      ul.style.setProperty("display", "none", "important");
      return;
    }

    const filtrados = dadosArray.filter((item) =>
      String(item[campoBusca]).toLowerCase().includes(termo),
    );

    if (filtrados.length === 0) {
      ul.style.setProperty("display", "none", "important");
      return;
    }

    filtrados.forEach((item) => {
      const li = document.createElement("li");
      li.className = "list-group-item list-group-item-action";
      li.innerText = item[campoBusca];

      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();

        input.value = item[campoBusca];
        idsSelecionados[chaveId] =
          item.id || item.id_unidade || item.id_categoria;
        ul.style.setProperty("display", "none", "important");
      });

      ul.appendChild(li);
    });

    ul.style.setProperty("display", "block", "important");
  });
}

function esconderTodasAsListas() {
  document.querySelectorAll(".custom-autocomplete-list").forEach((l) => {
    l.style.display = "none";
  });
}

// --- 3. OPERAÇÕES DE ELIMINAÇÃO PROTEGIDA (DELETE) ---
async function processarRemocaoPorId(chaveId, urlBase, nomeEntidade) {
  const id = idsSelecionados[chaveId];
  if (!id) {
    return Swal.fire({
      title: "Seleção em falta",
      text: `Por favor, escreva e selecione um(a) ${nomeEntidade} válido(a) da lista antes de tentar remover.`,
      icon: "warning",
      confirmButtonColor: "#0d6efd",
    });
  }

  Swal.fire({
    title: "Tem a certeza?",
    text: `Esta ação vai eliminar permanentemente este registo de ${nomeEntidade}!`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, eliminar!",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${urlBase}/${id}`, { method: "DELETE" });

        if (response.ok) {
          Swal.fire({
            title: "Removido!",
            text: `O registo de ${nomeEntidade} foi excluído com sucesso.`,
            icon: "success",
            confirmButtonColor: "#0d6efd",
          }).then(() => {
            location.reload();
          });
        } else {
          const textoErro = await response.text();
          let mensagem =
            "Não foi possível remover este registo devido a dependências ativas.";
          try {
            const jsonErro = JSON.parse(textoErro);
            mensagem = jsonErro.error || jsonErro.erro || mensagem;
          } catch (e) {
            mensagem = textoErro || mensagem;
          }
          Swal.fire({
            title: "Aviso de Segurança",
            text: mensagem,
            icon: "error",
            confirmButtonColor: "#dc3545",
          });
        }
      } catch (error) {
        console.error("Erro na requisição:", error);
        Swal.fire({
          title: "Erro de Ligação",
          text: "Não foi possível comunicar com o servidor clínico.",
          icon: "error",
          confirmButtonColor: "#dc3545",
        });
      }
    }
  });
}

function eliminarMedicoGlobal() {
  processarRemocaoPorId("medico", "/api/consultas/medicos", "Médico");
}
function eliminarUnidadeGlobal() {
  processarRemocaoPorId(
    "unidade",
    "/api/consultas/unidades",
    "Unidade de Saúde",
  );
}
function eliminarMedicamentoCatalogoGlobal() {
  processarRemocaoPorId(
    "medicamento",
    "/api/medicacao/catalogo",
    "Medicamento",
  );
}
function eliminarEfeitoSecundarioGlobal() {
  processarRemocaoPorId(
    "efeito",
    "/api/medicacao/efeitos",
    "Efeito Secundário",
  );
}
function eliminarCategoriaExameGlobal() {
  processarRemocaoPorId(
    "categoria",
    "/api/exames/categorias",
    "Categoria de Exame",
  );
}
function eliminarTipoExameGlobal() {
  processarRemocaoPorId("tipo", "/api/exames/tipos", "Tipo de Exame");
}

// --- 4. PERFIL (LEITURA E ESCRITA) ---
async function carregarDadosPerfil() {
  try {
    const response = await fetch("/api/auth/meu-perfil");
    if (response.ok) {
      const user = await response.json();
      const inputNome = document.getElementById("inputNomeCompleto");
      const inputEmail = document.getElementById("inputEmailBloqueado");
      const inputData = document.getElementById("inputDataNascimento");
      const inputGrupo = document.getElementById("selectGrupoSanguineo");
      const inputPeso = document.getElementById("inputPeso");

      if (inputNome) inputNome.value = user.nome || "";
      if (inputEmail) inputEmail.value = user.email || "";
      if (inputData && user.data_nascimento) {
        inputData.value = user.data_nascimento.split("T")[0];
      }
      if (inputGrupo) inputGrupo.value = user.grupo_sanguineo || "";
      if (inputPeso) inputPeso.value = user.peso || "";
    }
  } catch (e) {
    console.error("Erro ao carregar perfil:", e);
  }
}

async function atualizarDadosPerfil(e) {
  e.preventDefault();

  //Captura explícita dos elementos do DOM para evitar inconsistência de chaves vazias
  const inputNome = document.getElementById("inputNomeCompleto")?.value || "";
  const inputData = document.getElementById("inputDataNascimento")?.value || "";
  const inputGrupo =
    document.getElementById("selectGrupoSanguineo")?.value || "";
  const inputPeso = document.getElementById("inputPeso")?.value || "";

  // Construção estruturada do payload correspondente com o req.body do Controller
  const dadosPerfil = {
    nome: inputNome.trim(),
    data_nascimento: inputData.trim(),
    grupo_sanguineo: inputGrupo.trim(),
    peso: inputPeso.trim(), // O backend vai validar se vem vazio '' e converter para NULL
  };

  Swal.fire({
    title: "A guardar alterações...",
    text: "A atualizar os seus parâmetros biológicos.",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const response = await fetch("/api/auth/atualizar-perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosPerfil),
    });

    const textoResposta = await response.text();
    let dadosJson = {};
    try {
      dadosJson = JSON.parse(textoResposta);
    } catch (err) {
      dadosJson = { error: textoResposta };
    }

    if (!response.ok) {
      throw new Error(
        dadosJson.error || dadosJson.message || "Erro ao guardar alterações.",
      );
    }

    Swal.fire({
      icon: "success",
      title: "Alterações Guardadas",
      text: "O seu perfil clínico foi atualizado com sucesso.",
      confirmButtonColor: "#0d6efd",
    }).then(() => {
      location.reload();
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Falha na Gravação",
      text: error.message,
      confirmButtonColor: "#dc3545",
    });
  }
}
// --- 5. ZONA CRÍTICA: ELIMINAÇÃO DE CONTA ---
function confirmarEliminarConta() {
  Swal.fire({
    title: "Tem a certeza absoluta?",
    text: "Esta ação é irreversível! Todos os teus exames, consultas, medicações e histórico clínico no SaúdeDigital serão destruídos permanentemente.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, apagar tudo!",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: "A processar...",
          text: "A remover o seu perfil e dados clínicos dos servidores de forma segura.",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        const response = await fetch("/api/auth/eliminar-conta", {
          method: "DELETE",
        });

        if (response.ok) {
          Swal.fire({
            title: "Conta Eliminada",
            text: "Os seus dados foram removidos com sucesso.",
            icon: "success",
            confirmButtonColor: "#0d6efd",
          }).then(() => {
            globalThis.location.href = "index.html";
          });
        } else {
          const textoErro = await response.text();
          throw new Error(
            textoErro || "Não foi possível eliminar a sua conta neste momento.",
          );
        }
      } catch (error) {
        Swal.fire({
          title: "Erro na Operação",
          text: error.message,
          icon: "error",
          confirmButtonColor: "#dc3545",
        });
      }
    }
  });
}
