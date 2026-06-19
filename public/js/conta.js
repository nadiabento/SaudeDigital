document.addEventListener("DOMContentLoaded", () => {
  carregarDadosPerfil();

  // Descarregar dados estruturais atualizados do servidor
  carregarArraysModicacao();

  // --- NOVA INTERCEÇÃO: Ouvir a submissão do formulário de perfil ---
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

let listaMedicos = [];
let listaUnidades = [];
let listaMedicamentos = [];
let listaEfeitos = [];
let listaCategorias = [];
let listaTipos = [];

const idsSelecionados = {
  medico: null,
  unidade: null,
  medicamento: null,
  efeito: null,
  categoria: null,
  tipo: null,
};

// --- 1. CHAMADAS ATUALIZADAS E SINCRONIZADAS ---
async function carregarArraysModicacao() {
  try {
    const resMed = await fetch("/api/consultas/medicos");
    if (resMed.ok) listaMedicos = await resMed.json();

    const resUni = await fetch("/api/consultas/unidades");
    if (resUni.ok) listaUnidades = await resUni.json();

    const resCatMed = await fetch("/api/medicacao/catalogo/todos");
    if (resCatMed.ok) listaMedicamentos = await resCatMed.json();

    const resEfe = await fetch("/api/medicacao/efeitos");
    if (resEfe.ok) listaEfeitos = await resEfe.json();

    const resCat = await fetch("/api/exames/categorias");
    if (resCat.ok) listaCategorias = await resCat.json();

    const resTip = await fetch("/api/exames/tipos-todos");
    if (resTip.ok) listaTipos = await resTip.json();

    configureFiltrosDinamicos();
  } catch (err) {
    console.error("Erro ao carregar dados de moderação no conta.js:", err);
  }
}

// --- 2. CONFIGURAÇÃO CIRÚRGICA DOS CAMPOS DA BD ---
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
      li.className = "list-group-item";
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
  const listas = document.querySelectorAll(".custom-autocomplete-list");
  listas.forEach((l) => (l.style.display = "none"));
}

// --- 3. EXECUÇÃO DE DELETES SEGUROS ---
async function processarRemocaoPorId(chaveId, urlBase, nomeEntidade) {
  const id = idsSelecionados[chaveId];
  if (!id) {
    return Swal.fire({
      title: "Seleção em falta",
      text: `Por favor, escreva e selecione um(a) ${nomeEntidade} válido(a) da lista antes de tentar apagar.`,
      icon: "warning",
      confirmButtonColor: "#0d6efd",
    });
  }

  Swal.fire({
    title: `Tem a certeza?`,
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
            title: "Alterações Guardadas!",
            text: "Os teus dados pessoais foram atualizados com sucesso.",
            icon: "success",
            confirmButtonColor: "#0d6efd",
            timer: 2000,
            showConfirmButton: false,
          }).then(() => {
            carregarDadosPerfil();
          });
        } else {
          const textoErro = await response.text();
          let mensagem = "Não foi possível remover este registo.";
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
          text: "Não foi possível comunicar com o servidor da UA.",
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

// --- 4. PERFIL (CARREGAR E ATUALIZAR DADOS) ---
async function carregarDadosPerfil() {
  try {
    const response = await fetch("/api/auth/meu-perfil");
    if (response.ok) {
      const user = await response.json();
      document.getElementById("inputAtualizarNome").value = user.nome || "";
      document.getElementById("inputEmailBloqueado").value = user.email || "";
      document.getElementById("selectGrupoSanguineo").value =
        user.grupo_sanguineo || "";
      document.getElementById("inputPeso").value = user.peso || "";
      if (user.data_nascimento) {
        document.getElementById("inputDataNascimento").value =
          user.data_nascimento.split("T")[0];
      }
    }
  } catch (e) {
    console.error("Erro ao carregar perfil:", e);
  }
}

// --- NOVA FUNÇÃO: Enviar os dados modificados para o Sequelize/MySQL ---
async function atualizarDadosPerfil(e) {
  e.preventDefault(); // Impede o recarregamento automático da página ao submeter

  // Capturar os valores atuais dos campos da interface
  const nome = document.getElementById("inputAtualizarNome").value.trim();
  const data_nascimento = document.getElementById("inputDataNascimento").value;
  const grupo_sanguineo = document.getElementById("selectGrupoSanguineo").value;
  const peso = document.getElementById("inputPeso").value;

  try {
    // Carregamento visual de espera profissional
    Swal.fire({
      title: "A guardar...",
      text: "A atualizar os seus indicadores clínicos de forma segura.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    // Enviar via PUT para o backend (ajusta a rota se no teu backend for diferente, ex: /api/auth/perfil)
    const response = await fetch("api/auth/atualizar-perfil", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome,
        data_nascimento,
        grupo_sanguineo,
        peso: peso ? parseFloat(peso) : null,
      }),
    });

    if (response.ok) {
      Swal.fire({
        title: "Alterações Guardadas!",
        text: "Os teus dados pessoais foram atualizados com sucesso.",
        icon: "success",
        confirmButtonColor: "#0d6efd",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        // Atualiza a visualização local para sincronizar
        carregarDadosPerfil();
      });
    } else {
      const erroTexto = await response.text();
      Swal.fire({
        title: "Erro ao Guardar",
        text: erroTexto || "Não foi possível processar a alteração.",
        icon: "error",
        confirmButtonColor: "#dc3545",
      });
    }
  } catch (error) {
    console.error("Erro na atualização do perfil:", error);
    Swal.fire({
      title: "Erro de Conexão",
      text: "Problema ao contactar o servidor.",
      icon: "error",
      confirmButtonColor: "#dc3545",
    });
  }
}

// --- 5. ELIMINAÇÃO TOTAL DA CONTA (ZONA CRÍTICA) ---
function confirmarEliminarConta() {
  Swal.fire({
    title: "Tem a certeza absoluta?",
    text: "Esta ação é irreversível! Todos os teus exames, consultas, medicações e histórico clínico no SaúdeDigital serão destruídos permanentemente.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc3545", // Vermelho de aviso
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sim, apagar tudo!",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        // Bloqueio visual de segurança enquanto apaga na BD
        Swal.fire({
          title: "A processar...",
          text: "A remover o seu perfil e dados clínicos dos servidores de forma segura.",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        // Faz o pedido de DELETE para a API de autenticação do teu backend
        const response = await fetch("/api/auth/eliminar-conta", {
          method: "DELETE",
        });

        if (response.ok) {
          Swal.fire({
            title: "Conta Eliminada",
            text: "Os seus dados foram removidos com sucesso. Esperamos ver-te de volta!",
            icon: "success",
            confirmButtonColor: "#0d6efd",
          }).then(() => {
            // Redireciona o utilizador para a página inicial de login
            window.location.href = "index.html";
          });
        } else {
          const textoErro = await response.text();
          Swal.fire({
            title: "Erro na Operação",
            text:
              textoErro ||
              "Não foi possível eliminar a sua conta neste momento.",
            icon: "error",
            confirmButtonColor: "#dc3545",
          });
        }
      } catch (error) {
        console.error("Erro ao eliminar conta:", error);
        Swal.fire({
          title: "Erro de Conexão",
          text: "Não foi possível comunicar com o servidor da UA.",
          icon: "error",
          confirmButtonColor: "#dc3545",
        });
      }
    }
  });
}
